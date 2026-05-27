'use client';

import { useEffect, useState, ReactNode } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import AppLogo from './AppLogo';
import MobileNavToggle from './MobileNavToggle';
import NotificationBell from './NotificationBell';
import ExpertQuickBar from './ExpertQuickBar';

interface AppHeaderProps {
  extraRight?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export default function AppHeader({ extraRight, showBack, onBack }: AppHeaderProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const { isExpert, expert, openQueueCount } = useExpertStatus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-earth-night/95 border-b border-white/[0.06]">
        <div className="u-container">
          <div className="flex justify-between items-center h-16">
            {/* Mobile: hamburger + logo together in the header row */}
            <div className="flex items-center gap-1 md:hidden">
              <MobileNavToggle />
              <AppLogo />
            </div>

            {/* Desktop new chat button */}
            {showBack && (
              <div className="hidden md:flex flex-col justify-center">
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-[var(--earth-sand)] hover:text-white hover:bg-white/10 transition-colors text-sm font-medium px-2 py-1 rounded-none"
                >
                  <MessageSquarePlus size={14} />
                  New Chat
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-3 ml-auto">
              {extraRight}
              <div className="md:hidden flex items-center gap-1 sm:gap-3">
                {showBack && (
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-[var(--earth-sand)] hover:text-white transition-colors text-sm font-medium px-2 py-1 rounded-none"
                  >
                    <MessageSquarePlus size={14} />
                  </button>
                )}
                <NotificationBell userId={userId} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {isExpert && expert && (
        <ExpertQuickBar displayName={expert.displayName} openQueueCount={openQueueCount} />
      )}
    </>
  );
}
