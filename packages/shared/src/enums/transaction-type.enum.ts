/**
 * The three kinds of money movement in TrellisFlow.
 * Transfers move money within the user's world (no net worth effect).
 * Income and expense change net worth.
 */
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}
