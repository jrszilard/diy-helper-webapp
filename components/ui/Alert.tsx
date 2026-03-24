import { ElementType } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const variantConfig: Record<AlertVariant, {
  container: string;
  icon: ElementType;
  iconClass: string;
  titleClass: string;
  bodyClass: string;
}> = {
  info: {
    container: 'bg-[var(--slate-blue)]/8 border border-[var(--slate-blue)]/20',
    icon: Info,
    iconClass: 'text-[var(--slate-blue)]',
    titleClass: 'text-[var(--slate-blue)]',
    bodyClass:  'text-[var(--earth-brown)]',
  },
  success: {
    container: 'bg-[var(--forest-green)]/8 border border-[var(--forest-green)]/20',
    icon: CheckCircle,
    iconClass: 'text-[var(--forest-green)]',
    titleClass: 'text-[var(--forest-green)]',
    bodyClass:  'text-[var(--earth-brown)]',
  },
  warning: {
    container: 'bg-amber-50 border border-amber-200',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-800',
    bodyClass:  'text-amber-700',
  },
  error: {
    container: 'bg-[var(--rust)]/8 border border-[var(--rust)]/20',
    icon: XCircle,
    iconClass: 'text-[var(--rust)]',
    titleClass: 'text-[var(--rust)]',
    bodyClass:  'text-[var(--earth-brown)]',
  },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: ElementType | false;
  className?: string;
}

export default function Alert({
  variant = 'info',
  title,
  children,
  icon,
  className,
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = icon === false ? null : (icon ?? config.icon);

  return (
    <div className={cn('flex gap-3 rounded-lg p-3', config.container, className)}>
      {Icon && (
        <Icon size={16} className={cn('flex-shrink-0 mt-0.5', config.iconClass)} />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('text-sm font-semibold mb-0.5', config.titleClass)}>{title}</p>
        )}
        <div className={cn('text-sm', config.bodyClass)}>{children}</div>
      </div>
    </div>
  );
}
