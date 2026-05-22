import { ElementType } from 'react';
import { cn } from '@/lib/utils';

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
};

interface CardProps {
  children: React.ReactNode;
  padding?:  keyof typeof paddingClasses;
  rounded?:  'lg' | 'xl' | '2xl'; // kept for API compat — all render square
  hover?:    boolean;
  shadow?:   boolean | 'sm' | 'md';
  surface?:  boolean;
  className?: string;
  onClick?:  () => void;
  as?: ElementType;
}

export default function Card({
  children,
  padding  = 'md',
  hover    = false,
  shadow   = false,
  surface  = false,
  className,
  onClick,
  as: Tag  = 'div',
}: CardProps) {
  const shadowClass =
    shadow === 'sm' ? 'shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
    : shadow === 'md' || shadow === true ? 'shadow-[0_8px_24px_rgba(0,0,0,0.32)]'
    : '';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'rounded-none border',
        surface
          ? 'bg-[var(--earth-cream)] text-[#29261B] border-[var(--earth-sand)]'
          : 'bg-[var(--earth-brown-dark)] border-white/[0.08] text-[var(--muted)]',
        paddingClasses[padding],
        shadowClass,
        hover && 'transition-all duration-150 cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.32)] hover:border-[var(--rust)]',
        onClick && !hover && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
