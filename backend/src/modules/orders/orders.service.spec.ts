import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const orderFindUnique = jest.fn();
  const orderFindFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    order: { findUnique: orderFindUnique, findFirst: orderFindFirst },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new OrdersService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid fulfillment transition', async () => {
    orderFindUnique.mockResolvedValue({
      id: 'order-id',
      status: 'SHIPPED',
      items: [],
    });

    await expect(
      service.updateStatus('order-id', 'PROCESSING'),
    ).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('scopes customer order detail to its owner', async () => {
    orderFindFirst.mockResolvedValue(null);

    await expect(
      service.findOne('order-id', {
        id: 'customer-id',
        email: 'customer@example.com',
        firstName: 'Nino',
        lastName: 'Customer',
        roles: ['customer'],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-id', userId: 'customer-id' },
      }),
    );
  });
});
