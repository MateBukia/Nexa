import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiProvider } from './ai-provider';
import { SupportAssistantService } from './support-assistant.service';

describe('SupportAssistantService', () => {
  const chatSessionCreate = jest.fn();
  const chatSessionFindUnique = jest.fn();
  const chatSessionFindFirst = jest.fn();
  const chatMessageFindMany = jest.fn();
  const chatMessageCreate = jest.fn();
  const orderFindMany = jest.fn();
  const orderFindFirst = jest.fn();
  const supportTicketFindMany = jest.fn();
  const supportTicketCreate = jest.fn();
  const supportTicketFindFirst = jest.fn();
  const aiSummaryCreate = jest.fn();
  const transaction = jest.fn((callback: (client: unknown) => unknown) =>
    Promise.resolve(
      callback({
        supportTicket: { create: supportTicketCreate },
        aiSummary: { create: aiSummaryCreate },
        chatMessage: { create: jest.fn() },
        chatSession: { update: jest.fn() },
      }),
    ),
  );
  const prisma = {
    chatSession: {
      create: chatSessionCreate,
      findUnique: chatSessionFindUnique,
      findFirst: chatSessionFindFirst,
    },
    chatMessage: { findMany: chatMessageFindMany, create: chatMessageCreate },
    order: { findMany: orderFindMany, findFirst: orderFindFirst },
    supportTicket: {
      findMany: supportTicketFindMany,
      findFirst: supportTicketFindFirst,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const composeSupportAnswer = jest.fn();
  const ai = {
    model: 'test-model',
    composeSupportAnswer,
  } as unknown as AiProvider;
  const service = new SupportAssistantService(prisma, ai);

  beforeEach(() => {
    jest.clearAllMocks();
    chatMessageFindMany.mockResolvedValue([]);
    supportTicketFindMany.mockResolvedValue([]);
  });

  it('requires confirmation and rejects an order ID outside the customer context', async () => {
    chatSessionCreate.mockResolvedValue({
      id: 'session-id',
      userId: 'user-id',
      title: null,
      type: 'SUPPORT',
    });
    orderFindMany.mockResolvedValue([{ id: 'real-order' }]);
    composeSupportAnswer.mockResolvedValue({
      answer: 'I can prepare a ticket for a support agent.',
      escalationNeeded: true,
      escalationReason: 'Needs investigation',
      ticketSubject: 'Missing delivery',
      conversationSummary: 'Customer reports a missing delivery.',
      suggestedCategory: 'SHIPPING',
      priority: 'NORMAL',
      relatedOrderId: 'invented-order',
    });

    const result = await service.chat('user-id', {
      message: 'My delivery is missing, please get a person to investigate.',
    });

    expect(result.relatedOrderId).toBeNull();
    expect(result.ticket).toBeNull();
    expect(result.requiresTicketConfirmation).toBe(true);
    expect(result.ticketProposal).toMatchObject({
      title: 'Missing delivery',
      suggestedCategory: 'SHIPPING',
      relatedOrderId: null,
    });
    expect(supportTicketCreate).not.toHaveBeenCalled();
  });

  it('creates a ticket only after confirmation and rechecks order ownership', async () => {
    chatSessionFindFirst.mockResolvedValue({
      id: 'session-id',
      metadata: {
        pendingTicketProposal: {
          title: 'Missing delivery',
          originalIssue: 'My delivery is missing.',
          conversationSummary: 'Customer reports a missing delivery.',
          suggestedCategory: 'SHIPPING',
          priority: 'HIGH',
          relatedOrderId: 'real-order',
        },
      },
    });
    orderFindFirst.mockResolvedValue({ id: 'real-order' });
    supportTicketCreate.mockResolvedValue({
      id: 'ticket-id',
      ticketNumber: 'SUP-1',
      subject: 'Missing delivery',
      status: 'OPEN',
    });

    const result = await service.confirmTicket('user-id', 'session-id');

    expect(result.id).toBe('ticket-id');
    expect(supportTicketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          orderId: 'real-order',
          customerId: 'user-id',
          priority: 'HIGH',
        }),
      }),
    );
    expect(orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'real-order', userId: 'user-id' },
      }),
    );
    expect(aiSummaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          ticketId: 'ticket-id',
          summary: 'Customer reports a missing delivery.',
        }),
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

  it('returns a sign-in fallback for unauthenticated support requests', () => {
    expect(service.unauthenticatedResponse()).toMatchObject({
      sessionId: null,
      escalationNeeded: false,
      requiresTicketConfirmation: false,
      ticket: null,
    });
    expect(service.unauthenticatedResponse().message).toContain('sign in');
  });

  it('returns a safe fallback when support context cannot be loaded', async () => {
    chatSessionCreate.mockRejectedValue(new Error('database unavailable'));

    const result = await service.chat('user-id', {
      message: 'Where is my order?',
    });

    expect(result).toMatchObject({
      sessionId: null,
      escalationNeeded: false,
      ticketProposal: null,
      ticket: null,
    });
    expect(result.message).toContain('orders were not changed');
  });
});
