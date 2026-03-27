'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import AppLogo from './AppLogo';

interface GlobalHeaderProps {
  left?: ReactNode;
  /** Inline nav links shown between logo and right slot (desktop only) */
  nav?: ReactNode;
  right?: ReactNode;
  className?: string;
  logoHref?: string;
}

export default function GlobalHeader({ left, nav, right, className = '', logoHref }: GlobalHeaderProps) {
  return (
    <header className={`bg-nav-surface border-b border-earth-sand shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4">
            {left}
            <AppLogo href={logoHref} />
            {nav && (
              <nav className="hidden sm:flex items-center gap-1 ml-2">
                {nav}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!nav && (
              <Link
                href="/about"
                className="text-sm font-medium text-earth-brown hover:text-foreground transition-colors hidden sm:block"
              >
                About
              </Link>
            )}
            {right}
          </div>
        </div>
      </div>
    </header>
  );
}
