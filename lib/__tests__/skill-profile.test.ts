import { describe, it, expect } from 'vitest';
import {
  inferFamiliarityFromTermCounts,
  inferCommunicationLevel,
  mergeProfileSources,
} from '@/lib/intelligence/skill-profile';
import type { DomainCategory, FamiliarityLevel } from '@/lib/intelligence/types';

describe('inferFamiliarityFromTermCounts', () => {
  it('returns novice for 0-2 advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(0)).toBe('novice');
    expect(inferFamiliarityFromTermCounts(1)).toBe('novice');
    expect(inferFamiliarityFromTermCounts(2)).toBe('novice');
  });

  it('returns familiar for 3-7 advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(3)).toBe('familiar');
    expect(inferFamiliarityFromTermCounts(5)).toBe('familiar');
    expect(inferFamiliarityFromTermCounts(7)).toBe('familiar');
  });

  it('returns experienced for 8+ advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(8)).toBe('experienced');
    expect(inferFamiliarityFromTermCounts(20)).toBe('experienced');
  });
});

describe('inferCommunicationLevel', () => {
  it('returns beginner when all domains are novice', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'novice', plumbing: 'novice', carpentry: 'novice',
      hvac: 'novice', general: 'novice', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('beginner');
  });

  it('returns intermediate when some domains are familiar', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'familiar', plumbing: 'novice', carpentry: 'familiar',
      hvac: 'novice', general: 'novice', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('intermediate');
  });

  it('returns advanced when multiple domains are experienced', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'experienced', plumbing: 'experienced', carpentry: 'familiar',
      hvac: 'novice', general: 'experienced', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('advanced');
  });
});

describe('mergeProfileSources', () => {
  it('takes the highest familiarity level across sources', () => {
    const result = mergeProfileSources(
      { electrical: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
      { electrical: 'familiar' } as Record<DomainCategory, FamiliarityLevel>,
    );
    expect(result.electrical).toBe('familiar');
  });

  it('preserves novice when no source upgrades', () => {
    const result = mergeProfileSources(
      { plumbing: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
      { plumbing: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
    );
    expect(result.plumbing).toBe('novice');
  });
});
