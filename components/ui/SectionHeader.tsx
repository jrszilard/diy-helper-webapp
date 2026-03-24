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
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className={cn(config.title, 'text-[var(--earth-brown-dark)]')}>{title}</h2>
        {subtitle && (
          <p className={cn(config.subtitle, 'text-[var(--earth-brown-light)] mt-0.5')}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
