'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 'center' = dialog, 'right' = full-height slide-in panel */
  position?: 'center' | 'right';
  size?: keyof typeof sizeClasses;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  position = 'center',
  size = 'md',
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Auto-focus only when the modal opens — must not depend on onClose
  // (onClose is often an inline function that changes every render, which
  // would retrigger this and steal focus away from inputs mid-typing)
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      el?.focus();
    });
  }, [isOpen]);

  // Keyboard handler: Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: keep Tab cycling within the modal
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  if (position === 'right') {
    return createPortal(
      <div className="fixed inset-0 bg-[var(--foreground)]/50 z-50 flex justify-end">
        <div className="absolute inset-0" onClick={onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal={true}
          aria-label={title}
          className={cn(
            'relative w-full max-w-md bg-surface h-full overflow-hidden flex flex-col shadow-xl animate-slide-in-right',
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--earth-sand)]">
              <h2 className="text-base font-semibold text-[var(--earth-brown-dark)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 text-[var(--earth-brown)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--foreground)]/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={true}
        aria-label={title}
        className={cn(
          'relative bg-surface rounded-xl shadow-2xl w-full border border-[var(--earth-sand)]',
          sizeClasses[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--earth-sand)]">
            <h2 className="text-lg font-bold text-[var(--earth-brown-dark)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-[var(--earth-brown)] hover:text-[var(--foreground)] transition-colors -mt-0.5"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-[var(--earth-brown)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
