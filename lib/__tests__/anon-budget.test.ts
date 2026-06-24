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

  it('allows up to the daily limit, then blocks, and reports the live count', async () => {
    const { checkAnonAiBudget } = await import('@/lib/anon-budget');
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 1
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 2
    expect((await checkAnonAiBudget('2026-06-24')).allowed).toBe(true); // 3
    const blocked = await checkAnonAiBudget('2026-06-24'); // 4 > limit
    expect(blocked.allowed).toBe(false);
    // count = limit + 1 on the first blocked request — the "trip" signal.
    expect(blocked.count).toBe(4);
    expect(blocked.limit).toBe(3);
    // TTL is set exactly once (on the first increment of the day's key).
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it('fails open with a null count when Upstash is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const { checkAnonAiBudget } = await import('@/lib/anon-budget');
    const res = await checkAnonAiBudget('2026-06-24');
    expect(res.allowed).toBe(true);
    expect(res.count).toBe(null);
    expect(incr).not.toHaveBeenCalled();
  });
});
