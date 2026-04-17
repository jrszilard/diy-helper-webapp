'use client';

import { useState, useRef, useEffect, ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  icon?: ElementType;
  href?: string;
  onClick?: () => void;
  /** Renders the item in the danger (rust) color */
  danger?: boolean;
  /** Renders a divider above this item */
  dividerBefore?: boolean;
}

interface DropdownProps {
  /** The element that opens/closes the dropdown */
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  placement?: 'bottom' | 'top';
  className?: string;
}

export default function Dropdown({ trigger, items, align = 'right', placement = 'bottom', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const ghostClass = 'w-full flex items-center gap-2 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors';
  const dangerGhostClass = 'w-full flex items-center gap-2 px-4 py-1.5 text-sm text-[var(--rust)] hover:bg-white/10 transition-colors';

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute w-52 bg-[var(--earth-brown-dark)] rounded-lg shadow-xl border border-white/10 py-1 z-50',
            placement === 'top' ? 'bottom-full mb-2' : 'mt-2',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item, i) => {
            const itemClass = item.danger ? dangerGhostClass : ghostClass;

            return (
              <div key={i}>
                {item.dividerBefore && <div className="border-t border-white/10 my-1" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={itemClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon && <item.icon size={16} className="shrink-0" />}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={itemClass}
                    onClick={() => { item.onClick?.(); setOpen(false); }}
                  >
                    {item.icon && <item.icon size={16} className="shrink-0" />}
                    {item.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
