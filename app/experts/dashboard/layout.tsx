'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import NotificationBell from '@/components/NotificationBell';
import AuthButton from '@/components/AuthButton';
import GlobalHeader from '@/components/GlobalHeader';
import NavLink from '@/components/ui/NavLink';
import Dropdown from '@/components/ui/Dropdown';
import Spinner from '@/components/ui/Spinner';
import { MessageSquare, Mail, Menu, Users, Home } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
];

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [expertName, setExpertName] = useState<string>('');

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirectToSignIn(router, '/experts/dashboard');
        return;
      }

      setUserId(user.id);

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
        setExpertName(data.expert.displayName || '');
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
      <div className="min-h-screen bg-nav-surface flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!ready) return null;

  const mobileMenuItems = [
    ...NAV_ITEMS.map(({ href, label, icon }) => ({ href, label, icon })),
    { href: '/experts', label: 'Browse Experts', icon: Users, dividerBefore: true },
    { href: '/', label: 'Back to DIY Helper', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-earth-cream">
      <GlobalHeader
        logoHref="/experts/dashboard"
        nav={NAV_ITEMS.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} />
        ))}
        right={
          <>
            <NotificationBell userId={userId} />
            <AuthButton
              user={userId ? { id: userId, name: expertName } : null}
              isExpert={true}
            />
            {/* Mobile: hamburger → dropdown */}
            <Dropdown
              trigger={
                <button
                  className="sm:hidden p-2 rounded-lg text-earth-brown hover:bg-earth-tan transition-colors"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>
              }
              items={mobileMenuItems}
              align="right"
            />
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
