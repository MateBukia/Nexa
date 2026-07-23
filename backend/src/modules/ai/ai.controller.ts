import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { AdminAiService } from './admin-ai.service';
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

  @UseGuards(JwtAuthGuard)
  @Post('shop-assistant')
  shopAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ShopAssistantDto,
  ) {
    return this.shopping.chat(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('support-assistant')
  supportAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SupportAssistantDto,
  ) {
    return this.support.chat(user.id, dto);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('generate-product-copy')
  generateProductCopy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateProductCopyDto,
  ) {
    return this.admin.generateProductCopy(user.id, dto);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('summarize-reviews')
  summarizeReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SummarizeReviewsDto,
  ) {
    return this.admin.summarizeReviews(user.id, dto);
  }

  @Roles('admin', 'support_agent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('summarize-support-issues')
  summarizeSupportIssues(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SummarizeSupportIssuesDto,
  ) {
    return this.admin.summarizeSupportIssues(user.id, dto);
  }

  @Roles('admin', 'support_agent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('draft-support-reply')
  draftSupportReply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DraftSupportReplyDto,
  ) {
    return this.admin.draftSupportReply(user.id, dto);
  }
}
