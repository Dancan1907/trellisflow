import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsOptional,
  Min,
  Length,
  IsInt,
} from 'class-validator';
import { TransactionType, RecurringFrequency } from '@prisma/client';

export class CreateRecurringRuleDto {
  @ApiProperty({ enum: TransactionType, example: 'EXPENSE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'The account this rule applies to' })
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({ description: 'The category of the transaction' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'The destination account (required if type is TRANSFER)' })
  @IsUUID()
  @IsOptional()
  transferToAccountId?: string;

  @ApiProperty({ example: 'Monthly Rent' })
  @IsString()
  @Length(1, 200)
  description: string;

  @ApiProperty({ enum: RecurringFrequency, example: 'MONTHLY' })
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Every 1 month, every 2 weeks, etc.',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({ example: 1, description: 'Day of the month (1-31) for monthly rules' })
  @IsInt()
  @Min(1)
  @IsOptional()
  dayOfMonth?: number;

  @ApiPropertyOptional({ example: 1, description: 'Day of the week (0-6) for weekly rules' })
  @IsInt()
  @Min(0)
  @IsOptional()
  dayOfWeek?: number;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2027-11-01' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
