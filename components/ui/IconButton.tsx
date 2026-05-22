import { ButtonHTMLAttributes, ElementType } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ElementType;
  iconSize?: number;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
}

export default function IconButton({
  icon: Icon,
  iconSize = 18,
  label,
  variant = 'default',
  className,
  ...props
}: IconButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--rust)] text-white border-transparent plate-shadow hover:bg-[var(--rust-glow,#D97757)]'
      : variant === 'danger'
      ? 'bg-[rgba(140,42,26,0.18)] text-[#E89580] border-[rgba(140,42,26,0.4)] hover:bg-[#8C2A1A] hover:text-white'
      : 'bg-white/[0.03] text-[var(--earth-brown-light)] border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.18]';

  return (
    <button
      aria-label={label}
      className={cn(
        'w-[36px] h-[36px] inline-flex items-center justify-center rounded-none border transition-all',
        variantClass,
        'disabled:opacity-[.42] disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <Icon size={iconSize} />
    </button>
  );
}
