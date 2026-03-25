'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  if (position === 'right') {
    return createPortal(
      <div className="fixed inset-0 bg-[var(--foreground)]/50 z-50 flex justify-end">
        <div className="absolute inset-0" onClick={onClose} />
        <div
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
        className={cn(
          'relative bg-surface rounded-xl shadow-2xl w-full border border-[var(--earth-sand)]',
          sizeClasses[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
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
