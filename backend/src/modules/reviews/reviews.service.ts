import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

const reviewInclude = {
  user: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: string, query: ReviewQueryDto) {
    await this.assertProduct(productId);
    const where = { productId, isPublished: true };
    const [items, total, aggregate, ratings] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.findMany({
        where,
        select: { rating: true },
      }),
    ]);

    return {
      items: items.map((review) => ({
        ...review,
        user: {
          firstName: review.user.firstName,
          lastInitial: review.user.lastName.slice(0, 1),
        },
      })),
      summary: {
        average: aggregate._avg.rating,
        count: total,
        distribution: ratings.reduce<Record<number, number>>(
          (result, review) => ({
            ...result,
            [review.rating]: (result[review.rating] ?? 0) + 1,
          }),
          {},
        ),
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    await this.assertProduct(productId);
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product.');
    }

    const deliveredPurchase = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: 'DELIVERED' } },
      select: { id: true },
    });

    return this.prisma.review.create({
      data: {
        userId,
        productId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerifiedPurchase: Boolean(deliveredPurchase),
      },
      include: reviewInclude,
    });
  }

  private async assertProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
  }
}
