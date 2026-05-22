import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  leftIcon?: React.ElementType;
  iconSize?: number;
  error?: string;
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-[30px] text-[13px] px-[10px]',
  md: 'h-[38px] text-[14px] px-3',
  lg: 'h-[46px] text-[15px] px-[14px]',
};

// Inline chevron SVG via data URL — avoids Lucide layout overhead inside select
const chevronBg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0h10L5 6z' fill='%23AEA8A3'/></svg>")`;

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  leftIcon: LeftIcon,
  iconSize = 16,
  error,
  fullWidth,
  inputSize = 'md',
  className,
  id,
  children,
  ...props
}, ref) => {
  const paddingLeft = LeftIcon ? 'pl-9' : undefined;

  return (
    <div className={cn('flex flex-col', fullWidth && 'w-full')} style={{ gap: 6 }}>
      {label && (
        <label htmlFor={id} className="font-serif italic text-[var(--muted)]" style={{ fontSize: 14 }}>
          {label}
        </label>
      )}
      <div className={cn('relative', fullWidth && 'w-full')}>
        {LeftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--earth-brown)] flex">
            <LeftIcon size={iconSize} />
          </span>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'appearance-none bg-[#1F1B17] text-white border border-white/[0.08] rounded-none transition-colors',
            '[&>option]:bg-[#2a2420] [&>option]:text-white',
            'focus:outline-none focus:border-[var(--rust)] focus:bg-[var(--background)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#C24A33]',
            sizeClasses[inputSize],
            paddingLeft,
            'pr-9',
            fullWidth && 'w-full',
            className,
          )}
          style={{
            backgroundImage: chevronBg,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="font-jetbrains font-medium text-[#E89580]" style={{ fontSize: 11, marginTop: 2 }}>{error}</p>
        )}
      </div>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
