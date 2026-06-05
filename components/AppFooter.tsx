'use client';

import { usePathname } from 'next/navigation';
import AppLogo from './AppLogo';
import Button from './ui/Button';

export default function AppFooter() {
  const pathname = usePathname();

  return (
    <footer className="border-t border-white/[0.06] py-[var(--space-l)]">
      <div className="u-container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <AppLogo />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              href="/about"
              className={pathname === '/about'
                ? 'text-white bg-white/[0.06] text-sm'
                : 'text-white/40 hover:text-white hover:bg-white/10 text-sm'}
            >
              About
            </Button>
            <Button
              variant="ghost"
              href="/experts/register"
              className={pathname === '/experts/register'
                ? 'text-white bg-white/[0.06] text-sm'
                : 'text-white/40 hover:text-white hover:bg-white/10 text-sm'}
            >
              Become an Expert
            </Button>
            <span className="text-white/20 text-sm pl-2">Powered by Claude AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
