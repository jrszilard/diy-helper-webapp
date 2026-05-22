import { ElementType } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const variantConfig: Record<AlertVariant, {
  container: string;
  icon: ElementType;
  iconClass: string;
  bodyColor: string;
}> = {
  info: {
    container: 'bg-[rgba(92,120,130,0.12)] border border-[rgba(92,120,130,0.30)]',
    icon: Info,
    iconClass: 'text-[var(--slate-blue)]',
    bodyColor: '#B5CBD3',
  },
  success: {
    container: 'bg-[rgba(92,122,64,0.12)] border border-[rgba(92,122,64,0.32)]',
    icon: CheckCircle,
    iconClass: 'text-[var(--forest-green)]',
    bodyColor: '#B8D196',
  },
  warning: {
    container: 'bg-[rgba(212,165,116,0.12)] border border-[rgba(212,165,116,0.32)]',
    icon: AlertTriangle,
    iconClass: 'text-[var(--gold)]',
    bodyColor: '#E8C99A',
  },
  error: {
    container: 'bg-[rgba(184,89,59,0.14)] border border-[rgba(184,89,59,0.35)]',
    icon: XCircle,
    iconClass: 'text-[var(--rust)]',
    bodyColor: '#E89580',
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
    <div className={cn('flex gap-3 rounded-none p-[14px_16px]', config.container, className)}>
      {Icon && (
        <Icon size={16} className={cn('flex-shrink-0 mt-0.5', config.iconClass)} />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-serif italic text-white mb-0.5" style={{ fontSize: 15 }}>{title}</p>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.5, color: config.bodyColor }}>{children}</div>
      </div>
    </div>
  );
}
