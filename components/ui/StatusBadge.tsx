import { FlaskConical, Clock, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectStatus = 'research' | 'in_progress' | 'waiting_parts' | 'completed';

const statusConfig: Record<ProjectStatus, {
  bg: string;
  text: string;
  label: string;
  icon: React.ReactNode;
}> = {
  research:      { bg: 'bg-[var(--status-research-bg)]', text: 'text-[var(--slate-blue)]',    label: 'Research',       icon: <FlaskConical className="w-3 h-3" /> },
  in_progress:   { bg: 'bg-[var(--status-progress-bg)]', text: 'text-[var(--terracotta)]',    label: 'In Progress',    icon: <Clock className="w-3 h-3" /> },
  waiting_parts: { bg: 'bg-[#F3EDF5]', text: 'text-[var(--status-waiting)]',label: 'Waiting Parts',  icon: <Package className="w-3 h-3" /> },
  completed:     { bg: 'bg-[var(--status-complete-bg)]', text: 'text-[var(--forest-green)]',  label: 'Completed',      icon: <CheckCircle2 className="w-3 h-3" /> },
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
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'gap-0.5 text-[10px] px-1.5 py-0.5' : 'gap-1 text-xs px-2 py-0.5',
      config.bg,
      config.text,
      className,
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Export the config so consumers can get icon/colors without rendering the badge
export { statusConfig };
