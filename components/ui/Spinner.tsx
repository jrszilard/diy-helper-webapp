import { FixSpinner } from '@/components/FixBot';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 28,
  md: 40,
  lg: 56,
};

const colorMap = {
  default: '#E83A2C',
  primary: '#E83A2C',
  blue:    '#5C7882',
  green:   '#5C7A40',
};

interface SpinnerProps {
  size?:      keyof typeof sizeMap;
  color?:     keyof typeof colorMap;
  className?: string;
}

export default function Spinner({ size = 'md', color = 'default', className }: SpinnerProps) {
  return (
    <FixSpinner
      size={sizeMap[size]}
      color={colorMap[color]}
      className={cn(className)}
    />
  );
}
