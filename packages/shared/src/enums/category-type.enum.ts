/**
 * Categories only apply to income and expense transactions.
 * Transfers don't need a category — they just move money.
 */
export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}
