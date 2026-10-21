import { CategoryType } from '@prisma/client';

export const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary', type: CategoryType.INCOME, icon: 'briefcase' },
  { name: 'Freelance', type: CategoryType.INCOME, icon: 'laptop' },
  { name: 'Dividends', type: CategoryType.INCOME, icon: 'trending-up' },
  { name: 'Gift', type: CategoryType.INCOME, icon: 'gift' },
  { name: 'Other Income', type: CategoryType.INCOME, icon: 'plus-circle' },

  // Expenses
  { name: 'Housing', type: CategoryType.EXPENSE, icon: 'home' },
  { name: 'Food', type: CategoryType.EXPENSE, icon: 'utensils' },
  { name: 'Transport', type: CategoryType.EXPENSE, icon: 'car' },
  { name: 'Utilities', type: CategoryType.EXPENSE, icon: 'zap' },
  { name: 'Health', type: CategoryType.EXPENSE, icon: 'heart' },
  { name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'tv' },
  { name: 'Shopping', type: CategoryType.EXPENSE, icon: 'shopping-bag' },
  { name: 'Subscriptions', type: CategoryType.EXPENSE, icon: 'repeat' },
  { name: 'Taxes', type: CategoryType.EXPENSE, icon: 'file-text' },
  { name: 'Fees', type: CategoryType.EXPENSE, icon: 'alert-circle' },
  { name: 'Other Expense', type: CategoryType.EXPENSE, icon: 'minus-circle' },
];
