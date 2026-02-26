import { marketplace as marketplaceConfig } from '@/lib/config';
import { isFeatureEnabled } from '@/lib/feature-flags';

// ── Tier Definitions ────────────────────────────────────────────────────────

export const TIER_DEFINITIONS = {
  1: { label: 'Tier 1', description: 'Initial answer + 2 follow-ups', additionalCents: 0 },
  2: { label: 'Tier 2', description: 'Extended guidance', additionalCents: 1000 },  // +$10
  3: { label: 'Tier 3', description: 'Deep-dive consultation', additionalCents: 2000 }, // +$20
} as const;

export const MAX_TIER = 3;

export interface TierGateResult {
  /** Whether the message is blocked by a tier gate */
  blocked: boolean;
  /** Current tier of the question */
  currentTier: number;
  /** Next tier if upgrade is needed */
  nextTier?: number;
  /** Additional cost in cents for the upgrade */
  upgradeCostCents?: number;
  /** Human-readable description of what the upgrade unlocks */
  upgradeDescription?: string;
  /** Number of DIYer messages sent so far */
  diyerMessageCount: number;
}

/**
 * Check if a DIYer message should be gated behind a tier upgrade.
 *
 * The tier gate is checked BEFORE the message is sent:
 * - Tier 1: Initial answer + first 2 follow-up messages from DIYer (messages 1-2)
 * - Tier 2: Unlocked at 3rd DIYer message, covers messages 3-5 (+$10)
 * - Tier 3: Unlocked at 6th DIYer message, covers messages 6+ (+$20)
 *
 * Expert messages are never gated.
 */
export function checkTierGate(params: {
  senderRole: 'diyer' | 'expert';
  currentTier: number;
  diyerMessageCount: number;
  priceCents: number;
  userId?: string;
}): TierGateResult {
  const { senderRole, currentTier, diyerMessageCount, priceCents, userId } = params;

  // Expert messages are never gated
  if (senderRole === 'expert') {
    return { blocked: false, currentTier, diyerMessageCount };
  }

  // Free questions don't have tier gates
  if (priceCents === 0) {
    return { blocked: false, currentTier, diyerMessageCount };
  }

  // Feature flag check
  if (!isFeatureEnabled('progressivePayments', userId)) {
    return { blocked: false, currentTier, diyerMessageCount };
  }

  const tier2Threshold = marketplaceConfig.tier2MessageThreshold; // default 3
  const tier3Threshold = marketplaceConfig.tier3MessageThreshold; // default 6

  // The diyerMessageCount is the count BEFORE this new message
  // So if count is 2 and threshold is 3, the NEXT message (3rd) triggers the gate
  const nextMessageNumber = diyerMessageCount + 1;

  // Check if Tier 2 gate is needed
  if (currentTier < 2 && nextMessageNumber >= tier2Threshold) {
    return {
      blocked: true,
      currentTier,
      nextTier: 2,
      upgradeCostCents: TIER_DEFINITIONS[2].additionalCents,
      upgradeDescription: TIER_DEFINITIONS[2].description,
      diyerMessageCount,
    };
  }

  // Check if Tier 3 gate is needed
  if (currentTier < 3 && nextMessageNumber >= tier3Threshold) {
    return {
      blocked: true,
      currentTier,
      nextTier: 3,
      upgradeCostCents: TIER_DEFINITIONS[3].additionalCents,
      upgradeDescription: TIER_DEFINITIONS[3].description,
      diyerMessageCount,
    };
  }

  return { blocked: false, currentTier, diyerMessageCount };
}

/**
 * Count DIYer messages in a question's conversation.
 * Used to determine tier gate state.
 */
export function countDiyerMessages(messages: Array<{ sender_role: string }>): number {
  return messages.filter(m => m.sender_role === 'diyer').length;
}

/**
 * Calculate total expert earnings across all tiers.
 */
export function calculateTotalExpertEarnings(
  tierPayments: Array<{ tier: number; amount_cents: number }>,
  platformFeeRate: number,
): number {
  return tierPayments.reduce((total, tp) => {
    const expertPayout = tp.amount_cents - Math.round(tp.amount_cents * platformFeeRate);
    return total + expertPayout;
  }, 0);
}
