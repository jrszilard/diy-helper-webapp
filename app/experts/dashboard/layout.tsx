'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';
import AuthButton from '@/components/AuthButton';
import {
  Wrench, LayoutDashboard, MessageSquare, Mail, User, Loader2, Menu, X, Home, Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/experts/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
  { href: '/experts/dashboard/profile', label: 'My Profile', icon: User },
];

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [expertName, setExpertName] = useState<string>('');

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/chat');
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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      {/* Top header */}
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#3E2723]">DIY Helper</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-[#7D6B5D] hidden sm:inline">Expert Dashboard</span>
            <NotificationBell userId={userId} />
            <AuthButton
              user={userId ? { id: userId } : null}
              isExpert={true}
            />
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="sm:hidden p-2 text-[#7D6B5D] hover:bg-[#E8DFD0] rounded-lg"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - desktop */}
        <aside className="hidden sm:flex sm:flex-col w-56 border-r border-[#D4C8B8] bg-[#FDFBF7] min-h-[calc(100vh-57px)]">
          {/* Greeting */}
          {expertName && (
            <div className="px-4 py-3 border-b border-[#E8DFD0]">
              <p className="text-xs text-[#7D6B5D]">Welcome back,</p>
              <p className="text-sm font-semibold text-[#3E2723] truncate">{expertName}</p>
            </div>
          )}

          <nav className="p-3 space-y-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#C67B5C]/10 text-[#C67B5C]'
                      : 'text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom links */}
          <div className="p-3 border-t border-[#E8DFD0] space-y-1">
            <Link
              href="/experts"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723] transition-colors"
            >
              <Users size={16} />
              Browse Experts
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723] transition-colors"
            >
              <Home size={16} />
              Back to DIY Helper
            </Link>
          </div>
        </aside>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="sm:hidden fixed inset-x-0 top-[57px] bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-lg z-40">
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#C67B5C]/10 text-[#C67B5C]'
                        : 'text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723]'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
              <div className="border-t border-[#E8DFD0] my-2" />
              <Link
                href="/experts"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723] transition-colors"
              >
                <Users size={16} />
                Browse Experts
              </Link>
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#3E2723] transition-colors"
              >
                <Home size={16} />
                Back to DIY Helper
              </Link>
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
