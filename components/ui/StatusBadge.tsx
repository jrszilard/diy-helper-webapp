import { FlaskConical, Clock, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectStatus = 'research' | 'in_progress' | 'waiting_parts' | 'completed';

const statusConfig: Record<ProjectStatus, {
  bg: string;
  text: string;
  label: string;
  icon: React.ReactNode;
}> = {
  research:      { bg: 'bg-[var(--status-research-bg-dark)]',  text: 'text-[var(--status-research-fg-dark)]',  label: 'Research',      icon: <FlaskConical className="w-3 h-3" /> },
  in_progress:   { bg: 'bg-[var(--status-progress-bg-dark)]',  text: 'text-[var(--status-progress-fg-dark)]',  label: 'In Progress',   icon: <Clock className="w-3 h-3" /> },
  waiting_parts: { bg: 'bg-[var(--status-waiting-bg-dark)]',   text: 'text-[var(--status-waiting-fg-dark)]',   label: 'Waiting Parts', icon: <Package className="w-3 h-3" /> },
  completed:     { bg: 'bg-[var(--status-complete-bg-dark)]',  text: 'text-[var(--status-complete-fg-dark)]',  label: 'Completed',     icon: <CheckCircle2 className="w-3 h-3" /> },
};

interface StatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ status = 'research', size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status as ProjectStatus] ?? statusConfig.research;

  return (
    <span className={cn(
      'inline-flex items-center rounded-none font-medium',
      size === 'sm' ? 'gap-0.5 text-[10px] px-[7px] py-[2px]' : 'gap-1 text-[11px] px-[9px] py-[4px]',
      config.bg,
      config.text,
      className,
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}

export { statusConfig };
