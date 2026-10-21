import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, Length } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class CreateBusinessProfileDto {
  @ApiProperty({ enum: BusinessType, example: 'RETAIL' })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiPropertyOptional({ example: 'Custom business type' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  businessTypeCustom?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: 'My first business' })
  @IsString()
  @IsOptional()
  notes?: string;
}
