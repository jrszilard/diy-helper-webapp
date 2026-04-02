'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import UsageBanner from '@/components/UsageBanner';
import UpgradeModal from '@/components/UpgradeModal';
import DIYerHeader from '@/components/DIYerHeader';
import {
  ArrowLeft, CreditCard, Zap, Crown,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';

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
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
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
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          href="/"
          leftIcon={ArrowLeft}
          size="sm"
          className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 mb-6"
        >
          Back to Chat
        </Button>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Settings</h2>

          {toast && (
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>
              {toast.message}
            </Alert>
          )}

          {/* Current Plan */}
          <div>
            <p className="text-sm font-semibold text-[var(--earth-sand)] uppercase tracking-wide mb-3">
              Current Plan
            </p>
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
                      {isPro && <Badge variant="solid">Active</Badge>}
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
              <Button
                variant="primary"
                leftIcon={Zap}
                onClick={() => setShowUpgrade(true)}
                className="mt-4"
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Usage */}
          {usage && (
            <div>
              <p className="text-sm font-semibold text-[var(--earth-sand)] uppercase tracking-wide mb-3">
                This Month&apos;s Usage
              </p>
              <UsageBanner usage={usage} tier={subscription?.tier || 'free'} />
            </div>
          )}

          {/* Account */}
          <div>
            <p className="text-sm font-semibold text-[var(--earth-sand)] uppercase tracking-wide mb-3">
              Account
            </p>
            <div className="space-y-2">
              <Link
                href="/profile"
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--blueprint-grid-major)] hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-[var(--earth-sand)]" />
                  <span className="text-sm font-medium text-white">Edit Profile</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--earth-sand)] rotate-180 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
