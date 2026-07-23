import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { TicketQueryDto, TicketStatusValue } from './dto/ticket-query.dto';

const ticketListInclude = {
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  assignee: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  _count: { select: { messages: true } },
} as const;

const transitions: Record<TicketStatusValue, TicketStatusValue[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'CLOSED'],
  CLOSED: ['OPEN'],
};

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTicketDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, userId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Order not found.');
    }

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber: this.ticketNumber(),
        customerId: userId,
        orderId: dto.orderId,
        subject: dto.subject,
        priority: dto.priority ?? 'NORMAL',
        messages: {
          create: {
            authorId: userId,
            senderType: 'CUSTOMER',
            body: dto.message,
          },
        },
      },
      include: ticketListInclude,
    });
  }

  findMine(userId: string, query: TicketQueryDto) {
    return this.findMany({ customerId: userId, query });
  }

  findInbox(query: TicketQueryDto) {
    return this.findMany({ query });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const manager = this.canManage(user);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...(manager ? {} : { customerId: user.id }) },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        order: { select: { id: true, orderNumber: true, status: true } },
        messages: {
          where: manager ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
            attachments: true,
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    return ticket;
  }

  async addMessage(
    id: string,
    user: AuthenticatedUser,
    dto: CreateTicketMessageDto,
  ) {
    const ticket = await this.getAccessibleTicket(id, user);
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Reopen this ticket before replying.');
    }
    const manager = this.canManage(user);
    if (dto.isInternal && !manager) {
      throw new ForbiddenException('Customers cannot add internal notes.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          senderType: manager ? 'SUPPORT_AGENT' : 'CUSTOMER',
          body: dto.body,
          isInternal: manager ? (dto.isInternal ?? false) : false,
        },
      });
      await transaction.supportTicket.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          ...(manager && !ticket.assigneeId ? { assigneeId: user.id } : {}),
          ...(!manager && ticket.status === 'WAITING_FOR_CUSTOMER'
            ? { status: 'IN_PROGRESS' }
            : {}),
        },
      });
    });
    return this.findOne(id, user);
  }

  async assignToSelf(id: string, user: AuthenticatedUser) {
    this.assertManager(user);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');

    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assigneeId: user.id,
        ...(ticket.status === 'OPEN' ? { status: 'IN_PROGRESS' } : {}),
      },
    });
    return this.findOne(id, user);
  }

  async updateStatus(
    id: string,
    nextStatus: TicketStatusValue,
    user: AuthenticatedUser,
  ) {
    this.assertManager(user);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    const current = ticket.status;
    if (current !== nextStatus && !transitions[current].includes(nextStatus)) {
      throw new BadRequestException(
        `Ticket cannot move from ${current} to ${nextStatus}.`,
      );
    }

    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
        ...(current === 'RESOLVED' && nextStatus !== 'CLOSED'
          ? { resolvedAt: null }
          : {}),
      },
    });
    return this.findOne(id, user);
  }

  private async findMany({
    customerId,
    query,
  }: {
    customerId?: string;
    query: TicketQueryDto;
  }) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        include: ticketListInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  private async getAccessibleTicket(id: string, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id,
        ...(this.canManage(user) ? {} : { customerId: user.id }),
      },
      select: { id: true, status: true, assigneeId: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    return ticket;
  }

  private canManage(user: AuthenticatedUser) {
    return user.roles.some((role) => ['admin', 'support_agent'].includes(role));
  }

  private assertManager(user: AuthenticatedUser) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Support agent access is required.');
    }
  }

  private ticketNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `SUP-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
