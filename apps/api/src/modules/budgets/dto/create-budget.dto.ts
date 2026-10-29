import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsOptional,
  Min,
  Length,
  IsBoolean,
} from 'class-validator';
import { BudgetPeriod } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'The container this budget belongs to (e.g., Personal or a Business)',
  })
  @IsUUID()
  containerId: string;

  @ApiProperty({ description: 'The category being budgeted (e.g., Groceries)' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 15000, description: 'The target amount for the period' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ enum: BudgetPeriod, example: 'MONTHLY' })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Only required for custom periods' })
  @IsString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Only required for custom periods' })
  @IsString()
  @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional({ example: false, description: 'Should unused money carry forward?' })
  @IsBoolean()
  @IsOptional()
  rollover?: boolean;
}
