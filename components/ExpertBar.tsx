'use client';

import { useState, useEffect } from 'react';
import { Award, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const DISMISS_KEY = 'expert-bar-dismissed';
const DISMISS_DAYS = 30;

export default function ExpertBar({ user }: { user: { id: string } | null }) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      setDismissed(daysSince < DISMISS_DAYS);
    } else {
      setDismissed(false);
    }
  }, []);

  if (user || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-[#3E2723]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3 gap-3">
          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-3 flex-1">
            <Award className="w-5 h-5 text-[#5C3D1A] flex-shrink-0" />
            <p className="text-sm font-medium">
              <span className="font-bold">Are you a trade professional?</span>
              {' '}Earn $50–150/hr sharing your expertise with DIYers.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              href="/experts/register"
              rightIcon={ArrowRight}
              iconSize={14}
            >
              Become an Expert
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              aria-label="Dismiss expert bar"
            >
              <X className="w-4 h-4 text-[#5C3D1A]" />
            </button>
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden items-center gap-2 flex-1">
            <Award className="w-4 h-4 text-[#5C3D1A] flex-shrink-0" />
            <p className="text-sm font-medium">
              <span className="font-bold">Trade pro?</span> Earn $50–150/hr
            </p>
          </div>
          <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="xs"
              href="/experts/register"
              rightIcon={ArrowRight}
              iconSize={12}
            >
              Apply
            </Button>
            <button
              onClick={handleDismiss}
              className="p-0.5 hover:bg-black/10 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-[#5C3D1A]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
