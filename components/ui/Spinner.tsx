import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 32,
};

const colorMap = {
  default: 'text-[var(--earth-brown)]',
  primary: 'text-[var(--terracotta)]',
  blue:    'text-[var(--slate-blue)]',
  green:   'text-[var(--forest-green)]',
};

interface SpinnerProps {
  size?:      keyof typeof sizeMap;
  color?:     keyof typeof colorMap;
  className?: string;
}

export default function Spinner({ size = 'md', color = 'default', className }: SpinnerProps) {
  return (
    <Loader2
      size={sizeMap[size]}
      className={cn('animate-spin', colorMap[color], className)}
    />
  );
}
