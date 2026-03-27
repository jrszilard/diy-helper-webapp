'use client';

import { useEffect, useState } from 'react';
import LandingHero from '@/components/LandingHero';
import AuthButton from '@/components/AuthButton';
import ExpertQuickBar from '@/components/ExpertQuickBar';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import { supabase } from '@/lib/supabase';
import AppLogo from '@/components/AppLogo';
import Button from '@/components/ui/Button';

export default function LandingPage() {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { isExpert, expert, openQueueCount } = useExpertStatus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signIn') === 'true' && !user) {
      setShowAuth(true);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--earth-brown-dark)]/95 border-b border-[var(--blueprint-grid-major)]">
        <div className="u-container">
          <div className="flex justify-between items-center h-16">
            <AppLogo variant="dark" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 hidden sm:inline-flex">
                About
              </Button>
              <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
                Become an Expert
              </Button>
              <AuthButton user={user} variant="dark" isExpert={isExpert} externalShowAuth={showAuth} onAuthToggle={setShowAuth} />
            </div>
          </div>
        </div>
      </nav>

      {/* Expert Quick Bar - only shown to verified experts */}
      {isExpert && expert && (
        <ExpertQuickBar displayName={expert.displayName} openQueueCount={openQueueCount} />
      )}

      {/* Hero */}
      <section className="pt-[var(--space-3xl)] pb-[var(--space-2xl)]">
        <div className="u-container">
          <div className="mb-[var(--space-m)]">
            <h1 className="text-step-4 font-bold text-white mb-3">
              What are you building?
            </h1>
            <p className="text-[var(--earth-sand)] text-step-1">
              Describe your project and we&apos;ll put together a plan — building codes, materials list, and how-tos included.
            </p>
          </div>
          <LandingHero />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[var(--space-l)]">
        <div className="u-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <AppLogo variant="dark" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                About
              </Button>
              <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                Become an Expert
              </Button>
              <span className="text-white/30 text-sm pl-2">Powered by Claude AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
