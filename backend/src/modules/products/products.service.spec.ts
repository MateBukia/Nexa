import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const productFindUnique = jest.fn();
  const productVariantFindFirst = jest.fn();
  const productVariantUpdate = jest.fn();
  const prisma = {
    product: { findUnique: productFindUnique },
    productVariant: {
      findFirst: productVariantFindFirst,
      update: productVariantUpdate,
    },
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

  it('does not update a variant outside the requested product', async () => {
    productVariantFindFirst.mockResolvedValue(null);

    await expect(
      service.updateVariant('product-id', 'variant-id', { price: 20 }),
    ).rejects.toThrow(NotFoundException);
    expect(productVariantUpdate).not.toHaveBeenCalled();
  });
});
