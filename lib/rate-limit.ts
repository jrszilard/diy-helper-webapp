import { NextRequest } from 'next/server';
import { rateLimits } from '@/lib/config';

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number | null;
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = rateLimits;

// ── Upstash Redis rate limiting (distributed, survives cold starts) ──────────

let redisRatelimit: import('@upstash/ratelimit').Ratelimit | null = null;
let redisInitAttempted = false;

function getRedisRatelimiter(endpoint: string): import('@upstash/ratelimit').Ratelimit | null {
  if (redisInitAttempted) return redisRatelimit;
  redisInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // Dynamic imports are resolved at build time for Next.js,
    // but the packages are optional — if not installed, we fall back to in-memory.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Ratelimit } = require('@upstash/ratelimit');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require('@upstash/redis');

    const redis = new Redis({ url, token });
    const config = ENDPOINT_LIMITS[endpoint];
    if (!config) return null;

    redisRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(config.maxTokens, `${Math.ceil(1 / config.refillRate)}s`, config.maxTokens),
      prefix: 'rl',
    });
    return redisRatelimit;
  } catch {
    // Package not installed or Redis connection failed — fall back to in-memory
    return null;
  }
}

// ── In-memory fallback (for local dev and when Upstash is not configured) ───

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

// Global per-endpoint circuit breaker — defense against coordinated attacks
interface CircuitBreakerConfig {
  maxRequests: number;
  windowMs: number;
}

interface CircuitBreakerState {
  count: number;
  windowStart: number;
}

const CIRCUIT_BREAKER_LIMITS: Record<string, CircuitBreakerConfig> = {
  chat: { maxRequests: 200, windowMs: 60_000 },
  agents: { maxRequests: 50, windowMs: 60_000 },
  'guided-chat': { maxRequests: 200, windowMs: 60_000 },
};

const circuitBreakers = new Map<string, CircuitBreakerState>();

function checkCircuitBreaker(endpoint: string): { allowed: boolean } {
  const config = CIRCUIT_BREAKER_LIMITS[endpoint];
  if (!config) return { allowed: true };

  const now = Date.now();
  let state = circuitBreakers.get(endpoint);

  if (!state || now - state.windowStart >= config.windowMs) {
    state = { count: 0, windowStart: now };
    circuitBreakers.set(endpoint, state);
  }

  state.count++;

  if (state.count > config.maxRequests) {
    return { allowed: false };
  }

  return { allowed: true };
}

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_THRESHOLD) {
      buckets.delete(key);
    }
  }
}

function getClientIdentifier(req: NextRequest, userId: string | null): string {
  if (userId) return `user:${userId}`;

  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

function checkRateLimitInMemory(
  req: NextRequest,
  userId: string | null,
  endpoint: string
): RateLimitResult {
  cleanup();

  const circuitResult = checkCircuitBreaker(endpoint);
  if (!circuitResult.allowed) {
    return { allowed: false, remaining: 0, retryAfter: 30 };
  }

  const config = ENDPOINT_LIMITS[endpoint];
  if (!config) {
    return { allowed: true, remaining: Infinity, retryAfter: null };
  }

  const clientId = getClientIdentifier(req, userId);
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfter: null,
    };
  }

  // Calculate retry-after in seconds
  const deficit = 1 - bucket.tokens;
  const retryAfter = Math.ceil(deficit / config.refillRate);

  return {
    allowed: false,
    remaining: 0,
    retryAfter,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check rate limit for a request. Uses Upstash Redis when configured
 * (distributed, survives serverless cold starts), falls back to in-memory
 * token bucket for local development.
 */
export async function checkRateLimit(
  req: NextRequest,
  userId: string | null,
  endpoint: string
): Promise<RateLimitResult> {
  // Try Upstash Redis first
  const limiter = getRedisRatelimiter(endpoint);
  if (limiter) {
    try {
      const identifier = `${getClientIdentifier(req, userId)}:${endpoint}`;
      const { success, remaining, reset } = await limiter.limit(identifier);
      return {
        allowed: success,
        remaining,
        retryAfter: success ? null : Math.ceil((reset - Date.now()) / 1000),
      };
    } catch {
      // Redis error — fall through to in-memory
    }
  }

  // Fallback to in-memory
  return checkRateLimitInMemory(req, userId, endpoint);
}
