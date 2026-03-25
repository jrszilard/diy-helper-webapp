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
              className="block text-sm font-semibold text-[var(--earth-brown-dark)] cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[var(--earth-brown)] mt-0.5">{description}</p>
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
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--terracotta)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-forest-green' : 'bg-earth-sand',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
