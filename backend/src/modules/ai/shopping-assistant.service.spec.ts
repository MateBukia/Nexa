import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from './openai.service';
import { ShoppingAssistantService } from './shopping-assistant.service';

describe('ShoppingAssistantService', () => {
  const chatSessionCreate = jest.fn();
  const chatSessionFindUnique = jest.fn();
  const chatMessageFindMany = jest.fn();
  const chatMessageCreate = jest.fn();
  const productFindMany = jest.fn();
  const recommendationCreateMany = jest.fn();
  const transaction = jest.fn((callback: (client: unknown) => unknown) =>
    Promise.resolve(
      callback({
        chatMessage: { create: jest.fn() },
        chatSession: { update: jest.fn() },
        aiRecommendationEvent: { createMany: recommendationCreateMany },
      }),
    ),
  );
  const prisma = {
    chatSession: {
      create: chatSessionCreate,
      findUnique: chatSessionFindUnique,
    },
    chatMessage: {
      findMany: chatMessageFindMany,
      create: chatMessageCreate,
    },
    product: { findMany: productFindMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const extractShoppingFilters = jest.fn();
  const composeShoppingAnswer = jest.fn();
  const ai = {
    model: 'test-model',
    extractShoppingFilters,
    composeShoppingAnswer,
  } as unknown as OpenAiService;
  const service = new ShoppingAssistantService(prisma, ai);

  beforeEach(() => jest.clearAllMocks());

  it('discards recommendation IDs that were not returned by the catalog', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'session-id',
      title: null,
      userId: 'user-id',
      type: 'SHOPPING',
    });
    chatMessageFindMany.mockResolvedValue([]);
    extractShoppingFilters.mockResolvedValue({
      terms: ['sneakers'],
      category: null,
      minPrice: null,
      maxPrice: 200,
      attributes: ['black'],
    });
    productFindMany.mockResolvedValue([
      {
        id: 'real-product',
        name: 'Urban Runner',
        slug: 'urban-runner',
        description: 'Black sneakers',
        shortDescription: null,
        brand: 'Nexa',
        tags: ['black'],
        attributes: { color: 'Black' },
        category: { id: 'category-id', name: 'Footwear', slug: 'footwear' },
        images: [],
        variants: [
          {
            id: 'variant-id',
            price: '179',
            inventory: { quantity: 5, reservedQuantity: 0 },
          },
        ],
      },
    ]);
    composeShoppingAnswer.mockResolvedValue({
      answer: 'The Urban Runner fits your request.',
      recommendedProductIds: ['invented-product', 'real-product'],
      clarificationNeeded: false,
    });

    const result = await service.chat('user-id', {
      message: 'Black sneakers under 200 GEL',
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].id).toBe('real-product');
    expect(recommendationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ productId: 'real-product' })],
      }),
    );
  });

  it('rejects a conversation owned by another user', async () => {
    chatSessionFindUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'another-user',
      type: 'SHOPPING',
    });

    await expect(
      service.chat('user-id', {
        message: 'Show laptops',
        sessionId: 'session-id',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(extractShoppingFilters).not.toHaveBeenCalled();
  });
});
