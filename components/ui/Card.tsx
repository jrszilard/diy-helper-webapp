import { ElementType } from 'react';
import { cn } from '@/lib/utils';

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

const roundedClasses = {
  lg:   'rounded-lg',
  xl:   'rounded-xl',
  '2xl': 'rounded-2xl',
};

interface CardProps {
  children: React.ReactNode;
  padding?:  keyof typeof paddingClasses;
  rounded?:  keyof typeof roundedClasses;
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
  rounded  = 'lg',
  hover    = false,
  shadow   = false,
  surface  = false,
  className,
  onClick,
  as: Tag  = 'div',
}: CardProps) {
  const shadowClass =
    shadow === 'sm' ? 'shadow-sm'
    : shadow === 'md' || shadow === true ? 'shadow-md'
    : '';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'border border-white/10',
        surface ? 'bg-white/10' : 'bg-white/6',
        roundedClasses[rounded],
        paddingClasses[padding],
        shadowClass,
        hover && 'transition-all hover:shadow-md hover:border-[var(--rust)]/30',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
