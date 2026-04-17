'use client';

import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';

interface StripeOnboardBannerProps {
  stripeOnboardingComplete: boolean;
}

export default function StripeOnboardBanner({ stripeOnboardingComplete }: StripeOnboardBannerProps) {
  const [loading, setLoading] = useState(false);

  if (stripeOnboardingComplete) return null;

  const handleOnboard = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/experts/stripe-onboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.testMode) {
          window.location.reload();
          return;
        }
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Complete Stripe Setup</p>
          <p className="text-xs text-amber-400/70">
            Set up your Stripe account to receive payments from answered questions.
          </p>
        </div>
      </div>
      <button
        onClick={handleOnboard}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-semibold rounded-lg hover:bg-amber-500/30 transition-colors whitespace-nowrap"
      >
        {loading ? <Spinner size="sm" /> : <ExternalLink size={14} />}
        {loading ? 'Loading...' : 'Complete Setup'}
      </button>
    </div>
  );
}
