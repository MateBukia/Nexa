import { IsIn } from 'class-validator';
import { ORDER_STATUSES, OrderStatusValue } from './order-query.dto';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatusValue;
}
