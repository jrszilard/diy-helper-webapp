import { ElementType, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
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
          className="text-sm font-medium text-[var(--earth-brown-dark)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
      {LeftIcon && (
        <LeftIcon
          size={iconSize}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--earth-brown-light)] pointer-events-none"
        />
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'border rounded-lg bg-white text-[#3E2723] transition-colors',
          'placeholder-[var(--earth-brown-light)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)] focus:border-[var(--terracotta)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-[var(--rust)] focus:ring-[var(--rust)] focus:border-[var(--rust)]'
            : 'border-[var(--earth-sand)]',
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--earth-brown-light)] pointer-events-none"
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
