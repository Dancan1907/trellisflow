import { Type } from 'class-transformer';
import { IsIn, IsObject, IsUUID, ValidateNested } from 'class-validator';
import { CreateTransactionDto } from '../../transactions/dto/create-transaction.dto';
import { CreateTransferDto } from '../../transactions/dto/create-transfer.dto';

export class ConfirmNaturalLanguageDraftDto {
  @IsUUID()
  idempotencyKey: string;

  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'])
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';

  @IsObject()
  @ValidateNested()
  @Type((options) =>
    (options?.object as ConfirmNaturalLanguageDraftDto)?.type === 'TRANSFER'
      ? CreateTransferDto
      : CreateTransactionDto,
  )
  transaction: CreateTransactionDto | CreateTransferDto;
}
