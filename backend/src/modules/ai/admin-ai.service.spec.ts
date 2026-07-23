import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminAiService } from './admin-ai.service';
import { OpenAiService } from './openai.service';

describe('AdminAiService', () => {
  const productFindUnique = jest.fn();
  const ticketFindUnique = jest.fn();
  const aiSummaryCreate = jest.fn();
  const prisma = {
    product: { findUnique: productFindUnique },
    supportTicket: { findUnique: ticketFindUnique, findMany: jest.fn() },
    aiSummary: { create: aiSummaryCreate },
  } as unknown as PrismaService;
  const summarizeReviews = jest.fn();
  const draftSupportReply = jest.fn();
  const ai = {
    model: 'test-model',
    summarizeReviews,
    draftSupportReply,
  } as unknown as OpenAiService;
  const service = new AdminAiService(prisma, ai);

  beforeEach(() => jest.clearAllMocks());

  it('grounds a review summary in published reviews and persists it', async () => {
    productFindUnique.mockResolvedValue({
      id: 'product-id',
      name: 'Runner',
      reviews: [
        {
          rating: 5,
          title: 'Great',
          body: 'Very comfortable',
          isVerifiedPurchase: true,
        },
      ],
    });
    summarizeReviews.mockResolvedValue({
      summary: 'Customers like comfort.',
      strengths: ['Comfort'],
      concerns: [],
      sentiment: 'POSITIVE',
    });
    aiSummaryCreate.mockResolvedValue({ id: 'summary-id' });

    const result = await service.summarizeReviews('admin-id', {
      productId: 'product-id',
    });

    expect(result.reviewCount).toBe(1);
    expect(summarizeReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'product-id',
        reviews: expect.any(Array) as unknown,
      }),
      expect.any(String),
    );
    expect(aiSummaryCreate).toHaveBeenCalled();
  });

  it('does not draft against a missing ticket', async () => {
    ticketFindUnique.mockResolvedValue(null);
    await expect(
      service.draftSupportReply('agent-id', { ticketId: 'ticket-id' }),
    ).rejects.toThrow(NotFoundException);
    expect(draftSupportReply).not.toHaveBeenCalled();
  });
});
