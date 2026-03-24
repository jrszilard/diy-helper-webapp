'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import NotificationBell from '@/components/NotificationBell';
import AuthButton from '@/components/AuthButton';
import GlobalHeader from '@/components/GlobalHeader';
import IconButton from '@/components/ui/IconButton';
import NavLink from '@/components/ui/NavLink';
import {
  LayoutDashboard, MessageSquare, Mail, User, Menu, X, Home, Users,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

const NAV_ITEMS = [
  { href: '/experts/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
  { href: '/experts/dashboard/profile', label: 'My Profile', icon: User },
];

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-earth-cream">
      {/* Top header */}
      <GlobalHeader
        right={
          <>
            <span className="text-xs font-medium text-earth-brown hidden sm:inline">Expert Dashboard</span>
            <NotificationBell userId={userId} />
            <AuthButton
              user={userId ? { id: userId } : null}
              isExpert={true}
            />
            <IconButton
              icon={mobileNavOpen ? X : Menu}
              iconSize={20}
              label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="sm:hidden"
            />
          </>
        }
      />

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - desktop */}
        <aside className="hidden sm:flex sm:flex-col w-56 border-r border-earth-sand bg-nav-surface min-h-[calc(100vh-57px)]">
          {/* Greeting */}
          {expertName && (
            <div className="px-4 py-3 border-b border-earth-tan">
              <p className="text-xs text-earth-brown">Welcome back,</p>
              <p className="text-sm font-semibold text-foreground truncate">{expertName}</p>
            </div>
          )}

          <nav className="p-3 space-y-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon }) => (
              <NavLink key={href} href={href} label={label} icon={icon} />
            ))}
          </nav>

          {/* Bottom links */}
          <div className="p-3 border-t border-earth-tan space-y-1">
            <NavLink href="/experts" label="Browse Experts" icon={Users} />
            <NavLink href="/" label="Back to DIY Helper" icon={Home} />
          </div>
        </aside>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="sm:hidden fixed inset-x-0 top-[57px] bg-nav-surface border-b border-earth-sand shadow-lg z-40">
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  onClick={() => setMobileNavOpen(false)}
                />
              ))}
              <div className="border-t border-earth-tan my-2" />
              <NavLink
                href="/experts"
                label="Browse Experts"
                icon={Users}
                onClick={() => setMobileNavOpen(false)}
              />
              <NavLink
                href="/"
                label="Back to DIY Helper"
                icon={Home}
                onClick={() => setMobileNavOpen(false)}
              />
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
