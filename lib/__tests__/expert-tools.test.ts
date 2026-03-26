import { describe, it, expect } from 'vitest';
import {
  detectLicensingGap,
  buildLicensingAdvisory,
  buildCodeLookupPrompt,
  buildDraftAnswerPrompt,
} from '@/lib/marketplace/expert-tools';

describe('detectLicensingGap', () => {
  it('returns no gap when expert has matching license', () => {
    const result = detectLicensingGap(['plumbing'], 'plumbing');
    expect(result.hasGap).toBe(false);
  });

  it('returns gap when expert lacks license for question trade', () => {
    const result = detectLicensingGap(['general'], 'plumbing');
    expect(result.hasGap).toBe(true);
    expect(result.questionTrade).toBe('plumbing');
  });

  it('returns gap with noLicensesOnFile when expert has no licenses', () => {
    const result = detectLicensingGap([], 'electrical');
    expect(result.hasGap).toBe(true);
    expect(result.noLicensesOnFile).toBe(true);
  });
});

describe('buildLicensingAdvisory', () => {
  it('includes state and trade when licensing rule exists', () => {
    const advisory = buildLicensingAdvisory({
      hasGap: true,
      questionTrade: 'plumbing',
      licensingRule: {
        state: 'MI',
        license_type: 'Licensed Plumber',
        homeowner_exemption: true,
        homeowner_exemption_notes: 'Homeowners may perform plumbing work on their own residence',
      },
    });
    expect(advisory).toContain('MI');
    expect(advisory).toContain('Licensed Plumber');
    expect(advisory).toContain('homeowner');
  });

  it('returns generic advisory when no licensing rule exists', () => {
    const advisory = buildLicensingAdvisory({
      hasGap: true,
      questionTrade: 'plumbing',
      licensingRule: null,
    });
    expect(advisory).toContain('Licensing requirements vary');
  });
});

describe('buildCodeLookupPrompt', () => {
  it('includes topic and location', () => {
    const prompt = buildCodeLookupPrompt('electrical panel upgrade', 'MI', 'Detroit');
    expect(prompt).toContain('electrical panel upgrade');
    expect(prompt).toContain('MI');
    expect(prompt).toContain('Detroit');
  });
});

describe('buildDraftAnswerPrompt', () => {
  it('includes question text and project context', () => {
    const prompt = buildDraftAnswerPrompt(
      'How do I install a ceiling fan?',
      { projectSummary: 'Ceiling fan installation in bedroom' }
    );
    expect(prompt).toContain('ceiling fan');
    expect(prompt).toContain('bedroom');
  });
});
