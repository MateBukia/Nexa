import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartsService } from './carts.service';

describe('CartsService', () => {
  const variantFindUnique = jest.fn();
  const cartUpsert = jest.fn();
  const cartItemFindUnique = jest.fn();
  const cartItemFindFirst = jest.fn();
  const cartItemUpsert = jest.fn();
  const cartItemUpdate = jest.fn();
  const cartItemDeleteMany = jest.fn();
  const prisma = {
    productVariant: { findUnique: variantFindUnique },
    cart: { upsert: cartUpsert },
    cartItem: {
      findUnique: cartItemFindUnique,
      findFirst: cartItemFindFirst,
      upsert: cartItemUpsert,
      update: cartItemUpdate,
      deleteMany: cartItemDeleteMany,
    },
  } as unknown as PrismaService;
  const service = new CartsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  const populatedCart = (quantity: number) => ({
    id: 'cart-id',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [
      {
        id: 'item-id',
        quantity,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        variant: {
          id: 'variant-id',
          sku: 'SKU-1',
          name: 'Standard',
          price: '25.00',
          compareAtPrice: null,
          attributes: null,
          inventory: { quantity: 10, reservedQuantity: 2 },
          product: {
            id: 'product-id',
            name: 'Headphones',
            slug: 'headphones',
            status: 'ACTIVE',
            category: { name: 'Audio', slug: 'audio' },
            images: [],
          },
        },
      },
    ],
  });

  it('rejects a quantity above live available stock', async () => {
    variantFindUnique.mockResolvedValue({
      id: 'variant-id',
      isActive: true,
      product: { status: 'ACTIVE' },
      inventory: { quantity: 5, reservedQuantity: 2 },
    });
    cartUpsert.mockResolvedValue({ id: 'cart-id' });
    cartItemFindUnique.mockResolvedValue({ quantity: 2 });

    await expect(
      service.addItem('user-id', { variantId: 'variant-id', quantity: 2 }),
    ).rejects.toThrow(BadRequestException);
    expect(cartItemUpsert).not.toHaveBeenCalled();
  });

  it('does not remove an item from another user’s cart', async () => {
    cartItemDeleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeItem('user-id', 'item-id')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('adds an available product variant to the customer cart', async () => {
    variantFindUnique.mockResolvedValue({
      id: 'variant-id',
      isActive: true,
      product: { status: 'ACTIVE' },
      inventory: { quantity: 10, reservedQuantity: 2 },
    });
    cartUpsert
      .mockResolvedValueOnce({ id: 'cart-id' })
      .mockResolvedValueOnce(populatedCart(2));
    cartItemFindUnique.mockResolvedValue(null);

    const result = await service.addItem('user-id', {
      variantId: 'variant-id',
      quantity: 2,
    });

    expect(cartItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          cartId: 'cart-id',
          variantId: 'variant-id',
          quantity: 2,
        },
      }),
    );
    expect(result.summary).toMatchObject({ itemCount: 2, subtotal: 50 });
  });

  it('updates cart quantity while respecting available inventory', async () => {
    cartItemFindFirst.mockResolvedValue({
      id: 'item-id',
      variant: { inventory: { quantity: 10, reservedQuantity: 2 } },
    });
    cartUpsert.mockResolvedValue(populatedCart(4));

    const result = await service.updateItem('user-id', 'item-id', {
      quantity: 4,
    });

    expect(cartItemFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-id', cart: { userId: 'user-id' } },
      }),
    );
    expect(cartItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-id' },
      data: { quantity: 4 },
    });
    expect(result.summary.itemCount).toBe(4);
  });
});
