import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  fullWidth,
  resize = 'vertical',
  className,
  id,
  ...props
}, ref) => {
  const resizeClass = {
    none:       'resize-none',
    vertical:   'resize-y',
    horizontal: 'resize-x',
    both:       'resize',
  }[resize];

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-white/60"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'bg-white/10 text-white placeholder:text-white/50 border border-white/20 rounded-lg px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--rust)] focus:border-[var(--rust)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[var(--rust)] focus:ring-[var(--rust)] focus:border-[var(--rust)]',
          resizeClass,
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--rust)]">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
