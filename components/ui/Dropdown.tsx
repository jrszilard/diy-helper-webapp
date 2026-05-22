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

  const ghostClass = 'w-full flex items-center gap-[10px] px-[10px] py-2 rounded-none text-white/90 hover:bg-white/10 hover:text-white transition-colors';
  const dangerGhostClass = 'w-full flex items-center gap-[10px] px-[10px] py-2 rounded-none text-[#E89580] hover:bg-white/10 transition-colors';

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute min-w-[180px] bg-[var(--earth-brown-dark)] rounded-none border border-white/[0.18] p-1 z-50',
          'shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
            placement === 'top' ? 'bottom-full mb-[6px]' : 'mt-[6px]',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item, i) => {
            const itemClass = item.danger ? dangerGhostClass : ghostClass;

            return (
              <div key={i}>
                {item.dividerBefore && <div className="border-t border-white/[0.08] my-1 -mx-1" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={itemClass}
                    style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon && <item.icon size={14} className="shrink-0" />}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={itemClass}
                    style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}
                    onClick={() => { item.onClick?.(); setOpen(false); }}
                  >
                    {item.icon && <item.icon size={14} className="shrink-0" />}
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
