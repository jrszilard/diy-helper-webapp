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
  model: envString('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929'),
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
} as const;

// ── CORS ─────────────────────────────────────────────────────────────────────
export const cors = {
  allowedOrigins: envList('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'https://localhost:3000',
  ]),
  vercelRegex: /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
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

// Re-export everything as a single default for convenience
const config = { anthropic, rateLimits, cors, storeSearch, streaming, pruning } as const;
export default config;
