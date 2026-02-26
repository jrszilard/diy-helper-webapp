'use client';

import { useState } from 'react';
import { Loader2, MessageSquarePlus, CheckCircle, X, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TierUpgradeModalProps {
  questionId: string;
  currentTier: number;
  nextTier: number;
  upgradeCostCents: number;
  upgradeDescription: string;
  diyerMessageCount: number;
  onUpgradeSuccess: (newTier: number) => void;
  onDecline: () => void;
}

const TIER_BENEFITS: Record<number, string[]> = {
  2: [
    'Continue with follow-up questions',
    'Expert stays dedicated to your question',
    'Full conversation history preserved',
    'All answers documented in your project record',
  ],
  3: [
    'Deep-dive guidance on complex aspects',
    'Expert provides detailed, personalized advice',
    'Priority response from your assigned expert',
    'Complete project documentation',
  ],
};

export default function TierUpgradeModal({
  questionId,
  currentTier,
  nextTier,
  upgradeCostCents,
  upgradeDescription,
  diyerMessageCount,
  onUpgradeSuccess,
  onDecline,
}: TierUpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to continue.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/qa/${questionId}/tier-upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetTier: nextTier }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpgradeSuccess(data.currentTier);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Upgrade failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = TIER_BENEFITS[nextTier] || TIER_BENEFITS[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C67B5C] to-[#A65D3F] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle size={20} />
              <h3 className="font-semibold text-lg">Unlock {upgradeDescription}</h3>
            </div>
            <button
              onClick={onDecline}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Context */}
          <div className="bg-[#F5F0E6] rounded-lg p-3">
            <p className="text-sm text-[#3E2723]">
              Your conversation has grown deeper with <span className="font-semibold">{diyerMessageCount} follow-up messages</span>.
              Upgrade to keep the dialogue going.
            </p>
          </div>

          {/* What you get */}
          <div>
            <p className="text-xs font-semibold text-[#7D6B5D] uppercase tracking-wide mb-2">
              What you get with {upgradeDescription}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-[#4A7C59] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#3E2723]">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Value comparison */}
          <div className="flex items-center justify-between bg-[#4A7C59]/5 rounded-lg px-3 py-2">
            <span className="text-xs text-[#7D6B5D]">A follow-up service call would cost</span>
            <span className="text-sm font-medium text-[#7D6B5D] line-through">$75-150</span>
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#3E2723]">${(upgradeCostCents / 100).toFixed(0)}</span>
              <span className="text-sm text-[#7D6B5D]">one-time</span>
            </div>
            <p className="text-xs text-[#B0A696] mt-1">
              Tier {currentTier} &rarr; Tier {nextTier} &middot; Same payment method
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 space-y-2">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#C67B5C] text-white font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MessageSquarePlus size={16} />
            )}
            {loading ? 'Processing...' : `Upgrade for $${(upgradeCostCents / 100).toFixed(0)}`}
          </button>
          <button
            onClick={onDecline}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-[#7D6B5D] hover:text-[#3E2723] transition-colors disabled:opacity-50"
          >
            No thanks, I&apos;m satisfied with the current answers
          </button>
          <p className="text-[10px] text-center text-[#B0A696]">
            If you decline, the conversation stays accessible as read-only.
            The expert can still mark it as resolved.
          </p>
        </div>
      </div>
    </div>
  );
}
