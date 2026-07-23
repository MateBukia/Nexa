import { IsIn } from 'class-validator';
import { TICKET_STATUSES, TicketStatusValue } from './ticket-query.dto';

export class UpdateTicketStatusDto {
  @IsIn(TICKET_STATUSES)
  status!: TicketStatusValue;
}
