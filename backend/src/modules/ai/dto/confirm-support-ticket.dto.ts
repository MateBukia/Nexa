import { IsUUID } from 'class-validator';

export class ConfirmSupportTicketDto {
  @IsUUID()
  sessionId!: string;
}
