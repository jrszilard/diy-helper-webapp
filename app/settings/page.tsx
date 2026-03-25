'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import AuthButton from '@/components/AuthButton';
import NotificationBell from '@/components/NotificationBell';
import UsageBanner from '@/components/UsageBanner';
import UpgradeModal from '@/components/UpgradeModal';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import {
  Wrench, ArrowLeft, CheckCircle, AlertCircle,
  CreditCard, Zap, Settings, Crown,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

interface Subscription {
  tier: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

interface UsageData {
  reports: { used: number; limit: number };
  chatMessages: { used: number; limit: number };
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { isExpert } = useExpertStatus();

  // Show success toast if redirected from Stripe checkout
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      setToast({ type: 'success', message: 'Subscription activated! Welcome to Pro.' });
      // Clean the URL without triggering a re-render
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setToast(null), 5000);
    }
  }, [sessionId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirectToSignIn(router, '/settings');
        return;
      }
      setUser({ id: user.id, email: user.email ?? undefined });

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch subscription and usage in parallel
      const [subRes, usageRes] = await Promise.all([
        fetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription);
      }
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.usage);
      }

      setLoading(false);
    }
    init();
  }, [router]);

  const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-cream">
      {/* Header */}
      <header className="bg-surface border-b border-earth-sand shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-terracotta to-terracotta-dark p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">DIY Helper</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user?.id} />
            <AuthButton user={user} isExpert={isExpert} />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm text-earth-brown hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div className="space-y-6">
          {/* Toast */}
          {toast && (
            <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-forest-green/10 text-forest-green border border-forest-green/20'
                : 'bg-terracotta/10 text-terracotta border border-terracotta/20'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {toast.message}
            </div>
          )}

          {/* Subscription Card */}
          <div className="bg-surface rounded-2xl border border-earth-sand shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-earth-tan flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-earth-brown" />
                <h1 className="text-xl font-bold text-foreground">Settings</h1>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Plan */}
              <div>
                <h2 className="text-sm font-semibold text-earth-brown uppercase tracking-wide mb-3">
                  Current Plan
                </h2>
                <div className={`rounded-xl p-5 border ${
                  isPro
                    ? 'bg-gradient-to-br from-slate-blue/5 to-slate-blue/10 border-slate-blue/30'
                    : 'bg-earth-cream border-earth-sand'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isPro ? (
                        <div className="w-10 h-10 bg-slate-blue rounded-lg flex items-center justify-center">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-earth-tan rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-earth-brown" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {isPro ? 'Pro' : 'Free'}
                          </span>
                          {isPro && (
                            <span className="text-xs font-bold text-white bg-slate-blue px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-earth-brown">
                          {isPro
                            ? 'Unlimited reports, messages, and priority expert matching'
                            : `${usage?.reports.limit ?? 5} reports & ${usage?.chatMessages.limit ?? 30} messages per month`
                          }
                        </p>
                      </div>
                    </div>
                    {isPro ? (
                      <span className="text-lg font-bold text-foreground">
                        $9.99<span className="text-sm font-normal text-earth-brown">/mo</span>
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-forest-green">Free</span>
                    )}
                  </div>

                  {isPro && subscription?.currentPeriodEnd && (
                    <p className="text-xs text-earth-brown mt-3 pt-3 border-t border-slate-blue/20">
                      Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {!isPro && (
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-terracotta text-white px-6 py-2.5 rounded-lg hover:bg-terracotta-dark font-semibold transition"
                  >
                    <Zap className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                )}
              </div>

              {/* Usage */}
              {usage && (
                <div>
                  <h2 className="text-sm font-semibold text-earth-brown uppercase tracking-wide mb-3">
                    This Month&apos;s Usage
                  </h2>
                  <UsageBanner usage={usage} tier={subscription?.tier || 'free'} />
                </div>
              )}

              {/* Quick Links */}
              <div>
                <h2 className="text-sm font-semibold text-earth-brown uppercase tracking-wide mb-3">
                  Account
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center justify-between p-3 rounded-lg border border-earth-sand hover:bg-earth-cream transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-earth-brown" />
                      <span className="text-sm font-medium text-foreground">Edit Profile</span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted rotate-180 group-hover:text-earth-brown transition-colors" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
