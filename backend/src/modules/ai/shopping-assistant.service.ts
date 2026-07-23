import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GroundedProduct, ShoppingFilters } from './ai.types';
import { ShopAssistantDto } from './dto/shop-assistant.dto';
import { OpenAiService } from './openai.service';

@Injectable()
export class ShoppingAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenAiService,
  ) {}

  async chat(userId: string, dto: ShopAssistantDto) {
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
      .update(`nexa:${userId}`)
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
    const recommendedIds = [
      ...new Set(
        generated.recommendedProductIds.filter((id) => productById.has(id)),
      ),
    ].slice(0, 5);
    const recommendations = recommendedIds.map((id) => productById.get(id)!);

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

    return {
      sessionId: session.id,
      message: generated.answer,
      clarificationNeeded: generated.clarificationNeeded,
      filters,
      recommendations,
    };
  }

  private async getSession(userId: string, sessionId?: string) {
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
    const terms = [...filters.terms, ...filters.attributes]
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(filters.category
        ? {
            category: {
              isActive: true,
              OR: [
                { name: { contains: filters.category, mode: 'insensitive' } },
                { slug: { contains: filters.category, mode: 'insensitive' } },
              ],
            },
          }
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
          price: {
            ...(filters.minPrice !== null ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice !== null ? { lte: filters.maxPrice } : {}),
          },
        },
      },
    };

    return this.prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
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
      terms: filters.terms.slice(0, 8),
      attributes: filters.attributes.slice(0, 8),
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
      terms: filters.terms,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      attributes: filters.attributes,
    };
  }
}
