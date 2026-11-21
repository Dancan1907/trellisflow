'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { useGoalHistory } from '@/lib/hooks/use-goals';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  goalId: string;
  currency: string;
  targetDate: string | null;
}

interface Row {
  t: number;
  amount?: number;
  projected?: number;
}

const toT = (iso: string) => new Date(iso).getTime();
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: '2-digit' });

export function GoalProgressChart({ goalId, currency, targetDate }: Props) {
  const { data, isLoading } = useGoalHistory(goalId);

  const { rows, domain } = useMemo(() => {
    if (!data) return { rows: [] as Row[], domain: [0, 1] as [number, number] };

    const h = data.history;
    const step = Math.max(1, Math.floor(h.length / 30));
    const sampled = h.filter((_, i) => i % step === 0 || i === h.length - 1);
    const out: Row[] = sampled.map((p) => ({ t: toT(p.date), amount: p.amount }));

    const proj = data.projection;
    if (proj.projectedCompletionDate && proj.status !== 'ACHIEVED') {
      out[out.length - 1]!.projected = data.currentAmount; // dashed line starts here
      out.push({ t: toT(proj.projectedCompletionDate), projected: data.targetAmount });
    }

    const min = out[0]!.t;
    const max = Math.max(out[out.length - 1]!.t, targetDate ? toT(targetDate) : 0);
    return { rows: out, domain: [min, max] as [number, number] };
  }, [data, targetDate]);

  if (isLoading) return <Skeleton className="h-48 w-full mt-4" />;

  if (!data || data.history.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-fg-secondary">
        Not enough history to plot yet.
      </div>
    );
  }

  const money = (v: number) =>
    `${currency} ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={domain}
            tickFormatter={(t) => fmtDate(Number(t))}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => Number(v).toLocaleString()}
            tickLine={false}
            axisLine={false}
            width={60}
            domain={[0, Math.max(data.targetAmount, data.currentAmount)]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            labelFormatter={(t) => fmtDate(Number(t))}
            formatter={(value, name) => [
              money(Number(value ?? 0)),
              name === 'projected' ? 'Projected' : 'Saved',
            ]}
          />

          {[0.25, 0.5, 0.75].map((m) => (
            <ReferenceLine
              key={m}
              y={data.targetAmount * m}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="2 4"
            />
          ))}

          <ReferenceLine
            y={data.targetAmount}
            stroke="#10b981"
            strokeDasharray="4 4"
            label={{ value: 'Target', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }}
          />

          {targetDate && (
            <ReferenceLine
              x={toT(targetDate)}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: 'Deadline',
                position: 'insideTopRight',
                fill: '#f59e0b',
                fontSize: 10,
              }}
            />
          )}

          <Line
            type="stepAfter"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="projected"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-fg-tertiary text-center mt-1">
        {data.mode === 'linked'
          ? 'Based on your linked account activity. Dashed line = projection at your recent pace.'
          : 'Based on your recorded contributions. Dashed line = projection at your recent pace.'}
      </p>
    </div>
  );
}
