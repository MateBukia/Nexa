import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { RateLimit } from '../../common/security/rate-limit.decorator';
import { RateLimitGuard } from '../../common/security/rate-limit.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { AdminAiService } from './admin-ai.service';
import { ConfirmSupportTicketDto } from './dto/confirm-support-ticket.dto';
import {
  DraftSupportReplyDto,
  GenerateProductCopyDto,
  SummarizeReviewsDto,
  SummarizeSupportIssuesDto,
} from './dto/admin-ai.dto';
import { ShopAssistantDto } from './dto/shop-assistant.dto';
import { SupportAssistantDto } from './dto/support-assistant.dto';
import { ShoppingAssistantService } from './shopping-assistant.service';
import { SupportAssistantService } from './support-assistant.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly shopping: ShoppingAssistantService,
    private readonly support: SupportAssistantService,
    private readonly admin: AdminAiService,
  ) {}

  @RateLimit(20, 60_000)
  @UseGuards(OptionalJwtAuthGuard, RateLimitGuard)
  @Post('shop-assistant')
  shopAssistant(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: ShopAssistantDto,
  ) {
    return this.shopping.chat(user?.id ?? null, dto);
  }

  @RateLimit(20, 60_000)
  @UseGuards(OptionalJwtAuthGuard, RateLimitGuard)
  @Post('support-assistant')
  supportAssistant(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: SupportAssistantDto,
  ) {
    return user
      ? this.support.chat(user.id, dto)
      : this.support.unauthenticatedResponse();
  }

  @RateLimit(5, 60_000)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @Post('support-assistant/confirm-ticket')
  confirmSupportTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmSupportTicketDto,
  ) {
    return this.support.confirmTicket(user.id, dto.sessionId);
  }

  @Roles('admin')
  @RateLimit(10, 60_000)
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Post('generate-product-copy')
  generateProductCopy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateProductCopyDto,
  ) {
    return this.admin.generateProductCopy(user.id, dto);
  }

  @Roles('admin')
  @RateLimit(10, 60_000)
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Post('summarize-reviews')
  summarizeReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SummarizeReviewsDto,
  ) {
    return this.admin.summarizeReviews(user.id, dto);
  }

  @Roles('admin', 'support_agent')
  @RateLimit(10, 60_000)
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Post('summarize-support-issues')
  summarizeSupportIssues(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SummarizeSupportIssuesDto,
  ) {
    return this.admin.summarizeSupportIssues(user.id, dto);
  }

  @Roles('admin', 'support_agent')
  @RateLimit(10, 60_000)
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Post('draft-support-reply')
  draftSupportReply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DraftSupportReplyDto,
  ) {
    return this.admin.draftSupportReply(user.id, dto);
  }
}
