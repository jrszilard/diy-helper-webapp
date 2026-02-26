import { scoreDifficulty, type DifficultyResult } from '@/lib/marketplace/difficulty-scorer';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { marketplace as marketplaceConfig, expertSubscriptions } from '@/lib/config';
import type { ExpertContext } from '@/lib/marketplace/types';

// ── V2 Pricing Tiers ──────────────────────────────────────────────────────

export const QA_PRICING_V2 = {
  platformFeeRate: marketplaceConfig.platformFeeRate, // 0.18 (18%)
  tiers: {
    standard: {
      label: 'Standard',
      priceCents: 1500,       // $15
      difficultyRange: [1, 3] as const,
    },
    complex: {
      label: 'Complex',
      priceCents: 2500,       // $25
      difficultyRange: [4, 6] as const,
    },
    specialist: {
      label: 'Specialist',
      priceCents: 4500,       // $45
      difficultyRange: [7, 10] as const,
    },
  },
} as const;

export interface PricingResult {
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
  tier: 'standard' | 'complex' | 'specialist';
  tierLabel: string;
  difficulty: DifficultyResult;
  /** Effective hourly rate assuming ~5min per answer */
  effectiveHourlyRateCents: number;
}

/**
 * Calculate the dynamic price for a Q&A question.
 *
 * When the dynamicPricing feature flag is disabled, falls back to
 * the legacy flat pricing via calculateQAPrice().
 */
export function calculateDynamicPrice(params: {
  context: ExpertContext | null;
  category: string;
  questionText: string;
  photoCount: number;
  userId?: string;
}): PricingResult {
  const difficulty = scoreDifficulty(params);
  const tierDef = QA_PRICING_V2.tiers[difficulty.tier];

  const priceCents = tierDef.priceCents;
  const platformFeeCents = Math.round(priceCents * QA_PRICING_V2.platformFeeRate);
  const expertPayoutCents = priceCents - platformFeeCents;

  // Effective hourly rate: assuming ~5 minutes per answer
  const effectiveHourlyRateCents = expertPayoutCents * 12; // 12 five-minute slots per hour

  return {
    priceCents,
    platformFeeCents,
    expertPayoutCents,
    tier: difficulty.tier,
    tierLabel: tierDef.label,
    difficulty,
    effectiveHourlyRateCents,
  };
}

/**
 * Get pricing for a question, respecting the feature flag.
 * When dynamicPricing is off, returns legacy pricing.
 * When on, returns dynamic pricing based on difficulty.
 */
export function getQuestionPricing(params: {
  context: ExpertContext | null;
  category: string;
  questionText: string;
  photoCount: number;
  userId?: string;
}): {
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
  tier?: string;
  tierLabel?: string;
  difficultyScore?: number;
  factors?: string[];
} {
  if (isFeatureEnabled('dynamicPricing', params.userId)) {
    const result = calculateDynamicPrice(params);
    return {
      priceCents: result.priceCents,
      platformFeeCents: result.platformFeeCents,
      expertPayoutCents: result.expertPayoutCents,
      tier: result.tier,
      tierLabel: result.tierLabel,
      difficultyScore: result.difficulty.score,
      factors: result.difficulty.factors,
    };
  }

  // Legacy flat pricing
  const CODE_SPECIFIC = ['electrical', 'plumbing', 'hvac', 'roofing', 'concrete'];
  // Import inline to avoid circular dependency (constants re-exports from this file)
  const legacyPricing = { generalCents: 500, codeSpecificCents: 800, platformFeeRate: 0.20 };
  const priceCents = CODE_SPECIFIC.includes(params.category)
    ? legacyPricing.codeSpecificCents
    : legacyPricing.generalCents;
  const platformFeeCents = Math.round(priceCents * legacyPricing.platformFeeRate);
  const expertPayoutCents = priceCents - platformFeeCents;

  return { priceCents, platformFeeCents, expertPayoutCents };
}

/**
 * Recalculate platform fee and expert payout using the expert's subscription tier.
 * Subscription tiers reduce the platform fee rate for Pro (15%) and Premium (12%).
 */
export function applySubscriptionFeeRate(
  priceCents: number,
  subscriptionTier: 'free' | 'pro' | 'premium' = 'free',
): { platformFeeCents: number; expertPayoutCents: number; feeRate: number } {
  const tierConfig = expertSubscriptions.tiers[subscriptionTier] || expertSubscriptions.tiers.free;
  const feeRate = tierConfig.platformFeeRate;
  const platformFeeCents = Math.round(priceCents * feeRate);
  const expertPayoutCents = priceCents - platformFeeCents;
  return { platformFeeCents, expertPayoutCents, feeRate };
}
