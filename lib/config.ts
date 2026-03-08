// Central configuration — single source of truth for all tunable values.
// Every value can be overridden via environment variable.

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function envFloat(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

function envString(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function envList(key: string, fallback: string[]): string[] {
  const v = process.env[key];
  if (!v) return fallback;
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

// ── Anthropic ────────────────────────────────────────────────────────────────
export const anthropic = {
  model: envString('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
  maxTokens: envInt('ANTHROPIC_MAX_TOKENS', 4096),
} as const;

// ── Rate Limits ──────────────────────────────────────────────────────────────
export const rateLimits = {
  chat: {
    maxTokens: envInt('RATE_LIMIT_CHAT_MAX', 10),
    refillRate: envFloat('RATE_LIMIT_CHAT_REFILL', 10 / 60),
  },
  searchStores: {
    maxTokens: envInt('RATE_LIMIT_SEARCH_STORES_MAX', 20),
    refillRate: envFloat('RATE_LIMIT_SEARCH_STORES_REFILL', 20 / 60),
  },
  extractMaterials: {
    maxTokens: envInt('RATE_LIMIT_EXTRACT_MAX', 10),
    refillRate: envFloat('RATE_LIMIT_EXTRACT_REFILL', 10 / 60),
  },
  conversations: {
    maxTokens: envInt('RATE_LIMIT_CONVERSATIONS_MAX', 30),
    refillRate: envFloat('RATE_LIMIT_CONVERSATIONS_REFILL', 30 / 60),
  },
  agents: {
    maxTokens: envInt('RATE_LIMIT_AGENTS_MAX', 5),
    refillRate: envFloat('RATE_LIMIT_AGENTS_REFILL', 5 / 3600),
  },
  'guided-chat': {
    maxTokens: envInt('RATE_LIMIT_GUIDED_CHAT_MAX', 20),
    refillRate: envFloat('RATE_LIMIT_GUIDED_CHAT_REFILL', 20 / 60),
  },
  'share-public': {
    maxTokens: envInt('RATE_LIMIT_SHARE_PUBLIC_MAX', 30),
    refillRate: envFloat('RATE_LIMIT_SHARE_PUBLIC_REFILL', 30 / 60),
  },
  usage: {
    maxTokens: envInt('RATE_LIMIT_USAGE_MAX', 30),
    refillRate: envFloat('RATE_LIMIT_USAGE_REFILL', 30 / 60),
  },
  subscriptions: {
    maxTokens: envInt('RATE_LIMIT_SUBSCRIPTIONS_MAX', 10),
    refillRate: envFloat('RATE_LIMIT_SUBSCRIPTIONS_REFILL', 10 / 60),
  },
  notifications: {
    maxTokens: envInt('RATE_LIMIT_NOTIFICATIONS_MAX', 60),
    refillRate: envFloat('RATE_LIMIT_NOTIFICATIONS_REFILL', 1),
  },
  experts: {
    maxTokens: envInt('RATE_LIMIT_EXPERTS_MAX', 20),
    refillRate: envFloat('RATE_LIMIT_EXPERTS_REFILL', 20 / 60),
  },
  marketplace: {
    maxTokens: envInt('RATE_LIMIT_MARKETPLACE_MAX', 30),
    refillRate: envFloat('RATE_LIMIT_MARKETPLACE_REFILL', 30 / 60),
  },
  messages: {
    maxTokens: envInt('RATE_LIMIT_MESSAGES_MAX', 30),
    refillRate: envFloat('RATE_LIMIT_MESSAGES_REFILL', 30 / 60),
  },
} as const;

// ── CORS ─────────────────────────────────────────────────────────────────────
export const cors = {
  allowedOrigins: envList('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'https://localhost:3000',
  ]),
  vercelRegex: /^https:\/\/diy-helper[a-z0-9-]*\.vercel\.app$/,
} as const;

// ── Store Search ─────────────────────────────────────────────────────────────
export const storeSearch = {
  concurrency: envInt('STORE_SEARCH_CONCURRENCY', 3),
  chunkDelayMs: envInt('STORE_SEARCH_CHUNK_DELAY_MS', 500),
} as const;

// ── Streaming ────────────────────────────────────────────────────────────────
export const streaming = {
  chunkSize: envInt('STREAM_CHUNK_SIZE', 50),
  chunkDelayMs: envInt('STREAM_CHUNK_DELAY_MS', 15),
} as const;

// ── Conversation Pruning ─────────────────────────────────────────────────────
export const pruning = {
  maxTotalChars: envInt('PRUNE_MAX_TOTAL_CHARS', 80000),
  keepFirstMessages: envInt('PRUNE_KEEP_FIRST', 2),
  keepLastMessages: envInt('PRUNE_KEEP_LAST', 10),
  maxSingleMessageChars: envInt('PRUNE_MAX_SINGLE_MSG_CHARS', 8000),
} as const;

// ── Freemium ────────────────────────────────────────────────────────────────
export const freemium = {
  freeReportsPerMonth: envInt('FREE_REPORTS_PER_MONTH', 5),
  freeChatMessagesPerMonth: envInt('FREE_CHAT_MESSAGES_PER_MONTH', 30),
  freeSavedProjects: envInt('FREE_SAVED_PROJECTS', 5),
  proPriceCents: envInt('PRO_PRICE_CENTS', 999),
} as const;

// ── Stripe ──────────────────────────────────────────────────────────────────
export const stripe = {
  secretKey: envString('STRIPE_SECRET_KEY', ''),
  publishableKey: envString('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', ''),
  connectWebhookSecret: envString('STRIPE_CONNECT_WEBHOOK_SECRET', ''),
  paymentWebhookSecret: envString('STRIPE_PAYMENT_WEBHOOK_SECRET', ''),
  subscriptionWebhookSecret: envString('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET', ''),
} as const;

// ── Marketplace ─────────────────────────────────────────────────────────────
export const marketplace = {
  claimExpiryHours: envInt('QA_CLAIM_EXPIRY_HOURS', 2),
  autoAcceptHours: envInt('QA_AUTO_ACCEPT_HOURS', 24),
  payoutHoldHours: envInt('QA_PAYOUT_HOLD_HOURS', 24),
  /** Set to 'true' to bypass real Stripe calls and fake payment flows */
  testMode: envString('QA_PAYMENT_TEST_MODE', '') === 'true',
  /** Platform fee rate for Q&A (v2 pricing uses 18%) */
  platformFeeRate: envFloat('QA_PLATFORM_FEE_RATE', 0.18),
  /** Bid window hours for expert bidding mode */
  bidWindowHours: envInt('QA_BID_WINDOW_HOURS', 4),
  /** Max follow-up messages before tier 2 gate */
  tier2MessageThreshold: envInt('QA_TIER2_MESSAGE_THRESHOLD', 3),
  /** Max follow-up messages before tier 3 gate */
  tier3MessageThreshold: envInt('QA_TIER3_MESSAGE_THRESHOLD', 6),
} as const;

// ── Expert Subscriptions ────────────────────────────────────────────────────
export const expertSubscriptions = {
  tiers: {
    free: {
      label: 'Free',
      priceCents: 0,
      platformFeeRate: 0.18,
      queuePriority: 'standard' as const,
      features: ['Queue access', 'Standard questions'],
    },
    pro: {
      label: 'Pro',
      priceCents: 2900, // $29/mo
      platformFeeRate: 0.15,
      queuePriority: 'priority' as const,
      features: ['Priority queue', 'Analytics dashboard', '15% platform fee'],
    },
    premium: {
      label: 'Premium',
      priceCents: 7900, // $79/mo
      platformFeeRate: 0.12,
      queuePriority: 'premium' as const,
      features: ['Featured profile', 'Direct question routing', '12% platform fee', 'Project leads'],
    },
  },
} as const;

// Re-export everything as a single default for convenience
const config = { anthropic, rateLimits, cors, storeSearch, streaming, pruning, freemium, stripe, marketplace, expertSubscriptions } as const;
export default config;
