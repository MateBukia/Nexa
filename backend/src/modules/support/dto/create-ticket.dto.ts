import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @Length(3, 180)
  subject!: string;

  @IsString()
  @Length(10, 5000)
  message!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}
