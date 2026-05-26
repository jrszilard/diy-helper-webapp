import { describe, it, expect } from 'vitest';
import { verifyCronAuth } from '@/lib/cron-auth';

const STRONG = 'k7Q2pX9fL4mZ8vR1tB6nW3sD0yH5cJ2'; // 32 chars

describe('verifyCronAuth', () => {
  it('accepts a matching Bearer header with a strong secret', () => {
    expect(verifyCronAuth(`Bearer ${STRONG}`, STRONG)).toEqual({ ok: true });
  });

  it('rejects when no secret is configured', () => {
    expect(verifyCronAuth('Bearer anything', undefined).ok).toBe(false);
    expect(verifyCronAuth('Bearer anything', '').ok).toBe(false);
  });

  it('rejects the .env.example placeholder secret even if the header matches', () => {
    const placeholder = 'generate-a-secure-random-string';
    expect(verifyCronAuth(`Bearer ${placeholder}`, placeholder)).toEqual({
      ok: false,
      reason: 'weak-secret',
    });
  });

  it('rejects trivially short secrets even if the header matches', () => {
    expect(verifyCronAuth('Bearer dev', 'dev')).toEqual({ ok: false, reason: 'weak-secret' });
  });

  it('rejects a mismatched authorization header', () => {
    expect(verifyCronAuth('Bearer wrong', STRONG)).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyCronAuth(null, STRONG)).toEqual({ ok: false, reason: 'mismatch' });
  });
});
