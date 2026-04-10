import { describe, it, expect } from 'vitest';
import { buildReviewPrompt, RUBRIC_VERSION } from '@/lib/advisor-rubric';

describe('buildReviewPrompt', () => {
  it('returns a prompt containing the rubric checklist', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I replace a circuit breaker?',
      draftResponse: 'Here is how to replace a circuit breaker: First turn off the main...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['circuit breaker'],
    });

    expect(prompt).toContain('SAFETY REVIEW RUBRIC');
    expect(prompt).toContain('circuit breaker');
    expect(prompt).toContain('USER QUESTION');
    expect(prompt).toContain('DRAFT RESPONSE');
  });

  it('includes elevated safety flag when keywords detected', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'Can I move my gas line?',
      draftResponse: 'You can move a gas line by...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });

    expect(prompt).toContain('ELEVATED SAFETY CONCERN');
    expect(prompt).toContain('gas line');
  });

  it('does not include elevated safety flag when no keywords', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(prompt).not.toContain('ELEVATED SAFETY CONCERN');
  });

  it('includes professional referral check in rubric', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'Can I move my gas line?',
      draftResponse: 'You can move a gas line by...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });

    expect(prompt).toContain('licensed professional');
  });

  it('returns structured verdict format instructions', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(prompt).toContain('"verdict"');
    expect(prompt).toContain('APPROVE');
    expect(prompt).toContain('REVISE');
  });

  it('includes few-shot examples when provided', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How to wire an outlet?',
      draftResponse: 'Use 14-gauge wire for the 20-amp circuit...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['outlet install'],
      fewShotExamples: [
        {
          userQuestion: 'Can I use 14-gauge wire on a 20-amp circuit?',
          badResponse: 'Yes, 14-gauge works fine for 20-amp.',
          goodResponse: 'No — 14-gauge is only rated for 15 amps. Use 12-gauge for 20-amp circuits.',
          rubricItemsFailed: [5],
          severity: 'critical' as const,
        },
      ],
    });

    expect(prompt).toContain('PAST MISTAKES');
    expect(prompt).toContain('14-gauge is only rated for 15 amps');
    expect(prompt).toContain('Material & Specification');
  });

  it('exports a RUBRIC_VERSION number', () => {
    expect(typeof RUBRIC_VERSION).toBe('number');
    expect(RUBRIC_VERSION).toBeGreaterThanOrEqual(1);
  });
});
