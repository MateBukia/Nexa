import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateTicketMessageDto {
  @IsString()
  @Length(1, 5000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
