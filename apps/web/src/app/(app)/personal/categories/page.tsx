'use client';

import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { useCategories, useCreateCategory } from '@/lib/hooks/use-categories';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const [name, setName] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await createCategory.mutateAsync({ name, type });
      showToast('success', 'Category created', `${name} has been added.`);
      setName('');
    } catch (err) {
      showToast('error', 'Failed to create category', err instanceof Error ? err.message : 'Error');
    }
  };

  const incomeCategories = categories?.filter((c) => c.type === 'INCOME') || [];
  const expenseCategories = categories?.filter((c) => c.type === 'EXPENSE') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Categories</h1>
          <p className="text-fg-secondary text-sm">Organize your income and expenses.</p>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors"
            required
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
            className="h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
          <button
            type="submit"
            disabled={createCategory.isPending}
            className="h-10 px-4 rounded-md bg-accent-primary text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expense Categories */}
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <h2 className="text-sm font-medium text-status-negative uppercase tracking-wider mb-4">
              Expenses
            </h2>
            <div className="space-y-2">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-tertiary"
                >
                  <Tag size={16} className="text-fg-tertiary" />
                  <span className="text-sm text-fg-primary">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories */}
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <h2 className="text-sm font-medium text-status-positive uppercase tracking-wider mb-4">
              Income
            </h2>
            <div className="space-y-2">
              {incomeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-tertiary"
                >
                  <Tag size={16} className="text-fg-tertiary" />
                  <span className="text-sm text-fg-primary">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add a category above to get started."
        />
      )}
    </div>
  );
}
