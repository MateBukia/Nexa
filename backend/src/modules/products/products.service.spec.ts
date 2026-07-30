import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const productFindUnique = jest.fn();
  const productFindMany = jest.fn();
  const productCount = jest.fn();
  const transaction = jest.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const productVariantFindFirst = jest.fn();
  const productVariantUpdate = jest.fn();
  const prisma = {
    product: {
      findUnique: productFindUnique,
      findMany: productFindMany,
      count: productCount,
    },
    productVariant: {
      findFirst: productVariantFindFirst,
      update: productVariantUpdate,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new ProductsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an inverted price range before querying the catalog', async () => {
    await expect(
      service.findAll({
        minPrice: 300,
        maxPrice: 100,
        page: 1,
        limit: 20,
        sort: 'newest',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('browses only active products with pagination', async () => {
    productFindMany.mockResolvedValue([
      {
        id: 'product-id',
        name: 'Live Product',
        status: 'ACTIVE',
        category: { id: 'category-id', name: 'Audio', slug: 'audio' },
        images: [],
        variants: [{ id: 'variant-id', price: '99.00', inventory: null }],
      },
    ]);
    productCount.mockResolvedValue(1);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      sort: 'newest',
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    });
    expect(result.items[0]).toMatchObject({ id: 'product-id' });
    expect(productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } }),
    );
  });

  it('does not update a variant outside the requested product', async () => {
    productVariantFindFirst.mockResolvedValue(null);

    await expect(
      service.updateVariant('product-id', 'variant-id', { price: 20 }),
    ).rejects.toThrow(NotFoundException);
    expect(productVariantUpdate).not.toHaveBeenCalled();
  });
});
