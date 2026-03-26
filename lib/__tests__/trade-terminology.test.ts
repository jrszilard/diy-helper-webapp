import { describe, it, expect } from 'vitest';
import { analyzeTerminology, TERMINOLOGY } from '@/lib/intelligence/trade-terminology';

describe('TERMINOLOGY', () => {
  it('has entries for all domain categories', () => {
    const domains = ['electrical', 'plumbing', 'carpentry', 'hvac', 'general', 'landscaping', 'painting', 'roofing'];
    for (const domain of domains) {
      expect(TERMINOLOGY[domain]).toBeDefined();
      expect(TERMINOLOGY[domain].advanced.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzeTerminology', () => {
  it('detects advanced electrical terms', () => {
    const result = analyzeTerminology('I need to run some romex from the panel to a new 20-amp breaker');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical).toBeDefined();
    expect(electrical!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('detects advanced plumbing terms', () => {
    const result = analyzeTerminology('Should I use PEX or copper for the main supply line? I have a SharkBite fitting.');
    const plumbing = result.find(r => r.domain === 'plumbing');
    expect(plumbing).toBeDefined();
    expect(plumbing!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('returns zero counts for unrelated text', () => {
    const result = analyzeTerminology('What is the weather like today?');
    for (const entry of result) {
      expect(entry.advancedTermCount).toBe(0);
    }
  });

  it('is case-insensitive', () => {
    const result = analyzeTerminology('I have ROMEX and a GFCI outlet');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('detects basic question patterns', () => {
    const result = analyzeTerminology('What is a circuit breaker? How do I turn off the power?');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical!.basicQuestionCount).toBeGreaterThanOrEqual(1);
  });
});
