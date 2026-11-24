import { IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { CreateTransactionDto } from '../../transactions/dto/create-transaction.dto';

/**
 * Confirmation deliberately reuses the existing transaction DTO so account,
 * category, date, amount, and description validation stay consistent.
 */
export class ConfirmMpesaTransactionDto extends CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  mpesaReference?: string;
}
