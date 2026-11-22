'use client';

import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/hooks/use-audit';
import { showToast } from '@/components/ui/toast';

interface Props {
  entry: AuditLogEntry | null;
  onClose: () => void;
}

export function AuditDetailDrawer({ entry, onClose }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!entry) return null;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(entry.entityId);
      showToast('success', 'Entity ID copied');
    } catch {
      showToast('error', 'Could not copy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-secondary border-l border-border-subtle w-full max-w-lg h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">Audit Detail</h2>
            <p className="text-xs text-fg-secondary mt-0.5">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <section>
            <h3 className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-2">
              Metadata
            </h3>
            <div className="space-y-1 text-sm">
              <Row label="Action" value={entry.action} />
              <Row label="Entity type" value={entry.entityType} />
              <Row
                label="Entity ID"
                value={
                  <button
                    onClick={copyId}
                    className="inline-flex items-center gap-1 text-accent-primary hover:text-accent-hover font-mono text-xs"
                  >
                    {entry.entityId.slice(0, 8)}… <Copy size={12} />
                  </button>
                }
              />
              <Row
                label="Actor"
                value={`${entry.actorType}${entry.actorId ? ` · ${entry.actorId.slice(0, 8)}…` : ''}`}
              />
              {entry.ipAddress && <Row label="IP" value={entry.ipAddress} />}
              {entry.userAgent && (
                <Row
                  label="User-Agent"
                  value={<span className="text-xs">{entry.userAgent}</span>}
                />
              )}
            </div>
          </section>

          {/* Diff / raw */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
                {showRaw ? 'Raw JSON' : 'Field Changes'}
              </h3>
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs text-accent-primary hover:text-accent-hover"
              >
                {showRaw ? 'Show diff' : 'Show raw JSON'}
              </button>
            </div>

            {showRaw ? (
              <div className="space-y-3">
                <RawBlock label="Before" value={entry.before} />
                <RawBlock label="After" value={entry.after} />
              </div>
            ) : entry.changedFields.length === 0 ? (
              <p className="text-sm text-fg-secondary">No field changes recorded.</p>
            ) : (
              <div className="space-y-2">
                {entry.changedFields.map((field) => {
                  const before = getPath(entry.before, field);
                  const after = getPath(entry.after, field);
                  return (
                    <div
                      key={field}
                      className="rounded-md border border-border-subtle bg-bg-tertiary/40 p-3 text-sm"
                    >
                      <p className="font-mono text-xs text-fg-secondary mb-1">{field}</p>
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        <div>
                          <p className="text-fg-tertiary mb-0.5">before</p>
                          <p className="text-status-negative break-all">{fmt(before)}</p>
                        </div>
                        <div>
                          <p className="text-fg-tertiary mb-0.5">after</p>
                          <p className="text-status-positive break-all">{fmt(after)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-fg-tertiary w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-fg-primary break-all">{value}</span>
    </div>
  );
}

function RawBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs text-fg-tertiary mb-1">{label}</p>
      <pre className="text-xs bg-bg-tertiary border border-border-subtle rounded-md p-3 overflow-x-auto">
        {value ? JSON.stringify(value, null, 2) : 'null'}
      </pre>
    </div>
  );
}

function getPath(obj: Record<string, unknown> | null, path: string): unknown {
  if (!obj) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function fmt(v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
