import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AdminAiService } from './admin-ai.service';
import { AI_PROVIDER } from './ai-provider';
import { OpenAiService } from './openai.service';
import { ShoppingAssistantService } from './shopping-assistant.service';
import { SupportAssistantService } from './support-assistant.service';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    OpenAiService,
    { provide: AI_PROVIDER, useExisting: OpenAiService },
    ShoppingAssistantService,
    SupportAssistantService,
    AdminAiService,
  ],
})
export class AiModule {}
