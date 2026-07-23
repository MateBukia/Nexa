import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CheckoutAddressDto {
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @IsString()
  @Length(1, 80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @Length(5, 30)
  phone?: string;

  @IsString()
  @Length(1, 160)
  line1!: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  line2?: string;

  @IsString()
  @Length(1, 100)
  city!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  region?: string;

  @IsString()
  @Length(1, 20)
  postalCode!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  country = 'GE';
}
