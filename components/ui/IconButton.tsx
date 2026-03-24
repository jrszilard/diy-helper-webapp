import { ButtonHTMLAttributes, ElementType } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ElementType;
  iconSize?: number;
  label: string; // aria-label
  variant?: 'default' | 'primary' | 'danger';
}

export default function IconButton({
  icon: Icon,
  iconSize = 20,
  label,
  variant = 'default',
  className = '',
  ...props
}: IconButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'text-white bg-[var(--terracotta)] hover:bg-[var(--terracotta-dark)]'
      : variant === 'danger'
      ? 'text-white bg-[var(--rust)] hover:bg-[var(--terracotta-dark)]'
      : 'text-[var(--earth-brown)] hover:text-[var(--foreground)] hover:bg-[var(--earth-tan)]';

  return (
    <button
      aria-label={label}
      className={`p-2 rounded-lg transition-colors ${variantClass} ${className}`}
      {...props}
    >
      <Icon size={iconSize} />
    </button>
  );
}
