import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// We need to mock the config module before importing rate-limit
vi.mock('@/lib/config', () => ({
  rateLimits: {
    chat: { maxTokens: 3, refillRate: 1 }, // 1 token/sec for easy testing
    searchStores: { maxTokens: 5, refillRate: 2 },
  },
}));

// Import after mock is set up
const { checkRateLimit } = await import('../rate-limit');

// Helper to create a minimal NextRequest-like object
function mockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get(name: string) {
        return headers[name] || null;
      },
    },
  } as unknown as NextRequest;
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset module-level bucket state between tests by waiting > stale threshold
    // In practice, we just call with unique identifiers per test
  });

  it('allows requests within the limit', () => {
    const req = mockRequest();
    const result = checkRateLimit(req, 'user-allow-1', 'chat');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 max - 1 consumed = 2
    expect(result.retryAfter).toBeNull();
  });

  it('blocks requests when tokens are exhausted', () => {
    const req = mockRequest();
    const userId = 'user-exhaust-1';

    // Consume all 3 tokens
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');

    // 4th request should be blocked
    const result = checkRateLimit(req, userId, 'chat');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('uses IP when userId is null', () => {
    const req = mockRequest({ 'x-forwarded-for': '1.2.3.4' });

    // Should use ip:1.2.3.4 as key — different from any user key
    const result = checkRateLimit(req, null, 'chat');
    expect(result.allowed).toBe(true);
  });

  it('uses x-real-ip as fallback', () => {
    const req = mockRequest({ 'x-real-ip': '5.6.7.8' });

    const result = checkRateLimit(req, null, 'chat');
    expect(result.allowed).toBe(true);
  });

  it('allows unknown endpoints', () => {
    const req = mockRequest();
    const result = checkRateLimit(req, 'user-unknown-1', 'nonexistent');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it('different endpoints have independent buckets', () => {
    const req = mockRequest();
    const userId = 'user-independent-1';

    // Exhaust chat tokens (max: 3)
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');

    // searchStores should still have tokens (max: 5)
    const result = checkRateLimit(req, userId, 'searchStores');
    expect(result.allowed).toBe(true);
  });

  it('refills tokens over time', async () => {
    const req = mockRequest();
    const userId = 'user-refill-1';

    // Exhaust all tokens
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');
    checkRateLimit(req, userId, 'chat');
    const blocked = checkRateLimit(req, userId, 'chat');
    expect(blocked.allowed).toBe(false);

    // Wait for refill (1 token/sec, need 1+ token)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = checkRateLimit(req, userId, 'chat');
    expect(result.allowed).toBe(true);
  });
});
