import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const orderAggregate = jest.fn();
  const orderCount = jest.fn();
  const orderGroupBy = jest.fn();
  const inventoryFindMany = jest.fn();
  const orderItemGroupBy = jest.fn();
  const ticketGroupBy = jest.fn();
  const ticketCount = jest.fn();
  const productCount = jest.fn();
  const userCount = jest.fn();
  const prisma = {
    order: {
      aggregate: orderAggregate,
      count: orderCount,
      groupBy: orderGroupBy,
    },
    inventory: { findMany: inventoryFindMany },
    orderItem: { groupBy: orderItemGroupBy },
    supportTicket: { groupBy: ticketGroupBy, count: ticketCount },
    product: { count: productCount },
    user: { count: userCount },
  } as unknown as PrismaService;
  const service = new AnalyticsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    orderAggregate
      .mockResolvedValueOnce({ _sum: { grandTotal: 1500 } })
      .mockResolvedValueOnce({ _sum: { grandTotal: 1000 } });
    orderCount.mockResolvedValueOnce(12).mockResolvedValueOnce(40);
    orderGroupBy.mockResolvedValue([
      { status: 'DELIVERED', _count: { _all: 8 } },
    ]);
    inventoryFindMany.mockResolvedValue([
      {
        id: 'inventory-id',
        quantity: 6,
        reservedQuantity: 3,
        lowStockThreshold: 4,
        variant: {
          id: 'variant-id',
          sku: 'SKU-1',
          name: 'Black',
          product: { id: 'product-id', name: 'Runner' },
        },
      },
    ]);
    orderItemGroupBy.mockResolvedValue([
      {
        productId: 'product-id',
        productName: 'Runner',
        _sum: { quantity: 8, totalPrice: 800 },
      },
    ]);
    ticketGroupBy.mockResolvedValue([{ status: 'OPEN', _count: { _all: 2 } }]);
    ticketCount.mockResolvedValue(2);
    productCount.mockResolvedValue(5);
    userCount.mockResolvedValue(20);
  });

  it('calculates period change and available low stock from live aggregates', async () => {
    const result = await service.dashboard(
      new Date('2026-07-21T00:00:00.000Z'),
    );

    expect(result.sales.revenue).toBe(1500);
    expect(result.sales.changePercent).toBe(50);
    expect(result.sales.orders).toBe(12);
    expect(result.lowStock[0]).toEqual(
      expect.objectContaining({ available: 3, productName: 'Runner' }),
    );
    expect(result.topProducts[0]).toEqual(
      expect.objectContaining({ units: 8, revenue: 800 }),
    );
  });
});
