'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, LogOut, X, Mail } from 'lucide-react';

export default function AuthButton({
  user,
  externalShowAuth,
  onAuthToggle
}: {
  user: { id: string; email?: string } | null;
  externalShowAuth?: boolean;
  onAuthToggle?: (show: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [internalShowAuth, setInternalShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const showAuth = externalShowAuth !== undefined ? externalShowAuth : internalShowAuth;
  const setShowAuth = (show: boolean) => {
    if (onAuthToggle) {
      onAuthToggle(show);
    } else {
      setInternalShowAuth(show);
    }
  };

  // Get the proper redirect URL, avoiding chrome-extension:// URLs
  const getRedirectUrl = () => {
    const origin = window.location.origin;
    // If we're in a chrome extension context, use a fallback
    if (origin.startsWith('chrome-extension://')) {
      // Fall back to the current host without the extension protocol
      // or use a configured base URL
      console.warn('Detected chrome-extension context, using alternative redirect');
      return undefined; // Let Supabase use its default redirect
    }
    return `${origin}/chat`;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectTo = getRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : {}
      });
      if (error) {
        console.error('Google sign in error:', error);
        alert('Google sign in not configured yet. Please use email/password.');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      alert('An error occurred during sign in. Please try again.');
    }
    setLoading(false);
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
      if (isSignUp) {
        alert('Account created! You can now sign in.');
        setIsSignUp(false);
      } else {
        setShowAuth(false);
      }
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-[#3E2723] hover:text-[#C67B5C] transition"
        aria-label="Sign out"
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline">{user.email}</span>
        <LogOut className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuth(true)}
        className="bg-[#5D7B93] text-white px-6 py-2 rounded-lg hover:bg-[#4A6275] font-semibold transition"
      >
        Sign In
      </button>

      {showAuth && (
        <div className="fixed inset-0 bg-[#3E2723]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FDFBF7] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#D4C8B8]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#3E2723]">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h3>
              <button
                onClick={() => setShowAuth(false)}
                className="p-1 hover:bg-[#E8DFD0] rounded-lg transition"
                aria-label="Close sign in dialog"
              >
                <X className="w-5 h-5 text-[#7D6B5D]" />
              </button>
            </div>

            {/* Google Sign In - Shows only if configured */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#D4C8B8] rounded-lg px-4 py-3 hover:bg-[#F5F0E6] font-semibold transition disabled:opacity-50 mb-4 text-[#3E2723]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#D4C8B8]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#FDFBF7] text-[#7D6B5D]">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#3E2723] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-[#D4C8B8] rounded-lg px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3E2723] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#D4C8B8] rounded-lg px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
                  required
                  minLength={6}
                />
                <p className="text-xs text-[#7D6B5D] mt-1">At least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C67B5C] text-white px-4 py-3 rounded-lg hover:bg-[#A65D3F] font-semibold disabled:opacity-50 transition"
              >
                {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#5D7B93] hover:text-[#4A6275] text-sm font-medium"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
