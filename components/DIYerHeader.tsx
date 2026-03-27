'use client';

import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import GlobalHeader from './GlobalHeader';
import NotificationBell from './NotificationBell';
import AuthButton from './AuthButton';
import Button from './ui/Button';

const NAV_ITEMS = [
  { href: '/chat', label: 'Chat' },
  { href: '/marketplace/qa', label: 'Ask an Expert' },
  { href: '/experts', label: 'Find an Expert' },
];

interface DIYerHeaderProps {
  /** Extra items to inject before NotificationBell (e.g. My Tools, shopping cart) */
  extraRight?: ReactNode;
  /** Extra item on the left side of the logo (e.g. mobile hamburger) */
  left?: ReactNode;
  /** Pass true when the current user is also an expert, affects AuthButton */
  isExpert?: boolean;
}

export default function DIYerHeader({ extraRight, left, isExpert = false }: DIYerHeaderProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GlobalHeader
      variant="dark"
      left={left}
      nav={NAV_ITEMS.map(({ href, label }) => (
        <Button
          key={href}
          variant="ghost"
          href={href}
          size="sm"
          className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10"
        >
          {label}
        </Button>
      ))}
      right={
        <>
          {extraRight}
          <NotificationBell userId={user?.id} />
          <AuthButton user={user} isExpert={isExpert} variant="dark" />
        </>
      }
    />
  );
}
