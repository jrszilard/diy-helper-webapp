import { ElementType } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'    // slate-blue tint  — categories, specialties
  | 'primary'    // terracotta tint  — specialist tier, featured
  | 'success'    // forest-green tint — selected, answered
  | 'neutral'    // earth-tan         — pool, standard
  | 'warning'    // amber             — complex tier
  | 'purple'     // purple            — direct mode, waiting
  | 'solid';     // slate-blue solid  — Pro, paid tier

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-[var(--slate-blue)]/10 text-[var(--slate-blue)]',
  primary:  'bg-[var(--terracotta)]/10 text-[var(--terracotta)]',
  success:  'bg-[var(--forest-green)]/10 text-[var(--forest-green)]',
  neutral:  'bg-[var(--earth-tan)] text-[var(--earth-brown)]',
  warning:  'bg-amber-100 text-amber-700',
  purple:   'bg-[#F3EDF5] text-[var(--status-waiting)]',
  solid:    'bg-[var(--slate-blue)] text-white',
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
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        variantClasses[variant],
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  );
}
