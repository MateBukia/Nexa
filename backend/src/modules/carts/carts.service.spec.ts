import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartsService } from './carts.service';

describe('CartsService', () => {
  const variantFindUnique = jest.fn();
  const cartUpsert = jest.fn();
  const cartItemFindUnique = jest.fn();
  const cartItemUpsert = jest.fn();
  const cartItemDeleteMany = jest.fn();
  const prisma = {
    productVariant: { findUnique: variantFindUnique },
    cart: { upsert: cartUpsert },
    cartItem: {
      findUnique: cartItemFindUnique,
      upsert: cartItemUpsert,
      deleteMany: cartItemDeleteMany,
    },
  } as unknown as PrismaService;
  const service = new CartsService(prisma);

  beforeEach(() => jest.clearAllMocks());

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
});
