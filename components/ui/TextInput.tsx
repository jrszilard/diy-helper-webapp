import { ElementType, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  leftIcon?: ElementType;
  rightIcon?: ElementType;
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

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({
  label,
  labelClassName,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize = 16,
  error,
  fullWidth,
  inputSize = 'md',
  className,
  id,
  ...props
}, ref) => {
  const paddingLeft = LeftIcon ? 'pl-9' : 'pl-3';
  const paddingRight = RightIcon ? 'pr-9' : 'pr-3';

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={id}
          className={cn('text-sm font-medium text-white/60', labelClassName)}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            size={iconSize}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30"
          />
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'bg-white/10 text-white placeholder:text-white/50 border border-white/20 rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--rust)] focus:border-[var(--rust)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--rust)] focus:ring-[var(--rust)] focus:border-[var(--rust)]',
            sizeClasses[inputSize],
            paddingLeft,
            paddingRight,
            fullWidth && 'w-full',
            className,
          )}
          {...props}
        />
        {RightIcon && (
          <RightIcon
            size={iconSize}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30"
          />
        )}
      </div>
      {error && (
        <p className="text-xs text-[var(--rust)]">{error}</p>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
