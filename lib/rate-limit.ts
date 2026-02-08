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

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

export function checkRateLimit(
  req: NextRequest,
  userId: string | null,
  endpoint: string
): RateLimitResult {
  cleanup();

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
