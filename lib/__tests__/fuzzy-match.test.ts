import { describe, it, expect } from 'vitest';
import { normalizeItemName, fuzzyMatch, isSameItem } from '../fuzzy-match';

describe('fuzzy-match', () => {
  describe('normalizeItemName', () => {
    it('lowercases and trims', () => {
      expect(normalizeItemName('  Drill Bit  ')).toBe('drill bit');
    });

    it('removes separators', () => {
      expect(normalizeItemName('10-mm drill bit')).toBe('10mm drill bit');
    });

    it('removes filler words', () => {
      expect(normalizeItemName('set of screwdrivers')).toBe('screwdriver');
    });

    it('normalizes fractions', () => {
      expect(normalizeItemName('1/2 inch socket')).toBe('0.5 inch socket');
    });

    it('singularizes basic plurals', () => {
      expect(normalizeItemName('brushes')).toBe('brush');
      expect(normalizeItemName('batteries')).toBe('battery');
    });

    it('does not singularize short words', () => {
      expect(normalizeItemName('bus')).toBe('bus');
    });
  });

  describe('fuzzyMatch', () => {
    it('returns 1.0 for exact matches after normalization', () => {
      expect(fuzzyMatch('Drill Bit', 'drill bit')).toBe(1.0);
      expect(fuzzyMatch('10-mm drill bit', '10mm drill bit')).toBe(1.0);
    });

    it('scores high for close variations', () => {
      expect(fuzzyMatch('phillips screwdriver', 'phillips head screwdriver')).toBeGreaterThan(0.7);
      expect(fuzzyMatch('10mm drill bit', '10-mm drill bit')).toBe(1.0);
    });

    it('scores low for different items', () => {
      expect(fuzzyMatch('drill', 'hammer')).toBeLessThan(0.3);
      expect(fuzzyMatch('circular saw', 'tape measure')).toBeLessThan(0.3);
    });

    it('handles substring containment with length weighting', () => {
      // "drill" is a substring of "drill press" but they are different items
      const score = fuzzyMatch('drill', 'drill press');
      // Should be moderate, not 1.0
      expect(score).toBeLessThan(0.95);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('isSameItem', () => {
    // Should match
    it.each([
      ['10mm drill bit', '10-mm drill bit'],
      ['Phillips Screwdriver', 'phillips head screwdriver'],
      ['tape measure', 'Tape Measure'],
      ['cordless drill', 'Cordless Drill'],
      ['safety glasses', 'Safety Glasses'],
    ])('matches "%s" and "%s"', (a, b) => {
      expect(isSameItem(a, b)).toBe(true);
    });

    // Should NOT match
    it.each([
      ['drill', 'drill press'],
      ['hammer', 'screwdriver'],
      ['circular saw', 'jigsaw'],
      ['2x4 lumber', 'concrete mix'],
      ['paint brush', 'paint roller'],
    ])('does not match "%s" and "%s"', (a, b) => {
      expect(isSameItem(a, b)).toBe(false);
    });
  });
});
