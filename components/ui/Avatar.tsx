import { cn } from '@/lib/utils';

const sizeMap = {
  sm: { container: 'w-7 h-7',         textSize: 11 },
  md: { container: 'w-9 h-9',         textSize: 13 },
  lg: { container: 'w-[52px] h-[52px]', textSize: 17 },
};

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const { container, textSize } = sizeMap[size];

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 bg-[#4A3F35] border border-white/[0.08] flex items-center justify-center overflow-hidden',
        container,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" className={cn('rounded-full object-cover', container)} />
      ) : (
        <span className="font-semibold text-white leading-none" style={{ fontSize: textSize }}>{initial}</span>
      )}
    </div>
  );
}
