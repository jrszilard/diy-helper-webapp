import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearchStructured, type BraveSearchResult } from '../search';

// Mock logger to avoid console output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('webSearchStructured', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.BRAVE_SEARCH_API_KEY;

  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.BRAVE_SEARCH_API_KEY = originalEnv;
  });

  it('returns error when API key is not set', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    const result = await webSearchStructured('test query');
    expect(result.results).toEqual([]);
    expect(result.error).toBe('Web search not configured');
  });

  it('returns structured results with extra_snippets', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            {
              title: 'Romex Wire 12/2',
              description: 'Buy 12/2 Romex wire at Home Depot for $49.99',
              url: 'https://www.homedepot.com/p/romex-12-2/123',
              extra_snippets: ['Also available in 250ft rolls', 'NM-B rated for indoor use'],
            },
            {
              title: 'Electrical Wire',
              description: "Lowe's carries 12/2 NM-B wire",
              url: 'https://www.lowes.com/pd/wire/456',
            },
          ],
        },
      }),
    }) as typeof fetch;

    const result = await webSearchStructured('12/2 romex wire');

    expect(result.error).toBeUndefined();
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      title: 'Romex Wire 12/2',
      description: 'Buy 12/2 Romex wire at Home Depot for $49.99',
      url: 'https://www.homedepot.com/p/romex-12-2/123',
      extra_snippets: ['Also available in 250ft rolls', 'NM-B rated for indoor use'],
    });
    expect(result.results[1].extra_snippets).toEqual([]);
  });

  it('passes extra_snippets=true in query parameter', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [{ title: 'T', description: 'D', url: 'https://x.com' }] } }),
    }) as typeof fetch;

    await webSearchStructured('test');

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('extra_snippets=true');
  });

  it('returns error on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    }) as typeof fetch;

    const result = await webSearchStructured('test', 0);
    expect(result.results).toEqual([]);
    expect(result.error).toContain('403');
  });

  it('returns error when no results found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [] } }),
    }) as typeof fetch;

    const result = await webSearchStructured('obscure query', 0);
    expect(result.results).toEqual([]);
    expect(result.error).toBe('No search results found');
  });

  it('retries on server error', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ web: { results: [{ title: 'T', description: 'D', url: 'https://x.com' }] } }),
      }) as typeof fetch;

    const result = await webSearchStructured('test', 1);
    expect(result.results).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
