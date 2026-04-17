import { cn } from '@/lib/utils';

type SectionHeaderSize = 'sm' | 'md' | 'lg';

const sizeConfig: Record<SectionHeaderSize, { title: string; subtitle: string }> = {
  sm: { title: 'text-base font-semibold', subtitle: 'text-xs' },
  md: { title: 'text-lg font-semibold',   subtitle: 'text-sm' },
  lg: { title: 'text-2xl font-bold',      subtitle: 'text-sm' },
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  size?: SectionHeaderSize;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  size = 'md',
  action,
  className,
}: SectionHeaderProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-start justify-between gap-4 text-white', className)}>
      <div>
        <h2 className={cn(config.title, 'text-inherit')}>{title}</h2>
        {subtitle && (
          <p className={cn(config.subtitle, 'text-white/50 mt-0.5')}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
