import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class GenerateProductCopyDto {
  @IsString()
  @Length(10, 4000)
  notes!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  tone?: string;
}

export class SummarizeReviewsDto {
  @IsUUID()
  productId!: string;
}

export class SummarizeSupportIssuesDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'])
  status?:
    'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
}

export class DraftSupportReplyDto {
  @IsUUID()
  ticketId!: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  guidance?: string;
}
