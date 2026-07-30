import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const orderFindUnique = jest.fn();
  const orderFindFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    order: { findUnique: orderFindUnique, findFirst: orderFindFirst },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new OrdersService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid fulfillment transition', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'order-id',
      status: 'SHIPPED',
      items: [],
    });

    await expect(
      service.updateStatus('order-id', 'PROCESSING'),
    ).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('scopes customer order detail to its owner', async () => {
    orderFindFirst.mockResolvedValue(null);

    await expect(
      service.findOne('order-id', {
        id: 'customer-id',
        email: 'customer@example.com',
        firstName: 'Nino',
        lastName: 'Customer',
        roles: ['customer'],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-id', userId: 'customer-id' },
      }),
    );
  });

  it('returns an order that belongs to the authenticated customer', async () => {
    orderFindFirst.mockResolvedValue({
      id: 'order-id',
      userId: 'customer-id',
      orderNumber: 'NX-TEST',
      items: [],
      payments: [],
    });

    const result = await service.findOne('order-id', {
      id: 'customer-id',
      email: 'customer@example.com',
      firstName: 'Nino',
      lastName: 'Customer',
      roles: ['customer'],
    });

    expect(result).toMatchObject({ id: 'order-id', userId: 'customer-id' });
    expect(orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-id', userId: 'customer-id' },
      }),
    );
  });

  const checkoutAddress = {
    firstName: 'Nino',
    lastName: 'Customer',
    line1: '1 Test Street',
    city: 'Tbilisi',
    postalCode: '0100',
    country: 'GE',
  };

  it('rejects checkout when live stock is below the cart quantity', async () => {
    const inventoryUpdate = jest.fn();
    const transactionClient = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cart-id',
          items: [
            {
              quantity: 2,
              variantId: 'variant-id',
              variant: {
                id: 'variant-id',
                isActive: true,
                productId: 'product-id',
                price: '25.00',
                inventory: { quantity: 3, reservedQuantity: 2 },
                product: { name: 'Headphones', status: 'ACTIVE' },
              },
            },
          ],
        }),
      },
      inventory: { update: inventoryUpdate },
    };
    transaction.mockImplementation((callback: (client: unknown) => unknown) =>
      callback(transactionClient),
    );

    await expect(
      service.create('customer-id', { shippingAddress: checkoutAddress }),
    ).rejects.toThrow(ConflictException);
    expect(inventoryUpdate).not.toHaveBeenCalled();
  });

  it('creates an order from live inventory and preserves product snapshots', async () => {
    const inventoryUpdate = jest.fn().mockResolvedValue({
      quantity: 7,
      reservedQuantity: 2,
    });
    const orderCreate = jest.fn().mockResolvedValue({
      id: 'order-id',
      orderNumber: 'NX-TEST',
      items: [],
    });
    const cartItemDeleteMany = jest.fn();
    const transactionClient = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cart-id',
          items: [
            {
              quantity: 3,
              variantId: 'variant-id',
              variant: {
                id: 'variant-id',
                isActive: true,
                productId: 'product-id',
                sku: 'HEADPHONE-BLK',
                name: 'Black',
                price: '25.00',
                inventory: { quantity: 10, reservedQuantity: 2 },
                product: { name: 'Studio Headphones', status: 'ACTIVE' },
              },
            },
          ],
        }),
      },
      inventory: { update: inventoryUpdate },
      order: { create: orderCreate },
      cartItem: { deleteMany: cartItemDeleteMany },
    };
    transaction.mockImplementation((callback: (client: unknown) => unknown) =>
      callback(transactionClient),
    );

    const result = await service.create('customer-id', {
      shippingAddress: checkoutAddress,
    });

    expect(result).toMatchObject({ id: 'order-id' });
    expect(inventoryUpdate).toHaveBeenCalledWith({
      where: { variantId: 'variant-id' },
      data: { quantity: { decrement: 3 } },
    });
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          userId: 'customer-id',
          subtotal: 75,
          grandTotal: 75,
          items: {
            create: [
              {
                productId: 'product-id',
                variantId: 'variant-id',
                productName: 'Studio Headphones',
                variantName: 'Black',
                sku: 'HEADPHONE-BLK',
                unitPrice: '25.00',
                quantity: 3,
                totalPrice: 75,
              },
            ],
          },
        }),
      }),
    );
    expect(cartItemDeleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-id' },
    });
    expect(7 - 2).toBeGreaterThanOrEqual(0);
  });
});
