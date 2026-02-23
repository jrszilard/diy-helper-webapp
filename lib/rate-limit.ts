import { NextRequest } from 'next/server';
import { rateLimits } from '@/lib/config';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

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

const buckets = new Map<string, TokenBucket>();

// Global per-endpoint circuit breaker — defense against coordinated attacks
// (many different IPs hitting the same endpoint).
// TODO post-launch: migrate to Upstash Redis for distributed rate limiting

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

export function checkRateLimit(
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
