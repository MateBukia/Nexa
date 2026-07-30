import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  GroundedProduct,
  ShoppingFilters,
  ShoppingRecommendation,
} from './ai.types';
import { ShopAssistantDto } from './dto/shop-assistant.dto';
import { AI_PROVIDER, AiProvider } from './ai-provider';

@Injectable()
export class ShoppingAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async chat(userId: string | null, dto: ShopAssistantDto) {
    try {
      return await this.chatWithProvider(userId, dto);
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) throw error;

      return this.fallbackResponse(
        'I could not complete the intelligent catalogue search right now. You can still browse the catalogue, or try again with a category, budget, colour, size, or brand.',
      );
    }
  }

  private async chatWithProvider(userId: string | null, dto: ShopAssistantDto) {
    const session = await this.getSession(userId, dto.sessionId);
    const previousMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { senderType: true, content: true },
    });
    const history = previousMessages.reverse().map((message) => ({
      role: message.senderType === 'CUSTOMER' ? 'user' : 'assistant',
      content: message.content,
    }));

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'CUSTOMER',
        content: dto.message,
      },
    });

    const safetyIdentifier = createHash('sha256')
      .update(`nexa:${userId ?? `anonymous:${session.id}`}`)
      .digest('hex');
    const extracted = await this.ai.extractShoppingFilters(
      dto.message,
      history,
      safetyIdentifier,
    );
    const filters = this.normalizeFilters(extracted);
    const catalogProducts = await this.searchCatalog(filters);
    const groundedProducts = catalogProducts.map((product) =>
      this.toGroundedProduct(product),
    );
    const generated = await this.ai.composeShoppingAnswer(
      dto.message,
      history,
      filters,
      groundedProducts,
      safetyIdentifier,
    );

    const productById = new Map(
      catalogProducts.map((product) => [product.id, product]),
    );
    const seenProductIds = new Set<string>();
    const groundedRecommendations = generated.recommendations
      .filter(({ productId }) => {
        if (!productById.has(productId) || seenProductIds.has(productId)) {
          return false;
        }
        seenProductIds.add(productId);
        return true;
      })
      .slice(0, 5);
    const recommendations: ShoppingRecommendation[] =
      groundedRecommendations.map(({ productId, reason }) => {
        const product = productById.get(productId)!;
        return {
          productId,
          slug: product.slug,
          name: product.name,
          price: product.variants[0].price.toString(),
          ...(product.images[0]?.url
            ? { imageUrl: product.images[0].url }
            : {}),
          url: `/products/${product.slug}`,
          reason,
        };
      });
    const recommendedIds = recommendations.map(({ productId }) => productId);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'AI_ASSISTANT',
          content: generated.answer,
          metadata: {
            model: this.ai.model,
            filters: this.filtersJson(filters),
            recommendedProductIds: recommendedIds,
          },
        },
      });
      await transaction.chatSession.update({
        where: { id: session.id },
        data: {
          title: session.title ?? dto.message.slice(0, 80),
          updatedAt: new Date(),
        },
      });
      if (recommendedIds.length) {
        await transaction.aiRecommendationEvent.createMany({
          data: recommendedIds.map((productId, index) => ({
            sessionId: session.id,
            productId,
            eventType: 'recommended',
            query: dto.message,
            score: 1 - index * 0.1,
            metadata: {
              filters: this.filtersJson(filters),
              model: this.ai.model,
            },
          })),
        });
      }
    });

    const noMatches =
      catalogProducts.length === 0 && filters.intent !== 'STORE_INFORMATION';
    const message = generated.answer.trim()
      ? generated.answer
      : noMatches
        ? this.noMatchMessage(filters)
        : 'I could not prepare an answer. Please try a more specific shopping question.';

    return {
      sessionId: session.id,
      message,
      requiresClarification: generated.clarificationNeeded,
      filters,
      recommendations,
    };
  }

  private fallbackResponse(message: string) {
    return {
      sessionId: null,
      message,
      requiresClarification: true,
      filters: {
        intent: 'PRODUCT_SEARCH' as const,
        keywords: [],
        category: null,
        minPrice: null,
        maxPrice: null,
        color: null,
        size: null,
        brand: null,
      },
      recommendations: [] as ShoppingRecommendation[],
    };
  }

  private noMatchMessage(filters: ShoppingFilters) {
    const activeFilters = [
      filters.category,
      filters.brand,
      filters.color,
      filters.size,
      filters.minPrice !== null ? `minimum ${filters.minPrice} GEL` : null,
      filters.maxPrice !== null ? `maximum ${filters.maxPrice} GEL` : null,
    ].filter(Boolean);
    const filterSummary = activeFilters.length
      ? ` for ${activeFilters.join(', ')}`
      : '';
    return `I couldn't find an available product${filterSummary}. Try removing one filter, increasing the budget, or choosing a nearby category.`;
  }

  private async getSession(userId: string | null, sessionId?: string) {
    if (!sessionId) {
      return this.prisma.chatSession.create({
        data: { userId, type: 'SHOPPING' },
      });
    }
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.type !== 'SHOPPING') {
      throw new NotFoundException('Shopping conversation not found.');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException(
        'This conversation belongs to another user.',
      );
    }
    return session;
  }

  private async searchCatalog(filters: ShoppingFilters) {
    if (filters.intent === 'STORE_INFORMATION') return [];

    const terms = filters.keywords
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    const variantAttributeFilters: Prisma.ProductVariantWhereInput[] = [];
    if (filters.color) {
      variantAttributeFilters.push({
        OR: this.textVariants(filters.color).map((color) => ({
          attributes: { path: ['color'], string_contains: color },
        })),
      });
    }
    if (filters.size) {
      variantAttributeFilters.push({
        OR: [
          { name: { contains: filters.size, mode: 'insensitive' } },
          ...this.textVariants(filters.size).map((size) => ({
            attributes: { path: ['size'], string_contains: size },
          })),
        ],
      });
    }
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      category: {
        isActive: true,
        ...(filters.category
          ? {
              OR: [
                { name: { contains: filters.category, mode: 'insensitive' } },
                { slug: { contains: filters.category, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      ...(filters.brand
        ? { brand: { contains: filters.brand, mode: 'insensitive' } }
        : {}),
      ...(terms.length
        ? {
            OR: [
              ...terms.map((term) => ({
                name: { contains: term, mode: 'insensitive' as const },
              })),
              ...terms.map((term) => ({
                description: { contains: term, mode: 'insensitive' as const },
              })),
              ...terms.map((term) => ({
                brand: { contains: term, mode: 'insensitive' as const },
              })),
              { tags: { hasSome: terms } },
            ],
          }
        : {}),
      variants: {
        some: {
          isActive: true,
          inventory: { quantity: { gt: 0 } },
          ...(variantAttributeFilters.length
            ? { AND: variantAttributeFilters }
            : {}),
          price: {
            ...(filters.minPrice !== null ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice !== null ? { lte: filters.maxPrice } : {}),
          },
        },
      },
    };

    const candidates = await this.prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          include: { inventory: true },
        },
      },
    });

    return candidates
      .map((product) => ({
        ...product,
        variants: product.variants.filter((variant) =>
          this.variantMatches(variant, filters),
        ),
      }))
      .filter((product) => product.variants.length > 0)
      .slice(0, 12);
  }

  private toGroundedProduct(
    product: Awaited<ReturnType<typeof this.searchCatalog>>[number],
  ): GroundedProduct {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.shortDescription ?? product.description,
      category: product.category.name,
      brand: product.brand,
      tags: product.tags,
      attributes: product.attributes,
      price: Number(product.variants[0]?.price ?? 0),
      availableQuantity: product.variants.reduce(
        (sum, variant) =>
          sum +
          Math.max(
            0,
            (variant.inventory?.quantity ?? 0) -
              (variant.inventory?.reservedQuantity ?? 0),
          ),
        0,
      ),
    };
  }

  private normalizeFilters(filters: ShoppingFilters): ShoppingFilters {
    const minPrice =
      filters.minPrice !== null ? Math.max(0, filters.minPrice) : null;
    const maxPrice =
      filters.maxPrice !== null ? Math.max(0, filters.maxPrice) : null;
    return {
      ...filters,
      keywords: filters.keywords.slice(0, 8),
      minPrice:
        minPrice !== null && maxPrice !== null && minPrice > maxPrice
          ? maxPrice
          : minPrice,
      maxPrice:
        minPrice !== null && maxPrice !== null && minPrice > maxPrice
          ? minPrice
          : maxPrice,
    };
  }

  private filtersJson(filters: ShoppingFilters): Prisma.InputJsonObject {
    return {
      intent: filters.intent,
      keywords: filters.keywords,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      color: filters.color,
      size: filters.size,
      brand: filters.brand,
    };
  }

  private variantMatches(
    variant: {
      price: unknown;
      attributes: unknown;
      inventory: { quantity: number; reservedQuantity: number } | null;
    },
    filters: ShoppingFilters,
  ) {
    const available = variant.inventory
      ? variant.inventory.quantity - variant.inventory.reservedQuantity
      : 0;
    const price = Number(variant.price);
    const attributes = this.attributes(variant.attributes);

    return (
      available > 0 &&
      (filters.minPrice === null || price >= filters.minPrice) &&
      (filters.maxPrice === null || price <= filters.maxPrice) &&
      this.attributeMatches(attributes.color, filters.color) &&
      this.sizeMatches(attributes.size, filters.size)
    );
  }

  private attributes(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private attributeMatches(value: unknown, filter: string | null) {
    return (
      filter === null ||
      (typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase()))
    );
  }

  private sizeMatches(value: unknown, filter: string | null) {
    if (filter === null) return true;
    if (typeof value !== 'string') return false;

    const normalizedValue = value.toLowerCase();
    const normalizedFilter = filter.toLowerCase();
    return (
      normalizedValue.includes(normalizedFilter) ||
      normalizedFilter.includes(normalizedValue)
    );
  }

  private textVariants(value: string) {
    const lower = value.toLowerCase();
    return [
      ...new Set([value, lower, lower.replace(/^./, (c) => c.toUpperCase())]),
    ];
  }
}
