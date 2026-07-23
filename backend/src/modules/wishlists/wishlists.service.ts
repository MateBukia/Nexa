import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: {
    where: { isActive: true },
    orderBy: { price: 'asc' as const },
    include: { inventory: true },
  },
} as const;

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          where: { product: { status: 'ACTIVE' } },
          orderBy: { createdAt: 'desc' },
          include: { product: { include: productInclude } },
        },
      },
    });
    return {
      id: wishlist.id,
      items: wishlist.items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        product: item.product,
      })),
    };
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');

    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      update: {},
      create: { wishlistId: wishlist.id, productId },
    });
    return this.findMine(userId);
  }

  async remove(userId: string, productId: string) {
    const result = await this.prisma.wishlistItem.deleteMany({
      where: { productId, wishlist: { userId } },
    });
    if (!result.count) throw new NotFoundException('Wishlist item not found.');
  }
}
