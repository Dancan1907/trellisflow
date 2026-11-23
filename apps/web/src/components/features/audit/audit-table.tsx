'use client';

import type { AuditLogEntry } from '@/lib/hooks/use-audit';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-status-positive/10 text-status-positive border-status-positive/30',
  UPDATE: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
  DELETE: 'bg-status-negative/10 text-status-negative border-status-negative/30',
  RESTORE: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
  ARCHIVE: 'bg-fg-tertiary/10 text-fg-secondary border-border-subtle',
  UNARCHIVE: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
};

interface Props {
  entries: AuditLogEntry[];
  onSelect: (entry: AuditLogEntry) => void;
}

export function AuditTable({ entries, onSelect }: Props) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-bg-tertiary/50 text-fg-secondary text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Changed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="hover:bg-bg-tertiary/20 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString('en-KE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                    ACTION_COLORS[entry.action] ?? ''
                  }`}
                >
                  {entry.action}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="text-fg-primary">{entry.entityType}</p>
                <p className="text-xs text-fg-tertiary font-mono">{entry.entityId.slice(0, 8)}…</p>
              </td>
              <td className="px-4 py-3 text-fg-secondary">
                {entry.changedFields.length === 0 ? (
                  <span className="text-fg-tertiary">—</span>
                ) : (
                  <span className="text-xs">
                    {entry.changedFields.slice(0, 3).join(', ')}
                    {entry.changedFields.length > 3 && ` +${entry.changedFields.length - 3}`}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
