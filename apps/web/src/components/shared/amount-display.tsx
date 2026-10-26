import { cn } from '@/lib/utils/utils';

interface AmountDisplayProps {
  value: number | string;
  currency?: string;
  showSign?: boolean;
  colorize?: boolean;
  className?: string;
}

export function AmountDisplay({
  value,
  currency = 'KES',
  showSign = false,
  colorize = false,
  className,
}: AmountDisplayProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  // Format with commas and 2 decimals
  const formatted = Math.abs(numericValue).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isNegative = numericValue < 0;
  const isPositive = numericValue > 0;

  // Determine sign and color
  let prefix = '';
  if (showSign) {
    if (isNegative) prefix = '−';
    if (isPositive) prefix = '+';
  } else if (isNegative) {
    prefix = '−';
  }

  // Determine color class
  let colorClass = 'text-fg-primary';
  if (colorize) {
    if (isNegative) colorClass = 'text-status-negative';
    if (isPositive) colorClass = 'text-status-positive';
  }

  return (
    <span className={cn('font-mono tabular-nums tracking-tight', colorClass, className)}>
      {prefix}
      {currency} {formatted}
    </span>
  );
}
