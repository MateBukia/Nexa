import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: {
              category: { select: { name: true, slug: true } },
              images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    });

    const items = cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      lineTotal: Number(item.variant.price) * item.quantity,
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        name: item.variant.name,
        price: item.variant.price,
        compareAtPrice: item.variant.compareAtPrice,
        attributes: item.variant.attributes,
        availableQuantity: Math.max(
          0,
          (item.variant.inventory?.quantity ?? 0) -
            (item.variant.inventory?.reservedQuantity ?? 0),
        ),
      },
      product: {
        id: item.variant.product.id,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        status: item.variant.product.status,
        category: item.variant.product.category,
        image: item.variant.product.images[0] ?? null,
      },
    }));

    return {
      id: cart.id,
      items,
      summary: {
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
        currency: 'GEL',
      },
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { inventory: true, product: { select: { status: true } } },
    });

    if (!variant || !variant.isActive || variant.product.status !== 'ACTIVE') {
      throw new NotFoundException('Product option is not available.');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
      },
      select: { quantity: true },
    });
    const nextQuantity = (existing?.quantity ?? 0) + dto.quantity;
    this.assertStock(variant.inventory, nextQuantity);

    await this.prisma.cartItem.upsert({
      where: {
        cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
      },
      update: { quantity: nextQuantity },
      create: {
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item) throw new NotFoundException('Cart item not found.');

    this.assertStock(item.variant.inventory, dto.quantity);
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const result = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cart: { userId } },
    });
    if (!result.count) throw new NotFoundException('Cart item not found.');
  }

  private assertStock(
    inventory: { quantity: number; reservedQuantity: number } | null,
    requestedQuantity: number,
  ) {
    const available = inventory
      ? inventory.quantity - inventory.reservedQuantity
      : 0;
    if (requestedQuantity > available) {
      throw new BadRequestException(
        `Only ${Math.max(0, available)} units are currently available.`,
      );
    }
  }
}
