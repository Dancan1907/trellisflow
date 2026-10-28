'use client';

import { useState } from 'react';
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  useAuditLog,
  type AuditAction,
  type AuditLogEntry,
  type AuditQuery,
} from '@/lib/hooks/use-audit';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

const ENTITY_TYPES = [
  'All',
  'Transaction',
  'Account',
  'Category',
  'Budget',
  'SavingsGoal',
  'Container',
  'RecurringRule',
];

const ACTIONS: Array<AuditAction | 'All'> = [
  'All',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'RESTORE',
  'UNARCHIVE',
];

const LIMITS = [25, 50, 100, 200];

export default function AuditDataPage() {
  const [entityType, setEntityType] = useState<string>('All');
  const [action, setAction] = useState<AuditAction | 'All'>('All');
  const [limit, setLimit] = useState<number>(50);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const query: AuditQuery = {
    limit,
    entityType: entityType === 'All' ? undefined : entityType,
    action: action === 'All' ? undefined : action,
  };

  const { data: entries, isLoading } = useAuditLog(query);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ============================== Header ============================== */}
      <div>
        <h2 className="text-lg font-medium text-fg-primary">Data & Audit</h2>
        <p className="text-xs text-fg-secondary mt-1">
          A record of every change made to your financial data.
        </p>
      </div>

      {/* ============================== Filter bar ============================== */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-bg-tertiary/40 border border-border-subtle rounded-lg">
        <div className="flex items-center gap-2 text-xs text-fg-secondary">
          <Filter size={14} />
          <span>Filter</span>
        </div>

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-9 px-3 rounded-md border border-border-subtle bg-bg-primary text-sm text-fg-primary focus:outline-none focus:border-accent-primary"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All entities' : t}
            </option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | 'All')}
          className="h-9 px-3 rounded-md border border-border-subtle bg-bg-primary text-sm text-fg-primary focus:outline-none focus:border-accent-primary"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'All' ? 'All actions' : a}
            </option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-9 px-3 rounded-md border border-border-subtle bg-bg-primary text-sm text-fg-primary focus:outline-none focus:border-accent-primary"
        >
          {LIMITS.map((l) => (
            <option key={l} value={l}>
              {l} rows
            </option>
          ))}
        </select>

        {(entityType !== 'All' || action !== 'All') && (
          <button
            onClick={() => {
              setEntityType('All');
              setAction('All');
            }}
            className="text-xs text-fg-secondary hover:text-accent-primary underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ============================== Log ============================== */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          {entries.map((entry, i) => (
            <AuditRow
              key={entry.id}
              entry={entry}
              isExpanded={expanded.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
              isFirst={i === 0}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Database}
          title="No audit entries"
          description="No changes match these filters. Try widening the date range or clearing filters."
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function AuditRow({
  entry,
  isExpanded,
  onToggle,
  isFirst,
}: {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isFirst: boolean;
}) {
  return (
    <div className={isFirst ? '' : 'border-t border-border-subtle'}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary/40 transition-colors text-left"
      >
        <div className="shrink-0 text-fg-tertiary">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        <ActionBadge action={entry.action} />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg-primary">
            <span className="font-medium">{entry.entityType}</span>
            <span className="text-fg-tertiary font-mono text-xs ml-2">
              {entry.entityId.slice(0, 8)}…
            </span>
          </p>
          {entry.changedFields.length > 0 && (
            <p className="text-xs text-fg-secondary mt-0.5 truncate">
              Changed: {entry.changedFields.join(', ')}
            </p>
          )}
        </div>

        <span className="text-xs text-fg-tertiary shrink-0">{formatRelative(entry.createdAt)}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-bg-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-fg-secondary font-medium mb-2">Before</p>
              <pre className="bg-bg-primary border border-border-subtle rounded-md p-3 overflow-auto max-h-64 text-fg-primary font-mono text-xs">
                {entry.before ? JSON.stringify(entry.before, null, 2) : '—'}
              </pre>
            </div>
            <div>
              <p className="text-fg-secondary font-medium mb-2">After</p>
              <pre className="bg-bg-primary border border-border-subtle rounded-md p-3 overflow-auto max-h-64 text-fg-primary font-mono text-xs">
                {entry.after ? JSON.stringify(entry.after, null, 2) : '—'}
              </pre>
            </div>
          </div>
          {entry.ipAddress && (
            <p className="text-xs text-fg-tertiary mt-3">
              From <span className="font-mono">{entry.ipAddress}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: AuditAction }) {
  const config: Record<AuditAction, { icon: typeof Plus; className: string; label: string }> = {
    CREATE: {
      icon: Plus,
      className: 'bg-status-positive/10 text-status-positive border-status-positive/30',
      label: 'Created',
    },
    UPDATE: {
      icon: Pencil,
      className: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
      label: 'Updated',
    },
    DELETE: {
      icon: Trash2,
      className: 'bg-status-negative/10 text-status-negative border-status-negative/30',
      label: 'Deleted',
    },
    ARCHIVE: {
      icon: Archive,
      className: 'bg-fg-tertiary/10 text-fg-secondary border-border-subtle',
      label: 'Archived',
    },
    RESTORE: {
      icon: RotateCcw,
      className: 'bg-status-positive/10 text-status-positive border-status-positive/30',
      label: 'Restored',
    },
    UNARCHIVE: {
      icon: RotateCcw,
      className: 'bg-status-positive/10 text-status-positive border-status-positive/30',
      label: 'Unarchived',
    },
  };

  const { icon: Icon, className, label } = config[action] ?? config.UPDATE;

  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then) / 1000;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
