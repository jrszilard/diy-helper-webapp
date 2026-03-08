/**
 * Store configuration with URL scoring patterns, versioning, and test fixtures.
 * Extracted from search-stores route for maintainability and testability.
 */

export interface UrlPattern {
  pattern: string;
  weight: number;
  type: string;
}

export interface StoreConfig {
  name: string;
  domain: string;
  phone: string;
  productPathPatterns: string[];
  excludePatterns: string[];
  urlPatterns: UrlPattern[];
  minProductPathScore: number;
  version: number;
  lastVerified: string;
}

export const STORE_CONFIGS: Record<string, StoreConfig> = {
  'home-depot': {
    name: 'Home Depot',
    domain: 'homedepot.com',
    phone: '1-800-466-3337',
    productPathPatterns: ['/p/'],
    excludePatterns: ['/b/', '/c/', '/s/', '/search', '/deals', '/offers'],
    urlPatterns: [
      { pattern: '/p/[A-Za-z0-9-]+/[0-9]+', weight: 100, type: 'direct-product' },
      { pattern: '/p/', weight: 80, type: 'product-page' },
      { pattern: '/search\\?', weight: 10, type: 'search-query' },
      { pattern: '/b/', weight: 0, type: 'category' },
    ],
    minProductPathScore: 50,
    version: 1,
    lastVerified: '2026-02-11',
  },
  'lowes': {
    name: "Lowe's",
    domain: 'lowes.com',
    phone: '1-800-445-6937',
    productPathPatterns: ['/pd/'],
    excludePatterns: ['/pl/', '/ppl/', '/new', '/deals', '/browse', '/search'],
    urlPatterns: [
      { pattern: '/pd/[A-Za-z0-9-]+/[0-9]+', weight: 100, type: 'direct-product' },
      { pattern: '/pd/', weight: 80, type: 'product-page' },
      { pattern: '/search\\?', weight: 10, type: 'search-query' },
    ],
    minProductPathScore: 50,
    version: 1,
    lastVerified: '2026-02-11',
  },
  'ace-hardware': {
    name: 'Ace Hardware',
    domain: 'acehardware.com',
    phone: '1-888-827-4223',
    productPathPatterns: ['/product/', '/p/'],
    excludePatterns: ['/category/', '/search', '/deals', '/specials'],
    urlPatterns: [
      { pattern: '/departments/[^/]+/[^/]+/[^/]+/[0-9]+', weight: 100, type: 'direct-product' },
      { pattern: '/product/[0-9]+', weight: 90, type: 'product-id' },
      { pattern: '/product/', weight: 80, type: 'product-page' },
      { pattern: '/p/', weight: 70, type: 'short-product' },
      { pattern: '/search', weight: 10, type: 'search-query' },
    ],
    minProductPathScore: 50,
    version: 1,
    lastVerified: '2026-02-11',
  },
  'menards': {
    name: 'Menards',
    domain: 'menards.com',
    phone: '1-800-871-2800',
    productPathPatterns: ['/main/p-'],
    excludePatterns: ['/main/store', '/main/search', '/specials'],
    urlPatterns: [
      { pattern: '/main/p-[0-9]+', weight: 100, type: 'direct-product' },
      { pattern: '/main/p-', weight: 80, type: 'product-page' },
      { pattern: '/main/search', weight: 10, type: 'search-query' },
    ],
    minProductPathScore: 50,
    version: 1,
    lastVerified: '2026-02-11',
  },
};

export type StoreKey = keyof typeof STORE_CONFIGS;

/**
 * Test fixtures for validating store URL patterns.
 * Each fixture has a URL and expected minimum score.
 */
export const TEST_FIXTURES: Array<{ store: StoreKey; url: string; expectedMinScore: number; description: string }> = [
  { store: 'home-depot', url: 'https://www.homedepot.com/p/Milwaukee-Drill/305123456', expectedMinScore: 80, description: 'HD direct product' },
  { store: 'home-depot', url: 'https://www.homedepot.com/search?q=drill', expectedMinScore: -70, description: 'HD search page (should be filtered out)' },
  { store: 'home-depot', url: 'https://www.homedepot.com/b/Tools/N-5yc1v', expectedMinScore: -50, description: 'HD category page' },
  { store: 'lowes', url: 'https://www.lowes.com/pd/DEWALT-Drill/5001234567', expectedMinScore: 80, description: 'Lowes direct product' },
  { store: 'lowes', url: 'https://www.lowes.com/search?searchTerm=drill', expectedMinScore: -70, description: 'Lowes search page (should be filtered out)' },
  { store: 'ace-hardware', url: 'https://www.acehardware.com/departments/tools/drills/cordless-drills/2012345', expectedMinScore: 80, description: 'Ace direct product' },
  { store: 'menards', url: 'https://www.menards.com/main/p-1234567890', expectedMinScore: 80, description: 'Menards direct product' },
];

/**
 * In-memory cache for product search results with TTL.
 */
const searchCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function getCachedResult<T>(key: string): T | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedResult(key: string, data: unknown): void {
  // Evict expired entries periodically (every 100 writes)
  if (searchCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of searchCache) {
      if (now > v.expiresAt) searchCache.delete(k);
    }
  }
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function buildCacheKey(storeKey: string, materialName: string, location: string): string {
  return `${storeKey}:${materialName.toLowerCase().trim()}:${location.toLowerCase().trim()}`;
}
