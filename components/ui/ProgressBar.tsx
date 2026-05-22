import { cn } from '@/lib/utils';

type ProgressBarVariant = 'default' | 'primary' | 'success' | 'warning';
type ProgressBarSize    = 'sm' | 'md' | 'lg';

const variantTrack: Record<ProgressBarVariant, string> = {
  default: 'bg-white/[0.08]',
  primary: 'bg-white/[0.08]',
  success: 'bg-white/[0.08]',
  warning: 'bg-white/[0.08]',
};

const variantFill: Record<ProgressBarVariant, string> = {
  default: 'bg-[var(--earth-brown-light)]',
  primary: 'progress-fill-primary',
  success: 'bg-[var(--forest-green)]',
  warning: 'bg-[var(--gold)]',
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
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-medium text-[var(--muted)]">{label}</span>}
          {showValue && (
            <span className="font-jetbrains font-semibold text-xs text-[var(--foreground)]">{clamped}%</span>
          )}
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
