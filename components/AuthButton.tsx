'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, LogOut, X, ChevronDown, FolderOpen, MessageSquare, Mail, Users, Award, LayoutDashboard, Settings } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';

export default function AuthButton({
  user,
  externalShowAuth,
  onAuthToggle,
  variant = 'light',
  isExpert = false,
}: {
  user: { id: string; email?: string } | null;
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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // SSR-safe portal mount
  useEffect(() => setPortalMounted(true), []);

  // Escape key to close auth modal
  useEffect(() => {
    const showAuth = externalShowAuth !== undefined ? externalShowAuth : internalShowAuth;
    if (!showAuth) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onAuthToggle) onAuthToggle(false);
        else setInternalShowAuth(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [externalShowAuth, internalShowAuth, onAuthToggle]);

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

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setShowAuth(false);
      setEmail('');
      setPassword('');
      // Redirect to return URL if set by auth redirect
      const returnTo = sessionStorage.getItem('authReturnTo');
      if (returnTo) {
        sessionStorage.removeItem('authReturnTo');
        router.push(returnTo);
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    const isDark = variant === 'dark';
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2 transition ${
            isDark
              ? 'text-earth-sand hover:text-white'
              : 'text-foreground hover:text-terracotta'
          }`}
          aria-label="Account menu"
          aria-expanded={showDropdown}
        >
          <User className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">{user.email}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-xl border border-earth-sand py-1 z-50">
            <a
              href="/chat"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-earth-brown" />
              My Projects
            </a>
            <Link
              href="/marketplace/qa"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <MessageSquare className="w-4 h-4 text-earth-brown" />
              My Questions
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <User className="w-4 h-4 text-earth-brown" />
              My Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Settings className="w-4 h-4 text-earth-brown" />
              Settings
            </Link>
            <Link
              href="/messages"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Mail className="w-4 h-4 text-earth-brown" />
              Messages
            </Link>
            <Link
              href="/experts"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Users className="w-4 h-4 text-earth-brown" />
              Find an Expert
            </Link>
            {isExpert ? (
              <>
                <Link
                  href="/experts/dashboard"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <LayoutDashboard className="w-4 h-4 text-earth-brown" />
                  Expert Dashboard
                </Link>
                <Link
                  href="/experts/dashboard/qa"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <MessageSquare className="w-4 h-4 text-earth-brown" />
                  Q&A Queue
                </Link>
              </>
            ) : (
              <Link
                href="/experts/register"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-earth-cream transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Award className="w-4 h-4 text-earth-brown" />
                Become an Expert
              </Link>
            )}
            <div className="border-t border-earth-tan my-1" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rust hover:bg-[var(--status-progress-bg)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setShowAuth(true)}>
        Sign In
      </Button>

      {showAuth && portalMounted && createPortal(
        <div
          className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
        >
          <div className="bg-surface rounded-2xl max-w-md w-full shadow-2xl border border-earth-sand overflow-hidden">
            {/* Close button */}
            <div className="flex justify-end p-3 pb-0">
              <button
                onClick={() => setShowAuth(false)}
                className="p-1.5 hover:bg-earth-tan rounded-lg transition"
                aria-label="Close sign in dialog"
              >
                <X className="w-5 h-5 text-earth-brown" />
              </button>
            </div>

            {/* Tab toggle */}
            <div className="flex mx-6 mb-4 bg-[#EDE7DB] rounded-xl p-1">
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

            <div className="px-6 pb-6">
              {/* Header text */}
              <p className="text-sm text-earth-brown mb-5 text-center">
                {isSignUp
                  ? isExpertReferral
                    ? 'Sign up to ask a verified expert — your first question is free!'
                    : 'Create a free account to get started'
                  : 'Welcome back! Sign in to continue'}
              </p>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Email
                  </label>
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    inputSize="lg"
                    fullWidth
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Password
                  </label>
                  <TextInput
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
