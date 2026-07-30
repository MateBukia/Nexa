import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DraftSupportReplyDto,
  GenerateProductCopyDto,
  SummarizeReviewsDto,
  SummarizeSupportIssuesDto,
} from './dto/admin-ai.dto';
import { AI_PROVIDER, AiProvider } from './ai-provider';

@Injectable()
export class AdminAiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  generateProductCopy(userId: string, dto: GenerateProductCopyDto) {
    return this.ai.generateProductCopy(
      dto.notes,
      dto.tone ?? 'clear, premium, and practical',
      this.safety(userId),
    );
  }

  async summarizeReviews(userId: string, dto: SummarizeReviewsDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        reviews: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            rating: true,
            title: true,
            body: true,
            isVerifiedPurchase: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found.');
    const result = await this.ai.summarizeReviews(product, this.safety(userId));
    await this.prisma.aiSummary.create({
      data: {
        subjectType: 'PRODUCT_REVIEWS',
        subjectId: product.id,
        summary: result.summary,
        model: this.ai.model,
        metadata: {
          strengths: result.strengths,
          concerns: result.concerns,
          sentiment: result.sentiment,
          reviewCount: product.reviews.length,
        },
      },
    });
    return {
      product: { id: product.id, name: product.name },
      reviewCount: product.reviews.length,
      ...result,
    };
  }

  async summarizeSupportIssues(userId: string, dto: SummarizeSupportIssuesDto) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: dto.status ? { status: dto.status } : {},
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          take: 20,
          select: { senderType: true, body: true },
        },
      },
    });
    const result = await this.ai.summarizeSupportIssues(
      { tickets },
      this.safety(userId),
    );
    await this.prisma.aiSummary.create({
      data: {
        subjectType: 'SUPPORT_ISSUES',
        summary: result.summary,
        model: this.ai.model,
        metadata: {
          ticketCount: tickets.length,
          recurringIssues: result.recurringIssues,
        },
      },
    });
    return { ticketCount: tickets.length, ...result };
  }

  async draftSupportReply(userId: string, dto: DraftSupportReplyDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: dto.ticketId },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        order: {
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          take: 30,
          select: { senderType: true, body: true, createdAt: true },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    return this.ai.draftSupportReply(
      {
        ticket,
        staffGuidance: dto.guidance ?? null,
        rules: [
          'This is a draft and must be reviewed before sending.',
          'Do not promise an unrecorded action.',
        ],
      },
      this.safety(userId),
    );
  }

  private safety(userId: string) {
    return createHash('sha256').update(`nexa:${userId}`).digest('hex');
  }
}
