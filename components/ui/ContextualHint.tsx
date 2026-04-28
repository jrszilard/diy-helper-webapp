'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface ContextualHintProps {
  /** Unique key for localStorage persistence (e.g., 'materials', 'tools') */
  hintKey: string;
  /** The hint message — supports inline JSX */
  children: React.ReactNode;
  /** Optional: auto-dismiss when this becomes true */
  dismissWhen?: boolean;
}

export default function ContextualHint({ hintKey, children, dismissWhen }: ContextualHintProps) {
  const storageKey = `hint_seen_${hintKey}`;
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only, must read in effect
    if (!seen) setVisible(true);
  }, [storageKey]);

  useEffect(() => {
    if (dismissWhen && visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-dismiss when prop becomes truthy
      dismiss();
    }
  }, [dismissWhen, visible, dismiss]);

  if (!visible) return null;

  return (
    <div className="flex items-start gap-2 bg-[var(--status-research-bg)] text-[var(--slate-blue-dark)] text-sm rounded-lg px-3 py-2.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--slate-blue)]" />
      <span className="flex-1">{children}</span>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--slate-blue)]/10 transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
