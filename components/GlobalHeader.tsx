'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import AppLogo from './AppLogo';

interface GlobalHeaderProps {
  left?: ReactNode;      // slot before the logo (e.g. mobile menu button)
  right?: ReactNode;     // slot after logo on the right side
  className?: string;
}

export default function GlobalHeader({ left, right, className = '' }: GlobalHeaderProps) {
  return (
    <header className={`bg-nav-surface border-b border-earth-sand shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2">
            {left}
            <AppLogo />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/about" className="text-sm font-medium text-earth-brown hover:text-foreground transition-colors hidden sm:block">
              About
            </Link>
            {right}
          </div>
        </div>
      </div>
    </header>
  );
}
