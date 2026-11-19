import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, Length, IsDateString, IsIn } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ example: "Danca's Shop" })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    enum: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'],
    default: 'INTERNAL_BUSINESS',
    description: 'Internal businesses track accounts/transactions; external ones track summaries',
  })
  @IsOptional()
  @IsIn(['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'])
  type?: 'INTERNAL_BUSINESS' | 'EXTERNAL_BUSINESS';

  @ApiProperty({ enum: BusinessType, example: 'RETAIL' })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: 'Corner shop in Westlands' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
