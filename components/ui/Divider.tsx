import { cn } from '@/lib/utils';

interface DividerProps {
  label?: string;
  className?: string;
}

export default function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-[var(--earth-sand)]" />
        <span className="text-xs text-[var(--earth-brown-light)] whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-[var(--earth-sand)]" />
      </div>
    );
  }

  return <hr className={cn('border-0 h-px bg-[var(--earth-sand)]', className)} />;
}
