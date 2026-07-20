import { describe, it, expect } from 'vitest';
import { resolveTracesSampleRate } from '@/lib/traces-sample-rate';

describe('resolveTracesSampleRate', () => {
  it('defaults to full capture when unset', () => {
    expect(resolveTracesSampleRate(undefined)).toBe(1.0);
  });

  it('defaults to full capture for empty or whitespace values', () => {
    // Vercel returns '' for an env var that exists but was never given a value.
    expect(resolveTracesSampleRate('')).toBe(1.0);
    expect(resolveTracesSampleRate('   ')).toBe(1.0);
  });

  it('honours a valid rate', () => {
    expect(resolveTracesSampleRate('0.1')).toBe(0.1);
    expect(resolveTracesSampleRate('0.25')).toBe(0.25);
    expect(resolveTracesSampleRate('1')).toBe(1);
  });

  it('accepts the boundaries', () => {
    expect(resolveTracesSampleRate('0')).toBe(0);
    expect(resolveTracesSampleRate('1.0')).toBe(1);
  });

  it('falls back to the default rather than disabling tracing on bad input', () => {
    // The failure mode that matters: a typo must not silently zero out tracing and
    // recreate the "no data looks like no traffic" problem this module exists to fix.
    for (const bad of ['abc', 'NaN', '1.5', '-0.5', '10', 'Infinity']) {
      expect(resolveTracesSampleRate(bad)).toBe(1.0);
    }
  });
});
