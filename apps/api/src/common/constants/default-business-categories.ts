export const DEFAULT_BUSINESS_CATEGORIES = [
  // Income
  { name: 'Sales', type: 'INCOME', icon: 'shopping-cart' },
  { name: 'Services', type: 'INCOME', icon: 'briefcase' },
  { name: 'Grants', type: 'INCOME', icon: 'gift' },
  { name: 'Interest', type: 'INCOME', icon: 'percent' },
  { name: 'Other Income', type: 'INCOME', icon: 'plus-circle' },

  // Expense
  { name: 'Rent', type: 'EXPENSE', icon: 'home' },
  { name: 'Utilities', type: 'EXPENSE', icon: 'zap' },
  { name: 'Salaries', type: 'EXPENSE', icon: 'users' },
  { name: 'Inventory', type: 'EXPENSE', icon: 'package' },
  { name: 'Marketing', type: 'EXPENSE', icon: 'megaphone' },
  { name: 'Transport', type: 'EXPENSE', icon: 'truck' },
  { name: 'Supplies', type: 'EXPENSE', icon: 'clipboard' },
  { name: 'Taxes', type: 'EXPENSE', icon: 'file-text' },
  { name: 'Other Expense', type: 'EXPENSE', icon: 'more-horizontal' },
] as const;
