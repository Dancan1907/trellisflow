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
  Min,
} from 'class-validator';
import { InvestmentEventType } from '@prisma/client';

export class CreateInvestmentEventDto {
  @ApiProperty({ description: 'The container this event belongs to' })
  @IsUUID()
  containerId!: string;

  @ApiPropertyOptional({
    description:
      'The holding this event affects. Required for BUY, SELL, DIVIDEND, INTEREST. Null for CONTRIBUTION, WITHDRAWAL.',
  })
  @IsOptional()
  @IsUUID()
  holdingId?: string;

  @ApiProperty({ enum: InvestmentEventType, example: 'BUY' })
  @IsEnum(InvestmentEventType)
  eventType!: InvestmentEventType;

  @ApiPropertyOptional({ example: 100, description: 'Units bought/sold (required for BUY, SELL)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional({ example: 150, description: 'Price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUnit?: number;

  @ApiProperty({ example: 15000, description: 'Total amount in reporting currency' })
  @IsNumber()
  @IsPositive()
  totalAmount!: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ example: '2026-11-14', description: 'When the event occurred' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Free-form notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
