/* Strict TypeScript Domain Modeling: Defines clear types (AuditAction, AuditLogEntry, AuditQuery) 
matching the backend audit schema, ensuring complete safety when rendering diffs or history tables.

Dynamic Query Serialization (toQueryString): Programmatically converts query filter options
 (like pagination limits, entity filters, and action types) into a clean URL-encoded query string for HTTP requests.

Query Key Parameterization (TanStack React Query): Automatically caches and re-fetches audit
 data whenever the user changes search filters (since query is embedded directly into
  the queryKey: ['audit', query]).  */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

//Types & Serialization Helper
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
  entityType?: string;
  action?: AuditAction;
}

function toQueryString(q: AuditQuery): string {
  const params = new URLSearchParams();
  if (q.limit) params.set('limit', String(q.limit));
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.action) params.set('action', q.action);
  const s = params.toString();
  return s ? `?${s}` : '';
}

//Fetching Audit Logs
export function useAuditLog(query: AuditQuery = {}) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => apiFetch<AuditLogEntry[]>(`/api/audit${toQueryString(query)}`),
  });
}
