import { LocalShoppingAssistantService } from './local-shopping-assistant.service';

describe('LocalShoppingAssistantService', () => {
  const service = new LocalShoppingAssistantService();

  it('extracts common catalogue filters without an external provider', async () => {
    await expect(
      service.extractShoppingFilters(
        'Show me black sneakers by Nexa under 200 GEL size EU 42',
      ),
    ).resolves.toMatchObject({
      intent: 'PRODUCT_SEARCH',
      brand: 'nexa',
      color: 'black',
      size: 'EU 42',
      minPrice: null,
      maxPrice: 200,
      keywords: ['sneakers'],
    });
  });

  it('extracts a price range', async () => {
    await expect(
      service.extractShoppingFilters('Find headphones between 100 and 300 GEL'),
    ).resolves.toMatchObject({
      keywords: ['headphones'],
      minPrice: 100,
      maxPrice: 300,
    });
  });

  it('creates recommendations only from supplied catalogue products', async () => {
    const result = await service.composeShoppingAnswer(
      'Show headphones',
      [],
      {
        intent: 'PRODUCT_SEARCH',
        keywords: ['headphones'],
        category: null,
        minPrice: null,
        maxPrice: null,
        color: null,
        size: null,
        brand: null,
      },
      [
        {
          id: 'product-1',
          name: 'Studio Headphones',
          slug: 'studio-headphones',
          description: 'Over-ear headphones',
          category: 'Audio',
          brand: 'Nexa',
          tags: ['audio'],
          attributes: {},
          price: 149,
          availableQuantity: 3,
        },
      ],
    );

    expect(result.recommendations).toEqual([
      { productId: 'product-1', reason: 'Available in the catalogue now.' },
    ]);
    expect(result.clarificationNeeded).toBe(false);
  });
});
