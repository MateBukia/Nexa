import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const productFindFirst = jest.fn();
  const reviewFindUnique = jest.fn();
  const reviewCreate = jest.fn();
  const orderItemFindFirst = jest.fn();
  const prisma = {
    product: { findFirst: productFindFirst },
    review: { findUnique: reviewFindUnique, create: reviewCreate },
    orderItem: { findFirst: orderItemFindFirst },
  } as unknown as PrismaService;
  const service = new ReviewsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('marks a delivered-order review as a verified purchase', async () => {
    productFindFirst.mockResolvedValue({ id: 'product-id' });
    reviewFindUnique.mockResolvedValue(null);
    orderItemFindFirst.mockResolvedValue({ id: 'order-item-id' });
    reviewCreate.mockImplementation(({ data }) => Promise.resolve(data));

    const result = await service.create('user-id', 'product-id', {
      rating: 5,
      body: 'Excellent product and delivery experience.',
    });

    expect(result.isVerifiedPurchase).toBe(true);
  });

  it('allows only one review per user and product', async () => {
    productFindFirst.mockResolvedValue({ id: 'product-id' });
    reviewFindUnique.mockResolvedValue({ id: 'existing-review' });

    await expect(
      service.create('user-id', 'product-id', {
        rating: 4,
        body: 'This review already exists for the product.',
      }),
    ).rejects.toThrow(ConflictException);
    expect(reviewCreate).not.toHaveBeenCalled();
  });
});
