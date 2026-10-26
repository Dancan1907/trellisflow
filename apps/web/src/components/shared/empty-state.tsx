import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border-subtle rounded-lg bg-bg-secondary/50',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
        <Icon size={24} className="text-fg-tertiary" />
      </div>
      <h3 className="text-lg font-medium text-fg-primary mb-1">{title}</h3>
      <p className="text-sm text-fg-secondary max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
