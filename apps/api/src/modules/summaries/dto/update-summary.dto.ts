import { ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * Corrections are append-only: the previous values are snapshotted into
 * `summary_versions` before this update is applied.
 */
export class UpdateSummaryDto {
  @ApiPropertyOptional({ example: '2026-11-18' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: SummaryPeriod })
  @IsOptional()
  @IsEnum(SummaryPeriod)
  period?: SummaryPeriod;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ example: 'Farm #47' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  unit?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  income?: number;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expenses?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transfersIn?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transfersOut?: number;

  @ApiPropertyOptional({ example: 12500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashBalance?: number;

  @ApiPropertyOptional({ example: 48000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  assetsValue?: number;

  @ApiPropertyOptional({ example: 6000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  liabilitiesValue?: number;

  @ApiPropertyOptional({ example: 'KES' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Corrected harvest total' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'Miscounted the harvest by 1,000' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
