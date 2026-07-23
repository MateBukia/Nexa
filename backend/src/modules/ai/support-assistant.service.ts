import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupportAssistantDto } from './dto/support-assistant.dto';
import { OpenAiService } from './openai.service';

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
  contact:
    'Customers can continue through a support ticket when human help is needed.',
};

@Injectable()
export class SupportAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenAiService,
  ) {}

  async chat(userId: string, dto: SupportAssistantDto) {
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
    const ticketNumber = escalation ? this.ticketNumber() : null;

    const result = await this.prisma.$transaction(async (transaction) => {
      const ticket = escalation
        ? await transaction.supportTicket.create({
            data: {
              ticketNumber: ticketNumber!,
              customerId: userId,
              orderId: relatedOrderId,
              subject: (
                generated.ticketSubject ?? 'AI support escalation'
              ).slice(0, 180),
              priority: generated.priority,
              messages: {
                create: {
                  authorId: userId,
                  senderType: 'CUSTOMER',
                  body: dto.message,
                },
              },
            },
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
              status: true,
            },
          })
        : null;
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
            ticketId: ticket?.id ?? null,
          },
        },
      });
      await transaction.chatSession.update({
        where: { id: session.id },
        data: {
          title: session.title ?? dto.message.slice(0, 80),
          metadata: {
            lastRelatedOrderId: relatedOrderId,
            lastTicketId: ticket?.id ?? null,
          },
          updatedAt: new Date(),
        },
      });
      return ticket;
    });

    return {
      sessionId: session.id,
      message: generated.answer,
      escalationNeeded: escalation,
      relatedOrderId,
      ticket: result,
    };
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
}
