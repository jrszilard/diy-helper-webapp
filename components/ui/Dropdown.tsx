'use client';

import { useState, useRef, useEffect, ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/Button';

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
  className?: string;
}

export default function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
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

  const ghostClass = buttonVariants({ variant: 'ghost', size: 'sm', fullWidth: true });
  const dangerGhostClass = cn(
    buttonVariants({ variant: 'ghost', size: 'sm', fullWidth: true }),
    'text-rust hover:bg-[var(--status-progress-bg)] hover:text-rust',
  );

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute mt-2 w-52 bg-surface rounded-lg shadow-xl border border-earth-sand py-1 z-50',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item, i) => {
            const itemClass = cn(
              item.danger ? dangerGhostClass : ghostClass,
              'justify-start rounded-none px-4',
            );

            return (
              <div key={i}>
                {item.dividerBefore && <div className="border-t border-earth-tan my-1" />}
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
