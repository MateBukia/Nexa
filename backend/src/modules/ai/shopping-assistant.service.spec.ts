import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiProvider } from './ai-provider';
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
  } as unknown as AiProvider;
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
      intent: 'PRODUCT_SEARCH',
      keywords: ['sneakers'],
      category: null,
      minPrice: null,
      maxPrice: 200,
      color: 'black',
      size: null,
      brand: null,
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
            attributes: { color: 'Black', size: '42' },
            inventory: { quantity: 5, reservedQuantity: 0 },
          },
        ],
      },
    ]);
    composeShoppingAnswer.mockResolvedValue({
      answer: 'The Urban Runner fits your request.',
      recommendations: [
        { productId: 'invented-product', reason: 'Invented' },
        { productId: 'real-product', reason: 'Matches color and budget' },
      ],
      clarificationNeeded: false,
    });

    const result = await service.chat('user-id', {
      message: 'Black sneakers under 200 GEL',
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      productId: 'real-product',
      slug: 'urban-runner',
      price: '179',
      url: '/products/urban-runner',
      reason: 'Matches color and budget',
    });
    expect(recommendationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ productId: 'real-product' })],
      }),
    );
  });

  it('does not return variants whose stock is fully reserved', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'anonymous-session',
      title: null,
      userId: null,
      type: 'SHOPPING',
    });
    chatMessageFindMany.mockResolvedValue([]);
    extractShoppingFilters.mockResolvedValue({
      intent: 'AVAILABILITY',
      keywords: ['runner'],
      category: null,
      minPrice: null,
      maxPrice: null,
      color: null,
      size: null,
      brand: null,
    });
    productFindMany.mockResolvedValue([
      {
        id: 'reserved-product',
        name: 'Reserved Runner',
        slug: 'reserved-runner',
        description: 'Runner',
        shortDescription: null,
        brand: 'Nexa',
        tags: ['runner'],
        attributes: null,
        category: { id: 'category-id', name: 'Footwear', slug: 'footwear' },
        images: [],
        variants: [
          {
            id: 'variant-id',
            price: '100',
            attributes: null,
            inventory: { quantity: 5, reservedQuantity: 5 },
          },
        ],
      },
    ]);
    composeShoppingAnswer.mockResolvedValue({
      answer: 'That product is not currently available. Try another size.',
      recommendations: [],
      clarificationNeeded: true,
    });

    const result = await service.chat(null, { message: 'Is Runner in stock?' });

    expect(result.recommendations).toEqual([]);
    expect(result.requiresClarification).toBe(true);
    expect(composeShoppingAnswer).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
      [],
      expect.any(String),
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

  it('returns a useful fallback when the AI provider is unavailable', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'session-id',
      title: null,
      userId: null,
      type: 'SHOPPING',
    });
    chatMessageFindMany.mockResolvedValue([]);
    extractShoppingFilters.mockRejectedValue(new Error('provider failed'));

    const result = await service.chat(null, { message: 'Show headphones' });

    expect(result).toMatchObject({
      sessionId: null,
      requiresClarification: true,
      recommendations: [],
    });
    expect(result.message).toContain('browse the catalogue');
  });

  it('returns no-match guidance when structured output is empty', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'session-id',
      title: null,
      userId: null,
      type: 'SHOPPING',
    });
    chatMessageFindMany.mockResolvedValue([]);
    extractShoppingFilters.mockResolvedValue({
      intent: 'PRODUCT_SEARCH',
      keywords: ['headphones'],
      category: 'Audio',
      minPrice: null,
      maxPrice: 10,
      color: null,
      size: null,
      brand: null,
    });
    productFindMany.mockResolvedValue([]);
    composeShoppingAnswer.mockResolvedValue({
      answer: '',
      recommendations: [],
      clarificationNeeded: true,
    });

    const result = await service.chat(null, {
      message: 'Show headphones under 10 GEL',
    });

    expect(result.message).toContain("couldn't find an available product");
    expect(result.message).toContain('increasing the budget');
  });
});
