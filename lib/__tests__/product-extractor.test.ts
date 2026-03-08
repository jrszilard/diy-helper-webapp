import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchGoogleShopping, lookupMaterialPrices } from '../product-extractor';
import type { BraveSearchResult } from '../search';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('searchGoogleShopping', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.BRAVE_SEARCH_API_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.BRAVE_SEARCH_API_KEY = originalEnv;
  });

  it('uses prefetched results when provided', async () => {
    const prefetched: BraveSearchResult[] = [
      {
        title: '12/2 Romex Wire - $49.99',
        description: 'Buy 12/2 NM-B wire at Home Depot',
        url: 'https://www.homedepot.com/p/romex/123',
        extra_snippets: ['Also available for $45.00 in bulk', 'Compare at $52.99'],
      },
      {
        title: 'Electrical Wire 12/2',
        description: "Lowe's price: $47.50",
        url: 'https://www.lowes.com/pd/wire/456',
        extra_snippets: [],
      },
    ];

    // Should NOT call fetch when prefetched results are provided
    globalThis.fetch = vi.fn();

    const result = await searchGoogleShopping('12/2 romex wire', undefined, prefetched);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.minPrice).not.toBeNull();
    expect(result.maxPrice).not.toBeNull();
    expect(result.avgPrice).not.toBeNull();
  });

  it('extracts price from extra_snippets in prefetched results (one per result)', async () => {
    const prefetched: BraveSearchResult[] = [
      {
        title: 'Product Title',
        description: 'No price here',
        url: 'https://www.amazon.com/product/789',
        extra_snippets: ['On sale for $29.99', 'Was $39.99'],
      },
    ];

    globalThis.fetch = vi.fn();

    const result = await searchGoogleShopping('test product', undefined, prefetched);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    // Should find only the first price ($29.99) — one price per result
    expect(result.sources).toHaveLength(1);
    expect(result.minPrice).toBe(29.99);
    expect(result.maxPrice).toBe(29.99);
  });

  it('identifies store from URL in prefetched results', async () => {
    const prefetched: BraveSearchResult[] = [
      {
        title: 'Wire - $25.00',
        description: 'desc',
        url: 'https://www.homedepot.com/p/test',
      },
      {
        title: 'Wire - $27.00',
        description: 'desc',
        url: 'https://www.lowes.com/pd/test',
      },
    ];

    globalThis.fetch = vi.fn();

    const result = await searchGoogleShopping('wire', undefined, prefetched);

    expect(result.sources.find(s => s.store === 'Home Depot')).toBeDefined();
    expect(result.sources.find(s => s.store === "Lowe's")).toBeDefined();
  });

  it('returns empty result when no prefetched results and no API key', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;

    const result = await searchGoogleShopping('test');

    expect(result.avgPrice).toBeNull();
    expect(result.sources).toEqual([]);
  });

  it('falls back to API call when no prefetched results', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            {
              title: 'Product for $15.99',
              description: 'Great deal',
              url: 'https://www.walmart.com/ip/product',
              extra_snippets: ['Save $5.00 vs retail price of $20.99'],
            },
          ],
        },
      }),
    }) as typeof fetch;

    const result = await searchGoogleShopping('test product');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    // Should include extra_snippets=true in API call
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('extra_snippets=true');

    // Should extract prices from both description and extra_snippets
    expect(result.sources.length).toBeGreaterThanOrEqual(1);
    expect(result.minPrice).not.toBeNull();
  });

  it('returns empty result when prefetched results have no prices', async () => {
    const prefetched: BraveSearchResult[] = [
      {
        title: 'Product Info',
        description: 'No pricing available',
        url: 'https://www.example.com/product',
        extra_snippets: ['See store for details'],
      },
    ];

    globalThis.fetch = vi.fn();

    const result = await searchGoogleShopping('test', undefined, prefetched);

    expect(result.avgPrice).toBeNull();
    expect(result.sources).toEqual([]);
  });
});

describe('lookupMaterialPrices', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.BRAVE_SEARCH_API_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.BRAVE_SEARCH_API_KEY = originalEnv;
  });

  it('returns 0 when no API key is set', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;

    const materials = [{ name: '2x4x8 lumber', estimated_price: '10' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('10');
  });

  it('updates estimated_price with search results', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: '2x4x8 Lumber - $3.98', description: 'Home Depot', url: 'https://www.homedepot.com/p/test', extra_snippets: ['$4.25 at Lowes'] },
            { title: '2x4 Stud', description: 'Price: $3.75', url: 'https://www.lowes.com/pd/test', extra_snippets: [] },
          ],
        },
      }),
    }) as typeof fetch;

    const materials = [{ name: '2x4x8 lumber', estimated_price: '8' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(1);
    const updatedPrice = parseFloat(materials[0].estimated_price);
    expect(updatedPrice).toBeLessThan(8);
    expect(updatedPrice).toBeGreaterThan(0);
  });

  it('respects the limit option', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: { results: [{ title: 'Price $5.00', description: '', url: 'https://example.com', extra_snippets: [] }] },
      }),
    }) as typeof fetch;

    const materials = [
      { name: 'item1', estimated_price: '10' },
      { name: 'item2', estimated_price: '10' },
      { name: 'item3', estimated_price: '10' },
    ];
    await lookupMaterialPrices(materials, { limit: 2 });

    // Should only call fetch for 2 items (limit: 2)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('skips update when lookup price is >3x AI estimate (sanity check)', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: 'Premium item $50.00', description: '', url: 'https://example.com', extra_snippets: [] },
          ],
        },
      }),
    }) as typeof fetch;

    const materials = [{ name: 'basic item', estimated_price: '5' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('5');
  });

  it('skips update when lookup price is <0.33x AI estimate (sanity check)', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: 'Clearance $2.50', description: '', url: 'https://example.com', extra_snippets: [] },
          ],
        },
      }),
    }) as typeof fetch;

    const materials = [{ name: 'expensive item', estimated_price: '100' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('100');
  });

  it('handles fetch failures gracefully', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const materials = [{ name: 'item', estimated_price: '10' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('10');
  });

  it('handles non-ok responses gracefully', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 }) as typeof fetch;

    const materials = [{ name: 'item', estimated_price: '10' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('10');
  });

  it('handles empty search results gracefully', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [] } }),
    }) as typeof fetch;

    const materials = [{ name: 'item', estimated_price: '10' }];
    const count = await lookupMaterialPrices(materials);

    expect(count).toBe(0);
    expect(materials[0].estimated_price).toBe('10');
  });
});
