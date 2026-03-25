'use client';

import { Wrench, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ExpertQuickBarProps {
  displayName: string;
  openQueueCount: number;
}

export default function ExpertQuickBar({ displayName, openQueueCount }: ExpertQuickBarProps) {
  return (
    <div className="bg-gradient-to-r from-gold to-gold-dark text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3 gap-3">
          {/* Left: Welcome */}
          <div className="flex items-center gap-2 min-w-0">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-[#5C3D1A] flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              Welcome back, <span className="font-bold">{displayName}</span>
            </span>
          </div>

          {/* Center: Queue badge */}
          <div className="hidden sm:flex items-center flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-white/25 text-foreground text-sm font-semibold px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-foreground rounded-full" />
              {openQueueCount} open question{openQueueCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Right: Dashboard button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile queue count */}
            <span className="sm:hidden inline-flex items-center gap-1 bg-white/25 text-foreground text-xs font-semibold px-2 py-1 rounded-full">
              {openQueueCount} open
            </span>
            <Button
              variant="primary"
              size="sm"
              href="/experts/dashboard"
              rightIcon={ArrowRight}
              iconSize={14}
            >
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
