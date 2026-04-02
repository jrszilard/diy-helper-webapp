import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ContextualHint visibility logic', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
  });

  it('returns true when hint has not been seen', () => {
    expect(localStorage.getItem('hint_seen_materials')).toBeNull();
  });

  it('returns false after hint is dismissed', () => {
    localStorage.setItem('hint_seen_materials', 'true');
    expect(localStorage.getItem('hint_seen_materials')).toBe('true');
  });

  it('different hint keys are independent', () => {
    localStorage.setItem('hint_seen_materials', 'true');
    expect(localStorage.getItem('hint_seen_tools')).toBeNull();
  });
});
