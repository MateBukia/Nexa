import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class SupportAssistantDto {
  @IsString()
  @Length(2, 1000)
  message!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
