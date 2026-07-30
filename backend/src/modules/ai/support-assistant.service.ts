import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupportAssistantDto } from './dto/support-assistant.dto';
import { AI_PROVIDER, AiProvider } from './ai-provider';

const storeFacts = {
  currency: 'GEL',
  orderStatuses: {
    PENDING: 'The order was received and is awaiting confirmation.',
    CONFIRMED: 'The order was confirmed.',
    PROCESSING: 'The order is being prepared.',
    SHIPPED: 'The order has shipped.',
    DELIVERED: 'The order was delivered.',
    CANCELLED: 'The order was cancelled.',
    REFUNDED: 'The order was refunded.',
  },
  returns:
    'Return eligibility and instructions must be confirmed by a support agent; create a ticket and include the order.',
  shipping:
    'Order status is the authoritative shipping information available here. Do not promise dispatch or delivery dates that are not present in the order.',
  payments:
    'Use only the payment status attached to the customer order. Never request full card numbers, security codes, passwords, or bank credentials.',
  accounts:
    'For sign-in or account access problems, provide basic safe troubleshooting and escalate issues that require account changes or identity verification.',
  contact:
    'Customers can continue through a support ticket when human help is needed.',
};

type TicketProposal = {
  title: string;
  originalIssue: string;
  conversationSummary: string;
  suggestedCategory:
    'SHIPPING' | 'RETURNS' | 'PAYMENT' | 'ACCOUNT' | 'ORDER' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  relatedOrderId: string | null;
};

@Injectable()
export class SupportAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async chat(userId: string, dto: SupportAssistantDto) {
    try {
      return await this.chatWithProvider(userId, dto);
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) throw error;

