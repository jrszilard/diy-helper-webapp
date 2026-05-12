import { ReactNode } from 'react';
import FixBot from '@/components/FixBot';

interface FixSaysProps {
  /** Optional eyebrow override (default: "FIX SAYS"). */
  label?: string;
  /** Body — supports inline JSX, links, etc. */
  children: ReactNode;
  /** Optional action row rendered below the message (buttons, etc.). */
  actions?: ReactNode;
  /** Bot expression. Defaults to 'default' (one floating eye). */
  expression?: 'default' | 'winking' | 'computing' | 'terminator';
  className?: string;
}

/**
 * Dark callout card with Fix as the speaker — for surfacing a tip, alert, or
 * action prompt in Fix's voice. Maps to the design doc's "Fix says" card.
 */
export default function FixSays({
  label = 'Fix says',
  children,
  actions,
  expression = 'default',
  className = '',
}: FixSaysProps) {
  return (
    <div
      className={`bg-[var(--earth-brown-dark)] text-white rounded-2xl p-4 border border-transparent ${className}`}
    >
      <div className="flex items-start gap-3">
        <FixBot size={42} theme="dark" expression={expression} ariaLabel="Fix" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/55 leading-none mb-1">
            {label}
          </p>
          <div className="text-sm leading-snug text-white/90">{children}</div>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2 pl-[54px]">{actions}</div>}
    </div>
  );
}
