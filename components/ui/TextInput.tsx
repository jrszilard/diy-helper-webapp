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
  sm: 'h-[30px] text-[13px] px-[10px]',
  md: 'h-[38px] text-[14px] px-3',
  lg: 'h-[46px] text-[15px] px-[14px]',
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
  const paddingLeft  = LeftIcon  ? 'pl-9'  : undefined;
  const paddingRight = RightIcon ? 'pr-9'  : undefined;

  return (
    <div className={cn('flex flex-col', fullWidth && 'w-full')} style={{ gap: 6 }}>
      {label && (
        <label
          htmlFor={id}
          className={cn('font-serif italic text-[var(--muted)]', labelClassName)}
          style={{ fontSize: 14 }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--earth-brown)] flex">
            <LeftIcon size={iconSize} />
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'bg-[#1F1B17] text-white placeholder:text-[var(--earth-brown)] border border-white/[0.08] rounded-none transition-colors',
            'focus:outline-none focus:border-[var(--rust)] focus:bg-[var(--background)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#C24A33]',
            sizeClasses[inputSize],
            paddingLeft,
            paddingRight,
            fullWidth && 'w-full',
            className,
          )}
          {...props}
        />
        {RightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--earth-brown)] flex">
            <RightIcon size={iconSize} />
          </span>
        )}
      </div>
      {error && (
        <p className="font-jetbrains font-medium text-[#E89580]" style={{ fontSize: 11, marginTop: 2 }}>{error}</p>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
