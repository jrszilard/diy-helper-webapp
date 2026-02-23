'use client';

import { useState, useEffect } from 'react';
import { Award, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

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
    <div className="bg-gradient-to-r from-[#D4A574] to-[#C6943E] text-[#3E2723]">
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
            <Link
              href="/experts/register"
              className="inline-flex items-center gap-1.5 bg-[#3E2723] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#2A1B17] transition-colors"
            >
              <span>Become an Expert</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
            <Link
              href="/experts/register"
              className="inline-flex items-center gap-1 bg-[#3E2723] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#2A1B17] transition-colors"
            >
              <span>Apply</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
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
