import { AuditLogEntry } from '../hooks/use-audit';

/**
 * Converts a raw audit log entry into a human-readable summary sentence.
 */
export function summarizeAuditEntry(entry: AuditLogEntry): string {
  const data = entry.after || entry.before;
  if (!data) return 'Unknown change';

  // Format the entity name (e.g., 'SavingsGoal' -> 'Savings Goal')
  const entityName = entry.entityType.replace(/([A-Z])/g, ' $1').trim();

  // Safely extract fields as strings/numbers
  const identifier = (data.description || data.name || data.title || '') as string;
  const rawAmount = data.amount;
  const currency = typeof data.currency === 'string' ? data.currency : 'KES';
  const type = typeof data.type === 'string' ? data.type.toLowerCase() : '';

  const amount = rawAmount
    ? new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(Number(rawAmount))
    : '';

  const parts: string[] = [];

  if (entry.action === 'CREATE') {
    parts.push('Added');
    if (amount) parts.push(amount);
    if (type) parts.push(type);
    parts.push(entityName.toLowerCase());
  } else if (entry.action === 'DELETE') {
    parts.push('Deleted');
    if (amount) parts.push(amount);
    parts.push(entityName.toLowerCase());
  } else if (entry.action === 'UPDATE') {
    parts.push(`Updated ${entityName.toLowerCase()}`);
    if (identifier) parts.push(`"${identifier}"`);
  } else {
    parts.push(`${entry.action} ${entityName.toLowerCase()}`);
  }

  let sentence = parts.join(' ');

  // Append the identifier for create/delete if we have it
  if (identifier && entry.action !== 'UPDATE') {
    sentence += ` ("${identifier}")`;
  }

  return sentence;
}

export interface FormattedChange {
  field: string;
  before: string;
  after: string;
}

/**
 * Compares the 'before' and 'after' states and returns a list of human-readable changes.
 */
export function getFormattedChanges(entry: AuditLogEntry): FormattedChange[] {
  if (entry.action !== 'UPDATE' || !entry.before || !entry.after) {
    return [];
  }

  const changes: FormattedChange[] = [];

  for (const key of entry.changedFields) {
    const beforeVal = formatValue(key, entry.before[key]);
    const afterVal = formatValue(key, entry.after[key]);

    // Skip internal IDs or timestamps that normal users don't care about
    if (['id', 'userId', 'containerId', 'createdAt', 'updatedAt', 'deletedAt'].includes(key)) {
      continue;
    }

    changes.push({
      field: key.replace(/([A-Z])/g, ' $1').trim(), // camelCase to Title Case
      before: beforeVal,
      after: afterVal,
    });
  }

  return changes;
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';

  // Format dates nicely
  if (
    typeof val === 'string' &&
    (key.toLowerCase().includes('date') || key === 'startDate' || key === 'endDate')
  ) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  // Format booleans
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';

  // Format numbers (add commas)
  if (typeof val === 'number') return new Intl.NumberFormat().format(val);

  return String(val);
}
