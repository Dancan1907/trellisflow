'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tag, Edit, Trash2 } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/hooks/use-categories';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const pathname = usePathname();

  const [name, setName] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await createCategory.mutateAsync({ name, type });
      showToast('success', 'Category created');
      setName('');
    } catch (err) {
      showToast('error', 'Failed to create category', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, name: editName });
      showToast('success', 'Category updated');
      setEditingId(null);
    } catch (err) {
      showToast('error', 'Failed to update', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Past transactions will become Uncategorized.')) return;
    try {
      await deleteCategory.mutateAsync(id);
      showToast('success', 'Category deleted');
    } catch (err) {
      showToast('error', 'Failed to delete', err instanceof Error ? err.message : 'Error');
    }
  };

  const openEditModal = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const renderCategoryList = (list: any[]) => (
    <div className="space-y-2">
      {list.map((cat) => (
        <div
          key={cat.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-bg-tertiary group"
        >
          <div className="flex items-center gap-3">
            <Tag size={16} className="text-fg-tertiary" />
            <span className="text-sm text-fg-primary">{cat.name}</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openEditModal(cat.id, cat.name)}
              className="text-fg-tertiary hover:text-accent-primary"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="text-fg-tertiary hover:text-status-negative"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

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

      <div className="flex items-center gap-1 border-b border-border-subtle">
        <Link
          href="/personal"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Accounts
        </Link>
        <Link
          href="/personal/categories"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/categories' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Categories
        </Link>
        <Link
          href="/personal/recurring"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/recurring' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Recurring
        </Link>
      </div>

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

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <h2 className="text-sm font-medium text-status-negative uppercase tracking-wider mb-4">
              Expenses
            </h2>
            {renderCategoryList(expenseCategories)}
          </div>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <h2 className="text-sm font-medium text-status-positive uppercase tracking-wider mb-4">
              Income
            </h2>
            {renderCategoryList(incomeCategories)}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add a category above to get started."
        />
      )}

      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Category">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Category Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-4 py-2 text-sm text-fg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