      return this.fallbackResponse(
        'I could not access support assistance right now. Your account and orders were not changed. Please try again, or open a support ticket from the support page.',
      );
    }
  }

  unauthenticatedResponse() {
    return this.fallbackResponse(
      'Please sign in before asking about an order, payment, account, or support ticket. General catalogue browsing remains available without signing in.',
    );
  }

  private async chatWithProvider(userId: string, dto: SupportAssistantDto) {
    const session = await this.getSession(userId, dto.sessionId);
    const [messages, orders, tickets] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { senderType: true, content: true },
      }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          items: { select: { productName: true, quantity: true } },
          payments: { select: { status: true } },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { customerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          orderId: true,
        },
      }),
    ]);
    const history = messages.reverse().map((item) => ({
      role: item.senderType === 'CUSTOMER' ? 'user' : 'assistant',
      content: item.content,
    }));

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'CUSTOMER',
        content: dto.message,
      },
    });
    const safetyIdentifier = createHash('sha256')
      .update(`nexa:${userId}`)
      .digest('hex');
    const generated = await this.ai.composeSupportAnswer(
      dto.message,
      history,
      { storeFacts, orders, openOrRecentTickets: tickets },
      safetyIdentifier,
    );
    const relatedOrderId = orders.some(
      (order) => order.id === generated.relatedOrderId,
    )
      ? generated.relatedOrderId
      : null;
    const escalation = generated.escalationNeeded;
    const ticketProposal: TicketProposal | null = escalation
      ? {
          title: (generated.ticketSubject ?? 'Support request').slice(0, 180),
          originalIssue: dto.message,
          conversationSummary: (
            generated.conversationSummary ?? dto.message
          ).slice(0, 2000),
          suggestedCategory: generated.suggestedCategory,
          priority: generated.priority,
          relatedOrderId,
        }
      : null;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'AI_ASSISTANT',
          content: generated.answer,
          metadata: {
            model: this.ai.model,
            escalationNeeded: escalation,
            escalationReason: generated.escalationReason,
            relatedOrderId,
            requiresTicketConfirmation: escalation,
          },
        },
      });
      await transaction.chatSession.update({
        where: { id: session.id },
        data: {
          title: session.title ?? dto.message.slice(0, 80),
          metadata: {
            lastRelatedOrderId: relatedOrderId,
            pendingTicketProposal: ticketProposal,
          },
          updatedAt: new Date(),
        },
      });
    });

    return {
      sessionId: session.id,
      message:
        generated.answer.trim() ||
        'I could not prepare a support answer. Please rephrase the issue or request a support ticket.',
      escalationNeeded: escalation,
      relatedOrderId,
      requiresTicketConfirmation: escalation,
      ticketProposal,
      ticket: null,
    };
  }

  private fallbackResponse(message: string) {
    return {
      sessionId: null,
      message,
      escalationNeeded: false,
      relatedOrderId: null,
      requiresTicketConfirmation: false,
      ticketProposal: null,
      ticket: null,
    };
  }

  async confirmTicket(userId: string, sessionId: string) {
    try {
      return await this.confirmTicketWithDatabase(userId, sessionId);
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'The support ticket could not be created right now. Please try again; your request was not confirmed as created.',
      );
    }
  }

  private async confirmTicketWithDatabase(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, type: 'SUPPORT' },
      select: { id: true, metadata: true },
    });
    if (!session) {
      throw new NotFoundException('Support conversation not found.');
    }

    const metadata = this.record(session.metadata);
    const existingTicketId = metadata.createdTicketId;
    if (typeof existingTicketId === 'string') {
      const existingTicket = await this.prisma.supportTicket.findFirst({
        where: { id: existingTicketId, customerId: userId },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
        },
      });
      if (existingTicket) return existingTicket;
    }

    const proposal = this.ticketProposal(metadata.pendingTicketProposal);
    if (!proposal) {
      throw new BadRequestException(
        'There is no pending support ticket to confirm.',
      );
    }

    if (proposal.relatedOrderId) {
      const ownedOrder = await this.prisma.order.findFirst({
        where: { id: proposal.relatedOrderId, userId },
        select: { id: true },
      });
      if (!ownedOrder) {
        throw new BadRequestException(
          'The related order is no longer available for this request.',
        );
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.supportTicket.create({
        data: {
          ticketNumber: this.ticketNumber(),
          customerId: userId,
          orderId: proposal.relatedOrderId,
          subject: proposal.title,
          priority: proposal.priority,
          messages: {
            create: [
              {
                authorId: userId,
                senderType: 'CUSTOMER',
                body: proposal.originalIssue,
              },
              {
                senderType: 'SYSTEM',
                isInternal: true,
                body: `AI conversation summary: ${proposal.conversationSummary}\nSuggested category: ${proposal.suggestedCategory}`,
              },
            ],
          },
        },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
        },
      });
      await transaction.aiSummary.create({
        data: {
          ticketId: ticket.id,
          subjectType: 'SUPPORT_ESCALATION',
          subjectId: sessionId,
          summary: proposal.conversationSummary,
          model: this.ai.model,
          metadata: {
            suggestedCategory: proposal.suggestedCategory,
            priority: proposal.priority,
          },
        },
      });
      await transaction.chatSession.update({
        where: { id: sessionId },
        data: {
          metadata: {
            createdTicketId: ticket.id,
            pendingTicketProposal: null,
            lastRelatedOrderId: proposal.relatedOrderId,
          },
          updatedAt: new Date(),
        },
      });
      await transaction.chatMessage.create({
        data: {
          sessionId,
          senderType: 'SYSTEM',
          content: `Support ticket ${ticket.ticketNumber} was created after customer confirmation.`,
          metadata: { ticketId: ticket.id },
        },
      });
      return ticket;
    });
  }

  private async getSession(userId: string, sessionId?: string) {
    if (!sessionId) {
      return this.prisma.chatSession.create({
        data: { userId, type: 'SUPPORT' },
      });
    }
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.type !== 'SUPPORT') {
      throw new NotFoundException('Support conversation not found.');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException(
        'This conversation belongs to another user.',
      );
    }
    return session;
  }

  private ticketNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `SUP-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private ticketProposal(value: unknown): TicketProposal | null {
    const proposal = this.record(value);
    const categories = [
      'SHIPPING',
      'RETURNS',
      'PAYMENT',
      'ACCOUNT',
      'ORDER',
      'OTHER',
    ];
    const priorities = ['LOW', 'NORMAL', 'HIGH'];
    if (
      typeof proposal.title !== 'string' ||
      typeof proposal.originalIssue !== 'string' ||
      typeof proposal.conversationSummary !== 'string' ||
      typeof proposal.suggestedCategory !== 'string' ||
      !categories.includes(proposal.suggestedCategory) ||
      typeof proposal.priority !== 'string' ||
      !priorities.includes(proposal.priority) ||
      !(
        proposal.relatedOrderId === null ||
        typeof proposal.relatedOrderId === 'string'
      )
    ) {
      return null;
    }
    return proposal as TicketProposal;
  }
}
