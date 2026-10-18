/**
 * Suggested account types. Users may add custom types, but these
 * are the built-in suggestions shown in the UI.
 */
export enum AccountType {
  // Asset types
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CASH = 'cash',
  MOBILE_MONEY = 'mobile_money',
  PREPAID_CARD = 'prepaid_card',
  INVESTMENT_ACCOUNT = 'investment_account',

  // Liability types
  CREDIT_CARD = 'credit_card',
  PERSONAL_LOAN = 'personal_loan',
  MORTGAGE = 'mortgage',
  OVERDRAFT = 'overdraft',

  // Escape hatch
  CUSTOM = 'custom',
}
