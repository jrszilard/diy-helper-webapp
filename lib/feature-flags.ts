// Feature flag system with env-var-based flags and percentage rollout.
// Percentage rollout uses deterministic hashing on user ID so the same
// user always gets the same result for a given flag.

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Simple deterministic hash of a string to a number 0-99. */
function hashToPercent(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

// ── Flag Definitions ──────────────────────────────────────────────────────────

export const flags = {
  /** Phase 1: Threaded conversations instead of single-shot Q&A */
  threadedConversations: envBool('FEATURE_THREADED_CONVERSATIONS', false),

  /** Phase 2: Dynamic pricing based on question complexity */
  dynamicPricing: envBool('FEATURE_DYNAMIC_PRICING', false),

  /** Phase 4: Expert bidding/proposals for complex questions */
  expertBidding: envBool('FEATURE_EXPERT_BIDDING', false),

  /** Phase 3: Progressive payment tiers as conversations deepen */
  progressivePayments: envBool('FEATURE_PROGRESSIVE_PAYMENTS', false),

  /** Phase 0: Enhanced value messaging in Q&A submission */
  qaValueMessaging: envBool('FEATURE_QA_VALUE_MESSAGING', true),

  /** Phase 0: AI chatbot escalation prompts to expert Q&A */
  aiEscalation: envBool('FEATURE_AI_ESCALATION', true),
} as const;

// ── Percentage Rollout ────────────────────────────────────────────────────────

/** Rollout percentages (0-100). 0 = off for everyone, 100 = on for everyone. */
const rolloutPercentages: Record<string, number> = {
  threadedConversations: envInt('ROLLOUT_THREADED_CONVERSATIONS', 0),
  dynamicPricing: envInt('ROLLOUT_DYNAMIC_PRICING', 0),
  expertBidding: envInt('ROLLOUT_EXPERT_BIDDING', 0),
  progressivePayments: envInt('ROLLOUT_PROGRESSIVE_PAYMENTS', 0),
};

/**
 * Check if a feature flag is enabled for a specific user.
 *
 * If the flag is globally enabled via env var, returns true.
 * Otherwise, checks percentage rollout using the user ID.
 * If no userId is provided, falls back to global flag only.
 */
export function isFeatureEnabled(
  flag: keyof typeof flags,
  userId?: string,
): boolean {
  // Global kill switch / enable
  if (flags[flag]) return true;

  // Percentage rollout
  const pct = rolloutPercentages[flag];
  if (pct !== undefined && pct > 0 && userId) {
    return hashToPercent(`${flag}:${userId}`) < pct;
  }

  return false;
}

/**
 * Client-safe subset of feature flags.
 * Only include flags that the frontend needs to read.
 */
export function getClientFlags(userId?: string): Record<string, boolean> {
  return {
    threadedConversations: isFeatureEnabled('threadedConversations', userId),
    dynamicPricing: isFeatureEnabled('dynamicPricing', userId),
    expertBidding: isFeatureEnabled('expertBidding', userId),
    progressivePayments: isFeatureEnabled('progressivePayments', userId),
    qaValueMessaging: isFeatureEnabled('qaValueMessaging', userId),
    aiEscalation: isFeatureEnabled('aiEscalation', userId),
  };
}
