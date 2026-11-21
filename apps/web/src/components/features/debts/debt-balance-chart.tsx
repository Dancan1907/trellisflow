'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { SimulationResult } from '@/lib/hooks/use-debts';

interface Props {
  simulation: SimulationResult;
  currency: string;
}

export function DebtBalanceChart({ simulation, currency }: Props) {
  const data = simulation.history.map((h) => ({
    month: `M${h.month}`,
    balance: h.totalBalance,
  }));

  // Sample down if too many points
  const step = Math.max(1, Math.floor(data.length / 40));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={sampled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickFormatter={(v) => `${currency} ${(Number(v) / 1000).toFixed(0)}k`}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value) => [`${currency} ${Number(value ?? 0).toLocaleString()}`, 'Remaining']}
          labelFormatter={(label) => `Month ${String(label).replace('M', '')}`}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
