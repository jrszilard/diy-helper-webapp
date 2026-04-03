'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, ChevronDown, Mail, Settings, User, LayoutDashboard } from 'lucide-react';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import Modal from '@/components/ui/Modal';
import Dropdown from '@/components/ui/Dropdown';
import Avatar from '@/components/ui/Avatar';
import { CHAT_STORAGE_KEY, CONVERSATION_ID_KEY, CHAT_USER_KEY } from '@/hooks/useChat';
import { guestStorage } from '@/lib/guestStorage';

export default function AuthButton({
  user,
  externalShowAuth,
  onAuthToggle,
  variant = 'light',
  isExpert = false,
}: {
  user: { id: string; email?: string; name?: string } | null;
  externalShowAuth?: boolean;
  onAuthToggle?: (show: boolean) => void;
  variant?: 'light' | 'dark';
  isExpert?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [internalShowAuth, setInternalShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isExpertReferral, setIsExpertReferral] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const showAuth = externalShowAuth !== undefined ? externalShowAuth : internalShowAuth;
  const setShowAuth = (show: boolean) => {
    if (show) {
      const referral = localStorage.getItem('expert-callout-referral');
      if (referral) {
        setIsSignUp(true);
        setIsExpertReferral(true);
      }
    } else {
      setIsExpertReferral(false);
    }
    if (onAuthToggle) {
      onAuthToggle(show);
    } else {
      setInternalShowAuth(show);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setShowAuth(false);
      setEmail('');
      setPassword('');

      const returnTo = sessionStorage.getItem('authReturnTo');
      if (returnTo) {
        sessionStorage.removeItem('authReturnTo');
        router.push(returnTo);
      } else if (!isSignUp && data.session?.access_token) {
        // Check if the user is an expert and redirect to their dashboard
        try {
          const res = await fetch('/api/experts/me', {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (res.ok) {
            const { expert } = await res.json();
            if (expert) {
              router.push('/experts/dashboard');
              return;
            }
          }
        } catch {
          // ignore — fall through to normal page reload
        }
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    // Clear chat-related localStorage to prevent stale conversations
    // from leaking across sessions / accounts
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
    localStorage.removeItem(CHAT_USER_KEY);
    guestStorage.clearAll();

    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    const isDark = variant === 'dark';

    const items = isExpert
      ? [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/experts/dashboard' },
          { label: 'My Profile', icon: User, href: '/experts/dashboard/profile' },
          { label: 'Settings', icon: Settings, href: '/settings' },
          { label: 'Sign Out', icon: LogOut, onClick: handleSignOut, danger: true, dividerBefore: true },
        ]
      : [
          { label: 'My Profile', icon: User, href: '/profile' },
          { label: 'Settings', icon: Settings, href: '/settings' },
          { label: 'Messages', icon: Mail, href: '/messages' },
          { label: 'Sign Out', icon: LogOut, onClick: handleSignOut, danger: true, dividerBefore: true },
        ];

    const displayName = user.name || user.email?.split('@')[0] || 'Account';

    return (
      <Dropdown
        trigger={
          <span
            className={`flex items-center gap-2 cursor-pointer transition ${
              isDark
                ? 'text-earth-sand hover:text-white'
                : 'text-[var(--earth-brown-dark)] hover:text-terracotta'
            }`}
            role="button"
            aria-label="Account menu"
          >
            <Avatar name={displayName} size="sm" />
            <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
            <ChevronDown className="w-4 h-4" />
          </span>
        }
        items={items}
      />
    );
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setShowAuth(true)}>
        Sign In
      </Button>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)}>
        {/* Tab toggle */}
        <div className="flex mb-5 bg-earth-tan rounded-xl p-1">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-white text-foreground shadow-sm'
                : 'text-earth-brown hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              isSignUp
                ? 'bg-white text-foreground shadow-sm'
                : 'text-earth-brown hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Header text */}
        <p className="text-sm text-earth-brown mb-5 text-center">
          {isSignUp
            ? isExpertReferral
              ? 'Sign up to ask a verified expert — your first question is free!'
              : 'Create a free account to get started'
            : 'Welcome back! Sign in to continue'}
        </p>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <TextInput
            id="auth-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            inputSize="lg"
            fullWidth
            required
          />

          <div>
            <TextInput
              id="auth-password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              inputSize="lg"
              fullWidth
              required
              minLength={8}
            />
            {isSignUp && (
              <p className="text-xs text-earth-brown mt-1">At least 8 characters</p>
            )}
            {!isSignUp && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) { alert('Enter your email first'); return; }
                  await supabase.auth.resetPasswordForEmail(email);
                  alert('Check your email for a password reset link');
                }}
                className="text-xs text-slate-blue hover:underline mt-1"
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
