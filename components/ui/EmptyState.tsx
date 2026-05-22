import { ElementType } from 'react';
import { cn } from '@/lib/utils';
import FixBot from '@/components/FixBot';

interface EmptyStateProps {
  icon?: ElementType;
  iconSize?: number;
  iconClassName?: string;
  fixBot?: boolean;
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
    <div className={cn('flex flex-col items-center text-center gap-3', className)}>
      {fixBot ? (
        <FixBot size={size === 'sm' ? 56 : 72} theme={fixBotTheme} floating />
      ) : Icon ? (
        <Icon
          size={resolvedIconSize}
          className={cn('text-white/20', iconClassName)}
        />
      ) : null}
      {title && (
        <p className="font-serif font-normal text-white/80 leading-tight" style={{ fontSize: 18 }}>{title}</p>
      )}
      <p className="font-serif italic text-white/50 max-w-[32ch]" style={{ fontSize: 14 }}>{description}</p>
      {subtext && (
        <p className="font-serif italic text-white/30" style={{ fontSize: 13 }}>{subtext}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
