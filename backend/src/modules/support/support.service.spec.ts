import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { SupportService } from './support.service';

describe('SupportService', () => {
  const ticketFindFirst = jest.fn();
  const ticketFindUnique = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    supportTicket: {
      findFirst: ticketFindFirst,
      findUnique: ticketFindUnique,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new SupportService(prisma);
  const customer: AuthenticatedUser = {
    id: 'customer-id',
    email: 'customer@example.com',
    firstName: 'Nino',
    lastName: 'Customer',
    roles: ['customer'],
  };
  const agent: AuthenticatedUser = {
    id: 'agent-id',
    email: 'support@example.com',
    firstName: 'Mariam',
    lastName: 'Support',
    roles: ['support_agent'],
  };

  beforeEach(() => jest.clearAllMocks());

  it('scopes customer ticket detail to its owner', async () => {
    ticketFindFirst.mockResolvedValue(null);
    await expect(service.findOne('ticket-id', customer)).rejects.toThrow(
      NotFoundException,
    );
    expect(ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-id', customerId: 'customer-id' },
      }),
    );
  });

  it('prevents customers from creating internal notes', async () => {
    ticketFindFirst.mockResolvedValue({
      id: 'ticket-id',
      status: 'OPEN',
      assigneeId: null,
    });
    await expect(
      service.addMessage('ticket-id', customer, {
        body: 'This should not be private.',
        isInternal: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid staff status transitions', async () => {
    ticketFindUnique.mockResolvedValue({ status: 'CLOSED' });
    await expect(
      service.updateStatus('ticket-id', 'RESOLVED', agent),
    ).rejects.toThrow(BadRequestException);
  });
});
