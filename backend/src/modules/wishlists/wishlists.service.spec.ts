import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WishlistsService } from './wishlists.service';

describe('WishlistsService', () => {
  it('does not remove another user’s wishlist item', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      wishlistItem: { deleteMany },
    } as unknown as PrismaService;
    const service = new WishlistsService(prisma);

    await expect(service.remove('user-id', 'product-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { productId: 'product-id', wishlist: { userId: 'user-id' } },
    });
  });
});
