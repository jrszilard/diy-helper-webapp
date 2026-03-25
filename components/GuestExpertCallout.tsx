'use client';

import { useState, useEffect } from 'react';
import { Users, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const DISMISS_KEY = 'guest-expert-callout-dismissed';
const SHOW_AFTER_MESSAGES = 3;

interface GuestExpertCalloutProps {
  messageCount: number;
  onRequestAuth?: () => void;
}

export default function GuestExpertCallout({ messageCount, onRequestAuth }: GuestExpertCalloutProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      const stored = localStorage.getItem(DISMISS_KEY);
      setDismissed(!!stored);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (dismissed || messageCount < SHOW_AFTER_MESSAGES) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const handleSignUp = () => {
    localStorage.setItem('expert-callout-referral', 'true');
    onRequestAuth?.();
  };

  return (
    <div className="mx-4 mb-2">
      <div className="bg-[#F0F5FA] border border-[#C4D6E5] rounded-lg px-4 py-3 flex items-start gap-3">
        <div className="bg-slate-blue p-1.5 rounded-lg flex-shrink-0 mt-0.5">
          <Users size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Stuck on something? Get a verified expert&apos;s opinion
          </p>
          <p className="text-xs text-earth-brown mt-0.5">
            Create a free account and your first question to a real trade pro is on us.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignUp}
            rightIcon={ArrowRight}
            iconSize={12}
            className="mt-2 text-xs text-slate-blue hover:text-slate-blue-dark hover:bg-transparent px-0 py-0"
          >
            Sign up free
          </Button>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-[#D4E2ED] rounded transition-colors flex-shrink-0"
          aria-label="Dismiss expert callout"
        >
          <X size={14} className="text-earth-brown" />
        </button>
      </div>
    </div>
  );
}
