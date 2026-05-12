import { ElementType } from 'react';
import { cn } from '@/lib/utils';
import FixBot from '@/components/FixBot';

interface EmptyStateProps {
  icon?: ElementType;
  iconSize?: number;
  iconClassName?: string;
  /** Render the Fix the FIX-3000 mascot in place of the icon. */
  fixBot?: boolean;
  /** Theme for the Fix mascot. Defaults to 'dark' since EmptyState is used on dark surfaces. */
  fixBotTheme?: 'light' | 'dark';
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
  fixBot,
  fixBotTheme = 'dark',
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
      {fixBot ? (
        <div className={cn('flex justify-center', size === 'sm' ? 'mb-3' : 'mb-4')}>
          <FixBot size={size === 'sm' ? 56 : 72} theme={fixBotTheme} floating />
        </div>
      ) : Icon && (
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
