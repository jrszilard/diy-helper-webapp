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
    <div className={cn('flex flex-col', fullWidth && 'w-full')} style={{ gap: 6 }}>
      {label && (
        <label htmlFor={id} className="font-serif italic text-[var(--muted)]" style={{ fontSize: 14 }}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'bg-[#1F1B17] text-white text-[14px] placeholder:text-[var(--earth-brown)] border border-white/[0.08] rounded-none px-3 py-[10px] transition-colors',
          'focus:outline-none focus:border-[var(--rust)] focus:bg-[var(--background)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[#C24A33]',
          resizeClass,
          fullWidth && 'w-full',
          className,
        )}
        style={{ minHeight: 100 }}
        {...props}
      />
      {error && (
        <p className="font-jetbrains font-medium text-[#E89580]" style={{ fontSize: 11, marginTop: 2 }}>{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
