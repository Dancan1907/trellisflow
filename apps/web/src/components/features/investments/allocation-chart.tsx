'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAllocation } from '@/lib/hooks/use-allocation';
import { Skeleton } from '@/components/ui/skeleton';

// Match your design system colors
const COLORS = [
  '#3b82f6', // blue (accent)
  '#10b981', // green (positive)
  '#f59e0b', // amber
  '#ef4444', // red (negative)
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6b7280', // gray
];

export function AllocationChart() {
  const { data, isLoading } = useAllocation();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (!data || data.breakdown.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-bg-secondary border border-border-subtle rounded-lg">
        <p className="text-fg-secondary text-sm">No holdings to display yet.</p>
      </div>
    );
  }

  // Format the data for Recharts
  const chartData = data.breakdown.map((item) => ({
    name: item.assetClass.replace(/_/g, ' '),
    value: item.value,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <h3 className="text-sm font-medium text-fg-secondary mb-6">Allocation by Asset Class</h3>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b', // bg-bg-tertiary (approx)
                borderColor: '#334155', // border-border-subtle
                borderRadius: '6px',
                color: '#f8fafc', // text-fg-primary
                fontSize: '12px',
              }}
              itemStyle={{ color: '#f8fafc' }}
              formatter={(value: number, name: string, props: any) => {
                const formatted = new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: data.currency,
                  maximumFractionDigits: 0,
                }).format(value);
                return [formatted, name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-fg-secondary truncate">{item.name}</span>
            <span className="text-fg-primary font-medium ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
