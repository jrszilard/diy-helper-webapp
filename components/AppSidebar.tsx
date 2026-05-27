'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FolderOpen, Package, HelpCircle, ShoppingCart, Users, MessageSquare, Mail, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import AppLogo from './AppLogo';
import AuthButton from './AuthButton';
import NotificationBell from './NotificationBell';

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>
      {label}
    </p>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const { isExpert, expert } = useExpertStatus();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [materialsCount, setMaterialsCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setMaterialsCount((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('diy:materialsCount', handler);
    return () => window.removeEventListener('diy:materialsCount', handler);
  }, []);

  // The hamburger that opens this drawer now lives in the header bar
  // (MobileNavToggle), decoupled via this event so it rides with the sticky
  // header instead of floating over the BetaBanner.
  useEffect(() => {
    const handler = () => setMobileOpen((open) => !open);
    window.addEventListener('diy:toggleMobileNav', handler);
    return () => window.removeEventListener('diy:toggleMobileNav', handler);
  }, []);

  const navItem = (label: string, icon: React.ReactNode, href: string, badge?: number) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <button
        onClick={() => { setMobileOpen(false); router.push(href); }}
        className={`w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium transition-colors ${
          isActive ? 'bg-white/[0.08] text-white' : 'text-white/[0.35] hover:text-[var(--muted)] hover:bg-white/[0.04]'
        }`}
        style={{ fontSize: 13, lineHeight: 1 }}
      >
        {icon}
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto w-4 h-4 bg-rust text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${mobileOpen ? 'flex' : 'hidden'} md:flex fixed left-0 top-0 bottom-0 w-72 md:w-64 bg-[#2F2823] border-r border-white/[0.06] flex-col z-40`}>
        <div className="px-[14px] pt-4 pb-3">
          <AppLogo />
        </div>

        {user && (
          <nav className="px-2 flex-1 overflow-y-auto">
            <SectionLabel label="DIY" />
            {navItem('My Projects', <FolderOpen size={16} />, '/projects')}
            {navItem('My Tools', <Package size={16} />, '/tools')}
            {navItem('Shopping', <ShoppingCart size={16} />, '/shopping', materialsCount)}

            <SectionLabel label="Experts" />
            <button
              onClick={() => { setMobileOpen(false); router.push('/experts'); }}
              className={`w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium transition-colors ${
                pathname === '/experts' ? 'bg-white/[0.08] text-white' : 'text-white/[0.35] hover:text-[var(--muted)] hover:bg-white/[0.04]'
              }`}
              style={{ fontSize: 13, lineHeight: 1 }}
            >
              <Users size={16} />
              Find an Expert
            </button>
            {navItem('My Questions', <HelpCircle size={16} />, '/questions')}

            {isExpert && (
              <>
                <SectionLabel label="Expert" />
                {[
                  { href: '/experts/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
                  { href: '/experts/dashboard/reviews', label: 'AI Review Queue', icon: ClipboardCheck },
                  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium transition-colors ${
                      pathname === href || pathname.startsWith(href + '/') ? 'bg-white/[0.08] text-white' : 'text-white/[0.35] hover:text-[var(--muted)] hover:bg-white/[0.04]'
                    }`}
                    style={{ fontSize: 13, lineHeight: 1 }}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        )}

        {/* Bottom: notifications + auth */}
        <div className="mt-auto px-[14px] py-3 border-t border-white/[0.06] flex items-center gap-2">
          <NotificationBell userId={user?.id} placement="top" />
          <div className="flex-1">
            <AuthButton user={user ? { ...user, name: expert?.displayName ?? user.name } : null} variant="dark" isExpert={isExpert} dropdownPlacement="top" />
          </div>
        </div>
      </aside>
    </>
  );
}
