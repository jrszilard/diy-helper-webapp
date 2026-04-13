import { describe, it, expect } from 'vitest';
import { shouldAutoPromote, structureCorrection } from '@/lib/advisor-promotion';

describe('shouldAutoPromote', () => {
  it('auto-promotes expert corrections from verified specialty', () => {
    const result = shouldAutoPromote({
      source: 'expert_correction',
      reporterRole: 'expert',
      expertSpecialties: ['electrical', 'general_contractor'],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(0.9);
  });

  it('auto-promotes expert corrections outside specialty at lower weight', () => {
    const result = shouldAutoPromote({
      source: 'expert_correction',
      reporterRole: 'expert',
      expertSpecialties: ['plumbing'],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(0.7);
  });

  it('does not auto-promote single user flags', () => {
    const result = shouldAutoPromote({
      source: 'user_flag',
      reporterRole: 'diy_user',
      expertSpecialties: [],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(false);
    expect(result.weight).toBe(0.5);
  });

  it('auto-promotes canary failures at weight 1.0', () => {
    const result = shouldAutoPromote({
      source: 'canary_failure',
      reporterRole: 'diy_user',
      expertSpecialties: [],
      category: 'structural',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(1.0);
  });

  it('general_contractor specialty matches any category', () => {
    const result = shouldAutoPromote({
      source: 'expert_correction',
      reporterRole: 'expert',
      expertSpecialties: ['general_contractor'],
      category: 'roofing',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(0.9);
  });
});

describe('structureCorrection', () => {
  it('structures a correction into rubric example format', () => {
    const result = structureCorrection({
      userQuestion: 'Can I use 14-gauge wire for a 20-amp circuit?',
      aiResponse: 'Yes, 14-gauge works fine for 20-amp.',
      correctionText: '14-gauge is only rated for 15 amps. Must use 12-gauge for 20-amp.',
      category: 'electrical',
      severity: 'critical',
      rubricItemsFailed: [5],
    });

    expect(result.user_question).toBe('Can I use 14-gauge wire for a 20-amp circuit?');
    expect(result.bad_response).toBe('Yes, 14-gauge works fine for 20-amp.');
    expect(result.good_response).toBe('14-gauge is only rated for 15 amps. Must use 12-gauge for 20-amp.');
    expect(result.rubric_items_failed).toEqual([5]);
    expect(result.severity).toBe('critical');
    expect(result.category).toBe('electrical');
    expect(result.rubric_version).toBeGreaterThanOrEqual(1);
  });
});
