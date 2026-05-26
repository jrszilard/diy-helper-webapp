import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// webFetch resolves the hostname to defend against DNS rebinding; mock it.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

import { webFetch } from '../search';
import { lookup } from 'node:dns/promises';

const mockLookup = vi.mocked(lookup);

function resolvesTo(...ips: string[]) {
  // lookup() is overloaded; with { all: true } it returns LookupAddress[]. The
  // mock picks the scalar overload, so cast the array result to satisfy the type.
  const records = ips.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
  mockLookup.mockResolvedValue(records as never);
}

function htmlResponse(body: string) {
  return { status: 200, ok: true, headers: new Headers(), text: () => Promise.resolve(body) };
}

function redirectResponse(location: string) {
  return {
    status: 302,
    ok: false,
    headers: new Headers({ location }),
    text: () => Promise.resolve(''),
  };
}

describe('webFetch SSRF hardening', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resolvesTo('93.184.216.34'); // default: hostname resolves to a public IP
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('returns page text for a safe public URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(htmlResponse('<html><body>Hello world</body></html>'));
    const out = await webFetch('https://example.com/');
    expect(out).toContain('Hello world');
  });

  it('blocks a URL literal pointing at the cloud metadata IP without fetching', async () => {
    globalThis.fetch = vi.fn();
    const out = await webFetch('http://169.254.169.254/latest/meta-data/');
    expect(out).toBe('Error: URL not allowed');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('blocks a public hostname that resolves to a private IP (DNS rebinding)', async () => {
    resolvesTo('10.0.0.1');
    globalThis.fetch = vi.fn();
    const out = await webFetch('https://rebind.example.com/');
    expect(out).toBe('Error: URL not allowed');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not follow a redirect to a private address', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(redirectResponse('http://169.254.169.254/'));
    const out = await webFetch('https://example.com/redirect');
    expect(out).toBe('Error: URL not allowed');
    // first hop fetched; the private redirect target must NOT be fetched
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('follows a safe redirect to a public URL and returns its body', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse('https://example.com/final'))
      .mockResolvedValueOnce(htmlResponse('<html><body>Final page</body></html>'));
    const out = await webFetch('https://example.com/start');
    expect(out).toContain('Final page');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('caps runaway redirect chains', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(redirectResponse('https://example.com/next'));
    const out = await webFetch('https://example.com/loop');
    expect(out).toMatch(/redirect/i);
  });
});
