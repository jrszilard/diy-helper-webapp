'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';

interface StripeOnboardBannerProps {
  stripeOnboardingComplete: boolean;
}

export default function StripeOnboardBanner({ stripeOnboardingComplete }: StripeOnboardBannerProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (stripeOnboardingComplete) return null;

  const handleOnboard = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setFeedback({ type: 'error', message: 'Sign-in required to start Stripe setup.' });
        return;
      }

      const res = await fetch('/api/experts/stripe-onboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setFeedback({ type: 'error', message: 'Could not start Stripe setup. Please try again.' });
        return;
      }

      const data = await res.json();
      if (data.testMode) {
        // Test-mode bypass — show confirmation before reload so the user
        // knows something happened. (Pre-2026-04-28 silently reloaded.)
        setFeedback({
          type: 'success',
          message: 'Test-mode setup complete. Refreshing dashboard…',
        });
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      if (data.url) {
        window.open(data.url, '_blank');
        setFeedback({
          type: 'success',
          message: 'Stripe onboarding opened in a new tab. Complete the steps there.',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Could not start Stripe setup. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
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
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-semibold rounded-lg hover:bg-amber-500/30 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Spinner size="sm" /> : <ExternalLink size={14} />}
          {loading ? 'Loading...' : 'Complete Setup'}
        </button>
      </div>
      {feedback && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-forest-green/15 border border-forest-green/30 text-forest-green'
              : 'bg-rust/15 border border-rust/30 text-rust'
          }`}
          role="status"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}
