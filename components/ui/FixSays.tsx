import { ReactNode } from 'react';
import FixBot from '@/components/FixBot';

interface FixSaysProps {
  label?: string;
  children: ReactNode;
  actions?: ReactNode;
  expression?: 'default' | 'winking' | 'computing' | 'terminator';
  className?: string;
}

export default function FixSays({
  label = 'Fix says',
  children,
  actions,
  expression = 'default',
  className = '',
}: FixSaysProps) {
  return (
    <div
      className={`relative rounded-none border border-white/[0.18] p-4 ${className}`}
      style={{ background: 'linear-gradient(135deg, #4A3F35, #3F3831)' }}
    >
      <div className="flex items-start gap-[14px]">
        <FixBot size={48} expression={expression} ariaLabel="Fix" />
        <div className="flex-1 min-w-0">
          <p
            className="font-jetbrains font-semibold uppercase text-[var(--gold)] leading-none mb-[6px]"
            style={{ fontSize: 10, letterSpacing: '0.14em' }}
          >
            {label}
          </p>
          <div className="font-serif italic text-white/90 leading-[1.55]" style={{ fontSize: 14 }}>
            {children}
          </div>
        </div>
      </div>
      {actions && (
        <div className="mt-[10px] flex flex-wrap gap-2 pl-[62px]">{actions}</div>
      )}
      {/* speech tail — rotated diamond at bottom-left */}
      <div
        className="absolute -bottom-2 w-[14px] h-[14px] rotate-45 border-r border-b border-white/[0.18]"
        style={{ left: 52, background: '#3F3831' }}
      />
    </div>
  );
}
