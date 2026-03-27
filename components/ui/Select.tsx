import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  leftIcon?: React.ElementType;
  iconSize?: number;
  error?: string;
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'py-1.5 text-sm',
  md: 'py-2 text-sm',
  lg: 'py-3 text-base',
};

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
  const paddingLeft = LeftIcon ? 'pl-9' : 'pl-3';

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--earth-brown-dark)]">
          {label}
        </label>
      )}
    <div className={cn('relative', fullWidth && 'w-full')}>
      {LeftIcon && (
        <LeftIcon
          size={iconSize}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--earth-brown-light)] pointer-events-none"
        />
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'text-[#3E2723]',
          'appearance-none border rounded-lg bg-white transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)] focus:border-[var(--terracotta)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-[var(--rust)] focus:ring-[var(--rust)] focus:border-[var(--rust)]'
            : 'border-[var(--earth-sand)]',
          sizeClasses[inputSize],
          paddingLeft,
          'pr-9',
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={iconSize}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--earth-brown-light)] pointer-events-none"
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--rust)]">{error}</p>
      )}
    </div>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
