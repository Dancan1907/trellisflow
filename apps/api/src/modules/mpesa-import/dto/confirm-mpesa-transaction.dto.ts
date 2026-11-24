import { CreateTransactionDto } from '../../transactions/dto/create-transaction.dto';

/**
 * Confirmation deliberately reuses the existing transaction DTO so account,
 * category, date, amount, description, and M-Pesa reference validation stay consistent.
 */
export class ConfirmMpesaTransactionDto extends CreateTransactionDto {}
