import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'ARCHIVE' | 'UNARCHIVE';

export interface AuditLogEntry {
  id: string;
  userId: string;
  actorType: 'USER' | 'SYSTEM' | 'EXTERNAL_API';
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface AuditQuery {
  limit?: number;
  offset?: number;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
}

export interface AuditPage {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

function toQueryString(q: AuditQuery): string {
  const params = new URLSearchParams();
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.entityId) params.set('entityId', q.entityId);
  if (q.action) params.set('action', q.action);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useAuditLog(query: AuditQuery = {}) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => apiFetch<AuditPage>(`/api/audit${toQueryString(query)}`),
  });
}

/** Scoped to a single entity — used by <EntityHistory/>. */
export function useEntityHistory(entityType: string, entityId: string, enabled = true) {
  return useAuditLog({ entityType, entityId, limit: 100 });
}
