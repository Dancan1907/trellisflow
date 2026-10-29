import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'ZAR', 'UGX', 'TZS'] as const;
const PERSONAS = ['EMPLOYEE', 'INVESTOR', 'BUSINESS_OWNER', 'MULTI_BUSINESS_OWNER'] as const;

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ enum: CURRENCIES })
  @IsOptional()
  @IsIn(CURRENCIES)
  reportingCurrency?: string;

  @ApiPropertyOptional({ enum: PERSONAS })
  @IsOptional()
  @IsIn(PERSONAS)
  personaHint?: string;
}
