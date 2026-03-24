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
        'border border-[var(--earth-sand)]',
        surface ? 'bg-surface' : 'bg-white',
        roundedClasses[rounded],
        paddingClasses[padding],
        shadowClass,
        hover && 'transition-all hover:shadow-md hover:border-[var(--terracotta)]/30',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
