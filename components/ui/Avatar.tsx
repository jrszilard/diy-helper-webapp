import { cn } from '@/lib/utils';

const sizeMap = {
  sm: { container: 'w-8 h-8',   text: 'text-xs'  },
  md: { container: 'w-12 h-12', text: 'text-base' },
  lg: { container: 'w-16 h-16', text: 'text-xl'   },
};

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const { container, text } = sizeMap[size];

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 bg-[var(--slate-blue)]/10 flex items-center justify-center overflow-hidden',
        container,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" className={cn('rounded-full object-cover', container)} />
      ) : (
        <span className={cn('font-bold text-[var(--slate-blue)]', text)}>{initial}</span>
      )}
    </div>
  );
}
