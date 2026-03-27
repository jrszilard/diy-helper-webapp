import { describe, it, expect } from 'vitest';
import { calibratePrompt } from '@/lib/intelligence/prompt-calibrator';
import { defaultSkillProfile } from '@/lib/intelligence/types';

describe('calibratePrompt', () => {
  const basePrompt = 'You are a DIY assistant.';

  it('adds beginner calibration for novice users', () => {
    const profile = defaultSkillProfile('user-1');
    const result = calibratePrompt(basePrompt, profile);
    expect(result).toContain('beginner');
    expect(result).toContain('explain');
    expect(result).toContain(basePrompt);
  });

  it('adds experienced calibration for advanced users', () => {
    const profile = {
      ...defaultSkillProfile('user-2'),
      domainFamiliarity: {
        electrical: 'experienced' as const,
        plumbing: 'experienced' as const,
        carpentry: 'experienced' as const,
        hvac: 'novice' as const,
        general: 'experienced' as const,
        landscaping: 'novice' as const,
        painting: 'novice' as const,
        roofing: 'novice' as const,
      },
      communicationLevel: 'advanced' as const,
    };
    const result = calibratePrompt(basePrompt, profile);
    expect(result).toContain('experienced');
    expect(result).toContain('concise');
  });

  it('always includes safety reminder', () => {
    const profile = {
      ...defaultSkillProfile('user-3'),
      communicationLevel: 'advanced' as const,
    };
    const result = calibratePrompt(basePrompt, profile);
    expect(result.toLowerCase()).toContain('safety');
    expect(result.toLowerCase()).toContain('permits');
  });

  it('returns base prompt unmodified when profile is null', () => {
    const result = calibratePrompt(basePrompt, null);
    expect(result).toBe(basePrompt);
  });
});
