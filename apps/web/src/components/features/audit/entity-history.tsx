'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { useEntityHistory, type AuditLogEntry } from '@/lib/hooks/use-audit';
import { AuditTable } from './audit-table';
import { AuditDetailDrawer } from './audit-detail-drawer';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  entityType: string;
  entityId: string;
  title?: string;
}

export function EntityHistory({ entityType, entityId, title = 'History' }: Props) {
  const { data, isLoading } = useEntityHistory(entityType, entityId);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={18} className="text-accent-primary" />
        <h2 className="text-lg font-medium text-fg-primary">{title}</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 text-sm text-fg-secondary">
          No history recorded for this entity yet.
        </div>
      ) : (
        <AuditTable entries={data.items} onSelect={setSelected} />
      )}

      <AuditDetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
