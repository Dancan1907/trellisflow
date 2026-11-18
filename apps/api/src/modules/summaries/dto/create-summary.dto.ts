import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { SummaryPeriod } from '@prisma/client';

export class CreateSummaryDto {
  @ApiProperty({ example: '2026-11-18', description: 'Summary date (cannot be in the future)' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ enum: SummaryPeriod, default: 'DAY' })
  @IsOptional()
  @IsEnum(SummaryPeriod)
  period?: SummaryPeriod;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Required for CUSTOM periods' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Required for CUSTOM periods' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({
    example: 'Farm #47',
    description: 'Optional unit/location label; does not affect any totals',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  unit?: string;

  @ApiPropertyOptional({ example: 5000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  income?: number;

  @ApiPropertyOptional({ example: 3200, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expenses?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transfersIn?: number;

  @ApiPropertyOptional({ example: 1000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transfersOut?: number;

  @ApiProperty({ example: 12500, description: 'Cash on hand at the summary date' })
  @IsNumber()
  @Min(0)
  cashBalance!: number;

  @ApiProperty({ example: 48000 })
  @IsNumber()
  @Min(0)
  assetsValue!: number;

  @ApiProperty({ example: 6000 })
  @IsNumber()
  @Min(0)
  liabilitiesValue!: number;

  @ApiProperty({ example: 'KES', description: 'Must match the business currency' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({ example: 'Harvest week' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
