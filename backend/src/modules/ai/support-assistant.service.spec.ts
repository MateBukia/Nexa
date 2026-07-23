import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from './openai.service';
import { SupportAssistantService } from './support-assistant.service';

describe('SupportAssistantService', () => {
  const chatSessionCreate = jest.fn();
  const chatSessionFindUnique = jest.fn();
  const chatMessageFindMany = jest.fn();
  const chatMessageCreate = jest.fn();
  const orderFindMany = jest.fn();
  const supportTicketFindMany = jest.fn();
  const supportTicketCreate = jest.fn();
  const transaction = jest.fn((callback: (client: unknown) => unknown) =>
    Promise.resolve(
      callback({
        supportTicket: { create: supportTicketCreate },
        chatMessage: { create: jest.fn() },
        chatSession: { update: jest.fn() },
      }),
    ),
  );
  const prisma = {
    chatSession: {
      create: chatSessionCreate,
      findUnique: chatSessionFindUnique,
    },
    chatMessage: { findMany: chatMessageFindMany, create: chatMessageCreate },
    order: { findMany: orderFindMany },
    supportTicket: { findMany: supportTicketFindMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const composeSupportAnswer = jest.fn();
  const ai = {
    model: 'test-model',
    composeSupportAnswer,
  } as unknown as OpenAiService;
  const service = new SupportAssistantService(prisma, ai);

  beforeEach(() => {
    jest.clearAllMocks();
    chatMessageFindMany.mockResolvedValue([]);
    supportTicketFindMany.mockResolvedValue([]);
  });

  it('creates a ticket but rejects an order ID outside the customer context', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'session-id',
      userId: 'user-id',
      title: null,
      type: 'SUPPORT',
    });
    orderFindMany.mockResolvedValue([{ id: 'real-order' }]);
    composeSupportAnswer.mockResolvedValue({
      answer: 'I opened a ticket for a support agent.',
      escalationNeeded: true,
      escalationReason: 'Needs investigation',
      ticketSubject: 'Missing delivery',
      priority: 'NORMAL',
      relatedOrderId: 'invented-order',
    });
    supportTicketCreate.mockResolvedValue({
      id: 'ticket-id',
      ticketNumber: 'SUP-1',
      subject: 'Missing delivery',
      status: 'OPEN',
    });

    const result = (await service.chat('user-id', {
      message: 'My delivery is missing, please get a person to investigate.',
    })) as unknown as {
      relatedOrderId: string | null;
      ticket: { id: string } | null;
    };

    expect(result.relatedOrderId).toBeNull();
    expect(result.ticket?.id).toBe('ticket-id');
    expect(supportTicketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ orderId: null, customerId: 'user-id' }),
      }),
    );
  });

  it('rejects a support session owned by another user', async () => {
    chatSessionFindUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'another-user',
      type: 'SUPPORT',
    });

    await expect(
      service.chat('user-id', {
        message: 'Where is my order?',
        sessionId: 'session-id',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(composeSupportAnswer).not.toHaveBeenCalled();
  });
});
