'use client';

import Link from 'next/link';
import { Award, ArrowUpRight, Sparkles } from 'lucide-react';

interface ExpertTierBadgeProps {
  expertLevel: string;
  reputationScore: number;
  subscriptionTier: string;
}

const LEVEL_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const SUBSCRIPTION_LABELS: Record<string, { label: string; perks: string }> = {
  free: { label: 'Free', perks: 'standard queue' },
  pro: { label: 'Pro', perks: 'priority queue, lower platform fee' },
  premium: { label: 'Premium', perks: 'top of queue, lowest platform fee' },
};

export default function ExpertTierBadge({
  expertLevel,
  reputationScore,
  subscriptionTier,
}: ExpertTierBadgeProps) {
  const levelLabel = LEVEL_LABELS[expertLevel] ?? expertLevel;
  const sub = SUBSCRIPTION_LABELS[subscriptionTier] ?? SUBSCRIPTION_LABELS.free;
  const onFreeTier = subscriptionTier === 'free';

  return (
    <div className="bg-white/5 border border-white/[0.08] rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
          <Award size={20} className="text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {levelLabel} expert · {sub.label}
          </p>
          <p className="text-xs text-white/50 truncate">
            {reputationScore > 0
              ? `Reputation ${reputationScore.toFixed(0)} · ${sub.perks}`
              : sub.perks}
          </p>
        </div>
      </div>
      {onFreeTier ? (
        <Link
          href="/experts/dashboard/subscription"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rust/15 border border-rust/30 text-rust text-xs font-semibold rounded-lg hover:bg-rust/25 transition-colors whitespace-nowrap"
        >
          <Sparkles size={12} />
          Upgrade
          <ArrowUpRight size={12} />
        </Link>
      ) : (
        <Link
          href="/experts/dashboard/subscription"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
        >
          Manage
          <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}
