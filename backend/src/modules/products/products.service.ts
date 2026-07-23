import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

const catalogInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: {
    where: { isActive: true },
    orderBy: { price: 'asc' as const },
    include: { inventory: true },
  },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, includeInactive = false) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'minPrice cannot be greater than maxPrice.',
      );
    }

    const where: Prisma.ProductWhereInput = {
      ...(includeInactive ? {} : { status: 'ACTIVE' }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { tags: { has: query.search.toLowerCase() } },
            ],
          }
        : {}),
      ...(query.category
        ? { category: { slug: query.category, isActive: true } }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            variants: {
              some: {
                isActive: true,
                price: {
                  ...(query.minPrice !== undefined
                    ? { gte: query.minPrice }
                    : {}),
                  ...(query.maxPrice !== undefined
                    ? { lte: query.maxPrice }
                    : {}),
                },
              },
            },
          }
        : {}),
    };

    const isPriceSort =
      query.sort === 'price_asc' || query.sort === 'price_desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'name_asc'
        ? { name: 'asc' }
        : query.sort === 'name_desc'
          ? { name: 'desc' }
          : { createdAt: 'desc' };

    if (isPriceSort) {
      const products = await this.prisma.product.findMany({
        where,
        include: catalogInclude,
      });
      products.sort((left, right) => {
        const leftPrice = Number(left.variants[0]?.price ?? 0);
        const rightPrice = Number(right.variants[0]?.price ?? 0);
        return query.sort === 'price_asc'
          ? leftPrice - rightPrice
          : rightPrice - leftPrice;
      });

      const start = (query.page - 1) * query.limit;
      return this.paginated(
        products.slice(start, start + query.limit),
        products.length,
        query,
      );
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: catalogInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.paginated(products, total, query);
  }

  async findOne(idOrSlug: string, includeInactive = false) {
    const product = await this.prisma.product.findFirst({
      where: {
        ...(isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }),
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      },
      include: {
        ...catalogInclude,
        reviews: {
          where: { isPublished: true },
          select: { rating: true },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found.');

    const { reviews, ...result } = product;
    const ratingCount = reviews.length;
    const averageRating = ratingCount
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
      : null;

    return {
      ...result,
      rating: { average: averageRating, count: ratingCount },
    };
  }

  async create(dto: CreateProductDto) {
    await this.assertCategory(dto.categoryId);
    await this.assertSlugAvailable(dto.slug);
    await this.assertSkusAvailable(dto.variants.map((variant) => variant.sku));
    dto.variants.forEach((variant) => this.validateVariant(variant));

    const { images, variants, attributes, ...product } = dto;
    return this.prisma.product.create({
      data: {
        ...product,
        attributes: this.json(attributes),
        images: images?.length ? { create: images } : undefined,
        variants: {
          create: variants.map(({ inventory, attributes, ...variant }) => ({
            ...variant,
            attributes: this.json(attributes),
            inventory: { create: inventory ?? {} },
          })),
        },
      },
      include: catalogInclude,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.assertExists(id);
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    if (dto.slug) await this.assertSlugAvailable(dto.slug, id);

    const { images, attributes, ...product } = dto;
    return this.prisma.$transaction(async (transaction) => {
      if (images) {
        await transaction.productImage.deleteMany({ where: { productId: id } });
        if (images.length) {
          await transaction.productImage.createMany({
            data: images.map((image) => ({ ...image, productId: id })),
          });
        }
      }

      return transaction.product.update({
        where: { id },
        data: {
          ...product,
          ...(attributes !== undefined
            ? { attributes: this.json(attributes) }
            : {}),
        },
        include: catalogInclude,
      });
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.productVariant.updateMany({
        where: { productId: id },
        data: { isActive: false },
      }),
    ]);
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.assertExists(productId);
    await this.assertSkusAvailable([dto.sku]);
    this.validateVariant(dto);
    const { inventory, attributes, ...variant } = dto;

    return this.prisma.productVariant.create({
      data: {
        ...variant,
        productId,
        attributes: this.json(attributes),
        inventory: { create: inventory ?? {} },
      },
      include: { inventory: true },
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const existing = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { inventory: true },
    });
    if (!existing) throw new NotFoundException('Product variant not found.');
    if (dto.sku) await this.assertSkusAvailable([dto.sku], variantId);
    this.validateVariant(dto, {
      price: Number(existing.price),
      compareAtPrice: existing.compareAtPrice
        ? Number(existing.compareAtPrice)
        : undefined,
      quantity: existing.inventory?.quantity ?? 0,
      reservedQuantity: existing.inventory?.reservedQuantity ?? 0,
    });

    const { inventory, attributes, ...variant } = dto;
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...variant,
        ...(attributes !== undefined
          ? { attributes: this.json(attributes) }
          : {}),
        ...(inventory
          ? {
              inventory: {
                upsert: { create: inventory, update: inventory },
              },
            }
          : {}),
      },
      include: { inventory: true },
    });
  }

  async removeVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Product variant not found.');

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  private paginated<T>(items: T[], total: number, query: ProductQueryDto) {
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  private async assertExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
  }

  private async assertCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!category?.isActive) {
      throw new BadRequestException('Select an active category.');
    }
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (product && product.id !== exceptId) {
      throw new ConflictException('Product slug is already in use.');
    }
  }

  private async assertSkusAvailable(skus: string[], exceptId?: string) {
    if (new Set(skus).size !== skus.length) {
      throw new ConflictException('Variant SKUs must be unique.');
    }
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        sku: { in: skus },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { sku: true },
    });
    if (variant)
      throw new ConflictException(`SKU ${variant.sku} is already in use.`);
  }

  private validateVariant(
    variant: Partial<CreateVariantDto>,
    current?: {
      price: number;
      compareAtPrice?: number;
      quantity: number;
      reservedQuantity: number;
    },
  ) {
    const price = variant.price ?? current?.price;
    const compareAtPrice = variant.compareAtPrice ?? current?.compareAtPrice;
    if (
      compareAtPrice !== undefined &&
      price !== undefined &&
      compareAtPrice < price
    ) {
      throw new BadRequestException(
        'compareAtPrice cannot be less than price.',
      );
    }
    const quantity = variant.inventory?.quantity ?? current?.quantity ?? 0;
    const reservedQuantity =
      variant.inventory?.reservedQuantity ?? current?.reservedQuantity ?? 0;
    if (reservedQuantity > quantity) {
      throw new BadRequestException(
        'Reserved inventory cannot exceed total inventory.',
      );
    }
  }

  private json(value?: Record<string, unknown>) {
    return value as Prisma.InputJsonValue | undefined;
  }
}
