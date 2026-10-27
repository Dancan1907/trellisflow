import { cn } from '@/lib/utils/utils';

interface ProgressBarProps {
  percentage: number;
  className?: string;
}

export function ProgressBar({ percentage, className }: ProgressBarProps) {
  // Determine color based on percentage
  let colorClass = 'bg-status-positive';
  if (percentage >= 100) colorClass = 'bg-status-negative';
  else if (percentage >= 80) colorClass = 'bg-status-warning';

  // Cap the visual fill at 100% so it doesn't overflow the container
  const fillWidth = Math.min(percentage, 100);

  return (
    <div className={cn('w-full h-2 bg-bg-tertiary rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-all duration-500 ease-out', colorClass)}
        style={{ width: `${fillWidth}%` }}
      />
    </div>
  );
}
