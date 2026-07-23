import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CheckoutAddressDto } from './dto/address.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto, OrderStatusValue } from './dto/order-query.dto';

const orderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'desc' as const } },
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

const transitions: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.createInTransaction(userId, dto);
      } catch (error: unknown) {
        const retryable =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2034';
        if (!retryable || attempt === 3) throw error;
      }
    }
    throw new ConflictException('Could not reserve inventory. Please retry.');
  }

  async findMine(userId: string, query: OrderQueryDto) {
    return this.findMany({ userId, query });
  }

  async findAll(query: OrderQueryDto) {
    return this.findMany({ query });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        ...(user.roles.includes('admin') ? {} : { userId: user.id }),
      },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async updateStatus(id: string, nextStatus: OrderStatusValue) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!order) throw new NotFoundException('Order not found.');

    const currentStatus = order.status;
    if (currentStatus === nextStatus) return this.getById(id);
    if (!transitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Order cannot move from ${currentStatus} to ${nextStatus}.`,
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      if (nextStatus === 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await transaction.inventory.updateMany({
              where: { variantId: item.variantId },
              data: { quantity: { increment: item.quantity } },
            });
          }
        }
      }
      await transaction.order.update({
        where: { id },
        data: { status: nextStatus },
      });
    });

    return this.getById(id);
  }

  private async createInTransaction(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(
      async (transaction) => {
        const cart = await transaction.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                variant: {
                  include: { inventory: true, product: true },
                },
              },
            },
          },
        });

        if (!cart?.items.length) {
          throw new BadRequestException('Your cart is empty.');
        }

        let subtotal = 0;
        for (const item of cart.items) {
          const available = item.variant.inventory
            ? item.variant.inventory.quantity -
              item.variant.inventory.reservedQuantity
            : 0;
          if (
            !item.variant.isActive ||
            item.variant.product.status !== 'ACTIVE' ||
            available < item.quantity
          ) {
            throw new ConflictException(
              `${item.variant.product.name} (${item.variant.name}) no longer has enough stock.`,
            );
          }
          subtotal += Number(item.variant.price) * item.quantity;
        }

        for (const item of cart.items) {
          await transaction.inventory.update({
            where: { variantId: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        const order = await transaction.order.create({
          data: {
            orderNumber: this.orderNumber(),
            userId,
            status: 'PENDING',
            subtotal,
            grandTotal: subtotal,
            shippingAddress: this.addressJson(dto.shippingAddress),
            billingAddress: this.addressJson(
              dto.billingAddress ?? dto.shippingAddress,
            ),
            notes: dto.notes,
            items: {
              create: cart.items.map((item) => ({
                productId: item.variant.productId,
                variantId: item.variantId,
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
                unitPrice: item.variant.price,
                quantity: item.quantity,
                totalPrice: Number(item.variant.price) * item.quantity,
              })),
            },
          },
          include: orderInclude,
        });

        if (dto.saveAddress) {
          const addressCount = await transaction.address.count({
            where: { userId },
          });
          await transaction.address.create({
            data: {
              userId,
              ...dto.shippingAddress,
              label: 'Shipping',
              isDefault: addressCount === 0,
            },
          });
        }

        await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async findMany({
    userId,
    query,
  }: {
    userId?: string;
    query: OrderQueryDto;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(userId ? { userId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
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

  private async getById(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
  }

  private orderNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `NX-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private addressJson(address: CheckoutAddressDto): Prisma.InputJsonObject {
    return {
      firstName: address.firstName,
      lastName: address.lastName,
      ...(address.phone ? { phone: address.phone } : {}),
      line1: address.line1,
      ...(address.line2 ? { line2: address.line2 } : {}),
      city: address.city,
      ...(address.region ? { region: address.region } : {}),
      postalCode: address.postalCode,
      country: address.country,
    };
  }
}
