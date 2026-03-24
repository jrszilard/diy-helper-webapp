import { cn } from '@/lib/utils';

type ProgressBarVariant = 'default' | 'primary' | 'success' | 'warning';
type ProgressBarSize    = 'sm' | 'md' | 'lg';

const variantTrack: Record<ProgressBarVariant, string> = {
  default: 'bg-[var(--earth-tan)]',
  primary: 'bg-[var(--earth-tan)]',
  success: 'bg-[var(--earth-tan)]',
  warning: 'bg-amber-100',
};

const variantFill: Record<ProgressBarVariant, string> = {
  default: 'bg-[var(--earth-brown)]',
  primary: 'bg-[var(--terracotta)]',
  success: 'bg-[var(--forest-green)]',
  warning: 'bg-amber-500',
};

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

interface ProgressBarProps {
  value: number;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  variant = 'primary',
  size = 'md',
  label,
  showValue,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-[var(--earth-brown)]">{label}</span>}
          {showValue && <span className="text-xs font-medium text-[var(--earth-brown-dark)]">{clamped}%</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full overflow-hidden', sizeClasses[size], variantTrack[variant])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', variantFill[variant])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
