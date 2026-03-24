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
          className="text-sm font-medium text-[var(--earth-brown-dark)]"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        style={{ color: 'var(--foreground)' }}
        className={cn(
          'border rounded-lg bg-white px-3 py-2 text-sm transition-colors',
          'placeholder-[var(--earth-brown-light)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)] focus:border-[var(--terracotta)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-[var(--rust)] focus:ring-[var(--rust)] focus:border-[var(--rust)]'
            : 'border-[var(--earth-sand)]',
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
