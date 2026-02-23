'use client';

import { useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
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
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Complete Stripe Setup</p>
          <p className="text-xs text-amber-700">
            Set up your Stripe account to receive payments from answered questions.
          </p>
        </div>
      </div>
      <button
        onClick={handleOnboard}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ExternalLink size={14} />
        )}
        {loading ? 'Loading...' : 'Complete Setup'}
      </button>
    </div>
  );
}
