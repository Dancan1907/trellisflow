import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsOptional,
  Length,
  Min,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: 'EXPENSE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 1500.5, description: 'Amount in the account currency' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-10-20', description: 'Date of the transaction (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Bought groceries at Naivas' })
  @IsString()
  @Length(1, 200)
  description: string;

  @ApiProperty({ description: 'The UUID of the account' })
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({
    description: 'The UUID of the category (required for INCOME and EXPENSE)',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Weekly shopping' })
  @IsString()
  @IsOptional()
  notes?: string;
}
