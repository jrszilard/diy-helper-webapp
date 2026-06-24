import { describe, it, expect, vi, beforeEach } from 'vitest';

let counter = 0;
const incr = vi.fn(async () => ++counter);
const expire = vi.fn(async () => 1);
vi.mock('@upstash/redis', () => ({ Redis: class { incr = incr; expire = expire; } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe('checkAnonAiBudget', () => {
  beforeEach(() => {
    counter = 0;
    incr.mockClear();
    expire.mockClear();
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    process.env.ANON_AI_DAILY_LIMIT = '3';
  });

  it('allows up to the daily limit, then blocks (caps total anon spend across all IPs)', async () => {
    const { checkAnonAiBudget } = await import('@/lib/anon-budget');
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 1
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 2
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 3
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(false); // 4 > limit
    // TTL is set exactly once (on the first increment of the day's key).
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it('fails open when Upstash is not configured (never blocks legit traffic on misconfig)', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const { checkAnonAiBudget } = await import('@/lib/anon-budget');
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true);
    expect(incr).not.toHaveBeenCalled();
  });
});
