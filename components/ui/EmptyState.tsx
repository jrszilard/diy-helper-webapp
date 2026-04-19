import { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ElementType;
  iconSize?: number;
  iconClassName?: string;
  title?: string;
  description: string;
  subtext?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  variant?: 'dark' | 'light';
}

export default function EmptyState({
  icon: Icon,
  iconSize,
  iconClassName,
  title,
  description,
  subtext,
  action,
  size = 'md',
  className,
  variant: _variant,
}: EmptyStateProps) {
  const resolvedIconSize = iconSize ?? (size === 'sm' ? 32 : 48);

  return (
    <div className={cn('text-center', className)}>
      {Icon && (
        <Icon
          size={resolvedIconSize}
          className={cn('mx-auto text-white/20', size === 'sm' ? 'mb-3' : 'mb-4', iconClassName)}
        />
      )}
      {title && (
        <p className="font-medium mb-1 text-white/70">{title}</p>
      )}
      <p className="text-sm text-white/50">{description}</p>
      {subtext && (
        <p className="text-xs mt-1 text-white/30">{subtext}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
