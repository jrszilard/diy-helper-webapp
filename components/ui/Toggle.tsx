import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export default function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={id}
              className="block font-medium cursor-pointer text-white leading-[1.3]"
              style={{ fontSize: 14 }}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="mt-0.5 text-[var(--muted)] leading-[1.4]" style={{ fontSize: 12 }}>{description}</p>
          )}
        </div>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--rust)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-[var(--rust)]' : 'bg-white/[0.18]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-[180ms]',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(.4,.2,.2,1)' }}
        />
      </button>
    </div>
  );
}
