import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { AssetClass, PricingMode } from '@prisma/client';

export class CreateHoldingDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the investment container this holding belongs to',
  })
  @IsUUID()
  containerId!: string;

  @ApiProperty({
    example: 'Safaricom Stock',
    description: 'The name of the holding',
  })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ enum: AssetClass, example: 'STOCK' })
  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @ApiPropertyOptional({ example: 'SCOM', description: 'Ticker symbol (optional)' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiProperty({ example: 100, description: 'Number of units held (must be > 0)' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 15000, description: 'Total cost basis in reporting currency' })
  @IsNumber()
  @IsPositive()
  costBasisTotal!: number;

  @ApiProperty({ example: 18000, description: 'Current market value total' })
  @IsNumber()
  @IsPositive()
  currentValueTotal!: number;

  @ApiProperty({ example: 'KES', description: 'ISO 4217 currency code' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Date the asset was acquired' })
  @IsOptional()
  @IsDateString()
  acquiredDate?: string;

  @ApiPropertyOptional({ enum: PricingMode, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(PricingMode)
  pricingMode?: PricingMode;

  @ApiPropertyOptional({ description: 'Free-form notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
