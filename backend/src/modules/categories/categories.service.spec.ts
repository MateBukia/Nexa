import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  it('prevents deletion of a category that still owns products', async () => {
    const categoryDelete = jest.fn();
    const prisma = {
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-id',
          _count: { products: 2, children: 0 },
        }),
        delete: categoryDelete,
      },
    } as unknown as PrismaService;
    const service = new CategoriesService(prisma);

    await expect(service.remove('category-id')).rejects.toThrow(
      ConflictException,
    );
    expect(categoryDelete).not.toHaveBeenCalled();
  });
});
