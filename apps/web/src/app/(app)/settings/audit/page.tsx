'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Filter, X } from 'lucide-react';
import { useAuditLog, type AuditLogEntry, type AuditAction } from '@/lib/hooks/use-audit';
import { AuditTable } from '@/components/features/audit/audit-table';
import { AuditDetailDrawer } from '@/components/features/audit/audit-detail-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

const ENTITY_TYPES = [
  'Transaction',
  'Account',
  'Container',
  'Category',
  'Budget',
  'SavingsGoal',
  'Holding',
  'InvestmentEvent',
  'Business',
  'DebtPayoffPlan',
] as const;

const ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE', 'UNARCHIVE'];

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      entityType: entityType || undefined,
      action: (action || undefined) as AuditAction | undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }),
    [entityType, action, from, to, offset],
  );

  const { data, isLoading, isFetching } = useAuditLog(query);

  const hasFilters = !!entityType || !!action || !!from || !!to;
  const clearFilters = () => {
    setEntityType('');
    setAction('');
    setFrom('');
    setTo('');
    setOffset(0);
  };

  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary mb-1">Audit Log</h1>
        <p className="text-fg-secondary text-sm">
          Every create, update, delete, and archive across your account.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-fg-secondary" />
          <p className="text-sm font-medium text-fg-primary">Filters</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-fg-secondary">
            Entity type
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setOffset(0);
              }}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border-subtle text-sm text-fg-primary"
            >
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-fg-secondary">
            Action
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value as AuditAction | '');
                setOffset(0);
              }}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border-subtle text-sm text-fg-primary"
            >
              <option value="">All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-fg-secondary">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setOffset(0);
              }}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border-subtle text-sm text-fg-primary"
            />
          </label>

          <label className="text-xs text-fg-secondary">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setOffset(0);
              }}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border-subtle text-sm text-fg-primary"
            />
          </label>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit entries"
          description={
            hasFilters
              ? 'No entries match the current filters.'
              : 'Actions on your account will start appearing here.'
          }
        />
      ) : (
        <>
          <AuditTable entries={data.items} onSelect={setSelected} />

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-fg-secondary">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              {isFetching && ' · loading…'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="px-3 py-1.5 rounded-md border border-border-subtle text-fg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-fg-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="px-3 py-1.5 rounded-md border border-border-subtle text-fg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <AuditDetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
