'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import SectionHeader from '@/components/ui/SectionHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';

interface TierOption {
  tier: 'free' | 'pro' | 'premium';
  label: string;
  priceCents: number;
  platformFeeRate: number;
  features: string[];
}

interface SubscriptionResponse {
  currentTier: 'free' | 'pro' | 'premium';
  platformFeeRate: number;
  features: string[];
  expiresAt: string | null;
  startedAt: string | null;
  availableTiers: TierOption[];
}

export default function ExpertSubscriptionPage() {
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch('/api/experts/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSelectTier = async (tier: 'pro' | 'premium') => {
    setError(null);
    setActioning(tier);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Sign-in required.');
        return;
      }
      const origin = window.location.origin;
      const res = await fetch('/api/experts/subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          successUrl: `${origin}/experts/dashboard/subscription?success=true`,
          cancelUrl: `${origin}/experts/dashboard/subscription`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not start checkout.');
        return;
      }
      const body = await res.json();
      if (body.url) window.location.href = body.url;
    } catch {
      setError('Could not start checkout.');
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <Alert variant="error">Failed to load subscription info.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader size="lg" title="Subscription" className="text-white" />

      <div className="bg-white/5 border border-white/[0.08] rounded-lg p-4">
        <p className="text-sm text-white/60">
          Current tier:{' '}
          <span className="font-semibold text-white capitalize">{data.currentTier}</span>
          {data.expiresAt && (
            <>
              {' '}· renews {new Date(data.expiresAt).toLocaleDateString()}
            </>
          )}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid md:grid-cols-3 gap-4">
        {data.availableTiers.map((t) => {
          const isCurrent = t.tier === data.currentTier;
          const isPaid = t.priceCents > 0;
          return (
            <div
              key={t.tier}
              className={`bg-white/5 border rounded-lg p-5 flex flex-col ${
                isCurrent ? 'border-rust' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white capitalize">{t.label}</h3>
                {isCurrent && (
                  <span className="text-xs font-medium text-rust">Current</span>
                )}
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {t.priceCents === 0 ? 'Free' : `$${(t.priceCents / 100).toFixed(0)}`}
                {isPaid && <span className="text-sm font-normal text-white/40">/mo</span>}
              </p>
              <p className="text-xs text-white/40 mb-4">
                {(t.platformFeeRate * 100).toFixed(0)}% platform fee
              </p>
              <ul className="space-y-2 mb-4 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/70">
                    <Check size={14} className="text-forest-green mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && isPaid && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  leftIcon={Sparkles}
                  iconSize={14}
                  disabled={actioning === t.tier}
                  onClick={() => handleSelectTier(t.tier as 'pro' | 'premium')}
                >
                  {actioning === t.tier ? 'Loading…' : `Upgrade to ${t.label}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
