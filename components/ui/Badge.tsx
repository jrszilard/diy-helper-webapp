import { ElementType } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'neutral'
  | 'warning'
  | 'purple'
  | 'solid';

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-[var(--slate-blue)]/10 text-[var(--slate-blue)] border border-[var(--slate-blue)]/20',
  primary:  'bg-[rgba(184,89,59,0.18)] text-[#E89580] border border-[rgba(184,89,59,0.35)]',
  success:  'bg-[rgba(92,122,64,0.18)] text-[#A8C28A] border border-[rgba(92,122,64,0.4)]',
  neutral:  'bg-[rgba(174,168,163,0.12)] text-[var(--earth-sand)] border border-[rgba(174,168,163,0.18)]',
  warning:  'bg-[rgba(212,165,116,0.18)] text-[var(--gold)] border border-[rgba(212,165,116,0.35)]',
  purple:   'bg-[var(--status-waiting-bg)] text-[var(--status-waiting)] border border-[rgba(140,108,184,0.35)]',
  solid:    'bg-[var(--foreground)] text-[var(--background)] border border-transparent',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: ElementType;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  icon: Icon,
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-none font-medium',
        size === 'sm'
          ? 'text-[11px] px-[7px] py-[2px]'
          : 'text-[12px] px-[9px] py-[4px]',
        variantClasses[variant],
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  );
}
