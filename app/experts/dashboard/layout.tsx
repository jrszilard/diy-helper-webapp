'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import GlobalHeader from '@/components/GlobalHeader';
import Spinner from '@/components/ui/Spinner';

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirectToSignIn(router, '/experts/dashboard');
        return;
      }

      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/experts/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          router.push('/experts/register');
          return;
        }
        const data = await res.json();
        if (!data.expert) {
          router.push('/experts/register');
          return;
        }
      } catch {
        router.push('/experts/register');
        return;
      }

      setReady(true);
      setLoading(false);
    }
    check();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-night flex items-center justify-center">
        <Spinner size="lg" className="text-rust" />
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-earth-night">
      <div className="md:hidden">
        <GlobalHeader
          variant="dark"
          logoHref="/experts/dashboard"
        />
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
