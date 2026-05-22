import { cn } from '@/lib/utils';

type SectionHeaderSize = 'sm' | 'md' | 'lg';

// Title uses Newsreader 400 upright; subtitle uses Newsreader italic
const sizeConfig: Record<SectionHeaderSize, { title: string; subtitle: string }> = {
  sm: { title: 'text-xs  font-normal font-serif', subtitle: 'text-2xs font-serif italic' },
  md: { title: 'text-base font-normal font-serif', subtitle: 'text-xs  font-serif italic' },
  lg: { title: 'text-xl  font-normal font-serif', subtitle: 'text-sm  font-serif italic' },
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
    <div className={cn(
      'flex items-start justify-between gap-4 text-white pb-[10px] border-b border-white/[0.08]',
      className,
    )}>
      <div>
        <h2 className={cn(config.title, 'text-inherit leading-tight')}>{title}</h2>
        {subtitle && (
          <p className={cn(config.subtitle, 'text-white/50 mt-1')}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
