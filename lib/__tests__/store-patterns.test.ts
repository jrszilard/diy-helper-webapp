import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORE_CONFIGS,
  TEST_FIXTURES,
  getCachedResult,
  setCachedResult,
  buildCacheKey,
} from '../store-patterns';

describe('store-patterns', () => {
  describe('STORE_CONFIGS', () => {
    it('has configs for all expected stores', () => {
      expect(STORE_CONFIGS['home-depot']).toBeDefined();
      expect(STORE_CONFIGS['lowes']).toBeDefined();
      expect(STORE_CONFIGS['ace-hardware']).toBeDefined();
      expect(STORE_CONFIGS['menards']).toBeDefined();
    });

    it('each config has required fields', () => {
      for (const [key, config] of Object.entries(STORE_CONFIGS)) {
        expect(config.name).toBeTruthy();
        expect(config.domain).toBeTruthy();
        expect(config.phone).toBeTruthy();
        expect(config.urlPatterns.length).toBeGreaterThan(0);
        expect(config.minProductPathScore).toBeGreaterThan(0);
        expect(config.version).toBeGreaterThanOrEqual(1);
        expect(config.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('URL scoring via TEST_FIXTURES', () => {
    it.each(TEST_FIXTURES)('$description scores >= $expectedMinScore', (fixture) => {
      const config = STORE_CONFIGS[fixture.store];
      expect(config).toBeDefined();

      // Score the URL using the config patterns (same logic as route)
      let score = 0;
      for (const pattern of config.urlPatterns) {
        const regex = new RegExp(pattern.pattern);
        if (regex.test(fixture.url)) {
          score += pattern.weight;
          break;
        }
      }

      // Path depth bonus
      const pathDepth = (fixture.url.match(/\//g) || []).length;
      if (pathDepth > 4) score += 10;

      // Query penalty
      if (fixture.url.includes('?')) score -= 20;

      // Exclude patterns
      for (const excludePattern of config.excludePatterns) {
        if (fixture.url.includes(excludePattern)) {
          score -= 50;
          break;
        }
      }

      expect(score).toBeGreaterThanOrEqual(fixture.expectedMinScore);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      // Clear any cached data by setting expired entries
    });

    it('returns null for missing cache key', () => {
      expect(getCachedResult('nonexistent-key-xyz')).toBeNull();
    });

    it('stores and retrieves cached data', () => {
      const key = 'test-store:test-item:test-location';
      const data = { price: 29.99, store: 'Test' };
      setCachedResult(key, data);
      expect(getCachedResult(key)).toEqual(data);
    });

    it('builds consistent cache keys', () => {
      const key1 = buildCacheKey('home-depot', 'Drill Bit Set', 'Austin TX');
      const key2 = buildCacheKey('home-depot', 'drill bit set', 'austin tx');
      expect(key1).toBe(key2);
    });

    it('normalizes cache keys', () => {
      const key = buildCacheKey('lowes', '  Hammer  ', '  Dallas  ');
      expect(key).toBe('lowes:hammer:dallas');
    });
  });
});
