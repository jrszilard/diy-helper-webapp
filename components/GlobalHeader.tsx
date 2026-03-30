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
  /** Visual variant: 'light' (default) keeps current style, 'dark' matches landing-page nav */
  variant?: 'light' | 'dark';
}

export default function GlobalHeader({ left, nav, right, className = '', logoHref, variant = 'light' }: GlobalHeaderProps) {
  const isDark = variant === 'dark';

  return (
    <header className={`${isDark ? 'sticky top-0 z-50 backdrop-blur-xl bg-[var(--earth-brown-dark)]/95 border-b border-[var(--blueprint-grid-major)]' : 'bg-nav-surface border-b border-earth-sand shadow-sm'} ${className}`}>
      <div className="u-container">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4">
            {left}
            <AppLogo href={logoHref} variant={isDark ? 'dark' : 'light'} />
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
                className={`text-sm font-medium transition-colors hidden sm:block ${isDark ? 'text-[var(--earth-sand)] hover:text-white' : 'text-earth-brown hover:text-foreground'}`}
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
