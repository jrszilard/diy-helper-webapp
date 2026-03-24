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
}: EmptyStateProps) {
  const resolvedIconSize = iconSize ?? (size === 'sm' ? 32 : 48);

  return (
    <div className={cn('text-center', className)}>
      {Icon && (
        <Icon
          size={resolvedIconSize}
          className={cn('mx-auto text-earth-sand', size === 'sm' ? 'mb-3' : 'mb-4', iconClassName)}
        />
      )}
      {title && (
        <p className="font-medium text-[var(--earth-brown-dark)] mb-1">{title}</p>
      )}
      <p className="text-sm text-earth-brown">{description}</p>
      {subtext && (
        <p className="text-xs text-earth-brown-light mt-1">{subtext}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
