'use client';

import Link from 'next/link';
import { Wrench, ArrowRight } from 'lucide-react';

interface ExpertQuickBarProps {
  displayName: string;
  openQueueCount: number;
}

export default function ExpertQuickBar({ displayName, openQueueCount }: ExpertQuickBarProps) {
  return (
    <div className="bg-gradient-to-r from-[#D4A574] to-[#C6943E] text-[#3E2723]">
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
            <span className="inline-flex items-center gap-1.5 bg-white/25 text-[#3E2723] text-sm font-semibold px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-[#3E2723] rounded-full" />
              {openQueueCount} open question{openQueueCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Right: Dashboard button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile queue count */}
            <span className="sm:hidden inline-flex items-center gap-1 bg-white/25 text-[#3E2723] text-xs font-semibold px-2 py-1 rounded-full">
              {openQueueCount} open
            </span>
            <Link
              href="/experts/dashboard"
              className="inline-flex items-center gap-1.5 bg-[#3E2723] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#2A1B17] transition-colors"
            >
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
