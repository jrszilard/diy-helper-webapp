import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';
import {
  fetchProductData,
  searchGoogleShopping,
  validatePrices,
  ExtractedProductData,
} from '@/lib/product-extractor';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { SearchStoresRequestSchema, parseRequestBody } from '@/lib/validation';

// Helper function to add delay
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced Store Configuration with URL Scoring
 *
 * - urlPatterns: Array of objects with pattern, weight, and type for intelligent URL ranking
 * - minProductPathScore: Threshold to consider a URL a valid product link
 */
const STORE_CONFIGS = {
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
  },
};

type StoreKey = keyof typeof STORE_CONFIGS;

interface StoreResult {
  store: string;
  retailer: string;
  price: number;
  originalPrice?: number;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only' | 'check-online';
  distance: string;
  address: string;
  phone: string;
  link: string;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
  priceWarning?: string;
  sku?: string;
  storeStock?: string;
  linkQuality?: 'high' | 'medium' | 'low' | 'search-fallback';
  searchFallback?: boolean;
}

/**
 * URL Scoring System
 * Scores each URL to rank better product URLs higher than search results.
 */
function scoreUrl(url: string, config: typeof STORE_CONFIGS[StoreKey]): number {
  let score = 0;

  try {
    // Score based on matching patterns
    for (const pattern of config.urlPatterns) {
      const regex = new RegExp(pattern.pattern);
      if (regex.test(url)) {
        score += pattern.weight;
        console.log(`    Pattern match: ${pattern.type} (+${pattern.weight})`);
        // Only apply highest matching pattern
        break;
      }
    }

    // Bonus for deeper paths (more specific)
    const pathDepth = (url.match(/\//g) || []).length;
    if (pathDepth > 4) {
      score += 10;
    }

    // Penalize query parameters (often search results)
    if (url.includes('?')) {
      score -= 20;
    }

    // Penalize tracking parameters
    if (url.includes('utm_') || url.includes('ref=') || url.includes('cm_mmc')) {
      score -= 5;
    }

    // Check for excluded patterns (strong penalty)
    for (const excludePattern of config.excludePatterns) {
      if (url.includes(excludePattern)) {
        score -= 50;
        break;
      }
    }

  } catch (error) {
    console.error(`Error scoring URL ${url}:`, error);
    return 0;
  }

  return score;
}

/**
 * Enhanced URL Extraction with Scoring
 */
function extractProductUrls(
  searchResults: string,
  config: typeof STORE_CONFIGS[StoreKey],
  materialName: string
): { urls: string[]; quality: 'high' | 'medium' | 'low'; fallbackSearch: boolean } {
  console.log(`\n  Extracting URLs for ${config.domain}`);

  try {
    const escapedDomain = config.domain.replace(/\./g, '\\.');
    const urlRegex = new RegExp(
      `https?://(?:www\\.)?${escapedDomain}[^\\s<>"'\\]\\)]+`,
      'g'
    );

    const matches = searchResults.match(urlRegex) || [];
    console.log(`  Found ${matches.length} raw URLs`);

    // Clean URLs
    const cleanedUrls = matches
      .map(url => {
        return url
          .replace(/[)\]}>'",.;:]+$/, '') // Remove trailing punctuation
          .split('#')[0]; // Remove hash fragments (keep query for now for scoring)
      })
      .filter(Boolean);

    // Remove duplicates before scoring
    const uniqueUrls = [...new Set(cleanedUrls)];
    console.log(`  After dedup: ${uniqueUrls.length} URLs`);

    // Score and filter URLs
    const scoredUrls = uniqueUrls
      .map(url => {
        // Clean query params for the final URL but score with them
        const cleanUrl = url.split('?')[0];
        const score = scoreUrl(url, config);
        return { url: cleanUrl, score };
      })
      .filter(({ score }) => score >= config.minProductPathScore)
      .sort((a, b) => b.score - a.score)
      .filter((item, index, self) =>
        self.findIndex(x => x.url === item.url) === index
      )
      .slice(0, 5);

    console.log(`  Valid product URLs: ${scoredUrls.length}`);

    if (scoredUrls.length > 0) {
      const topScore = scoredUrls[0].score;
      const quality = topScore >= 80 ? 'high' : topScore >= 50 ? 'medium' : 'low';

      console.log(`  Top URL: ${scoredUrls[0].url}`);
      console.log(`  Top score: ${topScore} (${quality} quality)`);

      return {
        urls: scoredUrls.map(item => item.url),
        quality,
        fallbackSearch: false,
      };
    }

    // No good URLs found
    console.log(`  No high-quality URLs found, will use fallback`);
    return {
      urls: [],
      quality: 'low',
      fallbackSearch: true,
    };

  } catch (error) {
    console.error(`Error extracting URLs:`, error);
    return {
      urls: [],
      quality: 'low',
      fallbackSearch: true,
    };
  }
}

/**
 * Fetch and extract data from product URLs
 */
async function fetchBestProductData(
  urls: string[],
  storeKey: string,
  timeoutMs: number = 8000
): Promise<ExtractedProductData & { url: string }> {
  const defaultResult: ExtractedProductData & { url: string } = {
    url: urls[0] || '',
    price: null,
    originalPrice: null,
    currency: 'USD',
    availability: 'check-online',
    sku: null,
    productName: null,
    brand: null,
    rating: null,
    reviewCount: null,
    storeStock: null,
    confidence: 'low',
    source: 'fallback',
  };

  if (urls.length === 0) return defaultResult;

  const results: (ExtractedProductData & { url: string })[] = [];
  const urlsToFetch = urls.slice(0, 2);

  try {
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fetchProductData(url, storeKey);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        console.log(`  Fetch failed for ${url}:`, error);
        return null;
      }
    };

    const fetchPromises = urlsToFetch.map(url => fetchWithTimeout(url));
    const fetched = await Promise.all(fetchPromises);

    for (const result of fetched) {
      if (result && (result.price !== null || result.availability !== 'check-online')) {
        results.push(result);
      }
    }
  } catch (error) {
    console.error('Error in fetchBestProductData:', error);
  }

  if (results.length === 0) {
    console.log(`  No extraction succeeded, using fallback`);
    return defaultResult;
  }

  // Prioritize results
  const withBoth = results.find(r => r.price !== null && r.availability !== 'check-online');
  if (withBoth) return withBoth;

  const inStock = results.find(r => r.availability === 'in-stock' || r.availability === 'limited');
  if (inStock) return inStock;

  const withPrice = results.find(r => r.price !== null);
  if (withPrice) return withPrice;

  return results[0];
}

/**
 * Build search URL for fallback
 */
function buildSearchUrl(domain: string, materialName: string): string {
  const encodedQuery = encodeURIComponent(materialName);

  // Store-specific search URL formats
  if (domain === 'homedepot.com') {
    return `https://www.homedepot.com/s/${encodedQuery}`;
  } else if (domain === 'lowes.com') {
    return `https://www.lowes.com/search?searchTerm=${encodedQuery}`;
  } else if (domain === 'acehardware.com') {
    return `https://www.acehardware.com/search?query=${encodedQuery}`;
  } else if (domain === 'menards.com') {
    return `https://www.menards.com/main/search.html?search=${encodedQuery}`;
  }

  return `https://www.${domain}/search?q=${encodedQuery}`;
}

/**
 * Main POST handler
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (per-IP, no auth required for this endpoint)
    const rateLimitResult = checkRateLimit(req, null, 'searchStores');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      ));
    }

    const body = await req.json();

    // Validate request body
    const parsed = parseRequestBody(SearchStoresRequestSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const {
      materialName,
      location,
      stores,
      validatePricing,
    } = parsed.data;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`SEARCH: "${materialName}" near ${location}`);
    console.log(`Stores: ${stores.join(', ')}`);
    console.log(`${'='.repeat(50)}`);

    const results: StoreResult[] = [];
    const metadata = {
      totalSearched: 0,
      successfulSearches: 0,
      highQualityResults: 0,
      mediumQualityResults: 0,
      fallbackResults: 0,
    };

    let shoppingPrices: Awaited<ReturnType<typeof searchGoogleShopping>> | null = null;

    // Get aggregated pricing in background
    const shoppingPromise = validatePricing
      ? searchGoogleShopping(materialName)
      : Promise.resolve(null);

    // Search each store
    for (let i = 0; i < stores.length; i++) {
      const storeKey = stores[i] as StoreKey;
      const config = STORE_CONFIGS[storeKey];

      if (!config) {
        console.log(`\nUnknown store: ${storeKey}`);
        continue;
      }

      metadata.totalSearched++;
      console.log(`\n--- ${config.name.toUpperCase()} ---`);

      try {
        const searchQuery = `${materialName} site:${config.domain}`;
        console.log(`Query: ${searchQuery}`);

        const searchResult = await webSearch(searchQuery);

        // Check for search failures - always add fallback
        if (
          searchResult.includes('Search API error') ||
          searchResult.includes('No search results') ||
          searchResult.includes('Search error') ||
          searchResult.includes('Search failed')
        ) {
          console.log(`Search failed, adding fallback`);
          metadata.fallbackResults++;

          const searchUrl = buildSearchUrl(config.domain, materialName);
          results.push({
            store: `${config.name} - ${location}`,
            retailer: storeKey,
            price: 0,
            availability: 'check-online',
            distance: 'Search by ZIP on website',
            address: 'Multiple locations - check website',
            phone: config.phone,
            link: searchUrl,
            notes: 'Search on store website for product availability',
            confidence: 'low',
            linkQuality: 'search-fallback',
            searchFallback: true,
          });

          if (i < stores.length - 1) await sleep(1000);
          continue;
        }

        metadata.successfulSearches++;

        // Extract URLs with quality assessment
        const urlData = extractProductUrls(searchResult, config, materialName);

        // Wait for shopping prices on first store
        if (i === 0 && validatePricing) {
          shoppingPrices = await shoppingPromise;
          if (shoppingPrices?.minPrice) {
            console.log(`Market range: $${shoppingPrices.minPrice.toFixed(2)} - $${shoppingPrices.maxPrice?.toFixed(2)}`);
          }
        }

        if (urlData.urls.length > 0 && !urlData.fallbackSearch) {
          // We have good URLs - fetch product data
          const productData = await fetchBestProductData(urlData.urls, storeKey);

          // Validate price
          let priceData: { price: number | null; confidence: 'high' | 'medium' | 'low'; warning?: string } = {
            price: productData.price,
            confidence: productData.confidence,
          };

          if (productData.price && shoppingPrices) {
            const validated = validatePrices(productData.price, shoppingPrices);
            priceData = {
              price: validated.price,
              confidence: validated.confidence,
              warning: validated.warning,
            };
          }

          // Build notes
          const notes: string[] = [];
          if (urlData.quality === 'high') {
            notes.push('Direct product link');
          }
          if (productData.storeStock) {
            notes.push(productData.storeStock);
          }
          if (productData.rating && productData.reviewCount) {
            notes.push(`${productData.rating}★ (${productData.reviewCount} reviews)`);
          }
          if (priceData.warning) {
            notes.push(priceData.warning);
          }
          if (productData.confidence === 'low' && !productData.price) {
            notes.push('Click to verify price and availability');
          }

          const storeResult: StoreResult = {
            store: `${config.name} - ${location}`,
            retailer: storeKey,
            price: priceData.price || 0,
            originalPrice: productData.originalPrice || undefined,
            availability: productData.availability,
            distance: 'Search by ZIP on website',
            address: 'Multiple locations - check website',
            phone: config.phone,
            link: productData.url,
            notes: notes.length > 0 ? notes.join(' | ') : undefined,
            confidence: priceData.confidence,
            priceWarning: priceData.warning,
            sku: productData.sku || undefined,
            storeStock: productData.storeStock || undefined,
            linkQuality: urlData.quality,
          };

          if (urlData.quality === 'high') {
            metadata.highQualityResults++;
          } else {
            metadata.mediumQualityResults++;
          }

          console.log(`Result: $${storeResult.price} | ${storeResult.availability} | ${urlData.quality} quality`);
          results.push(storeResult);

        } else {
          // No good URLs - use search fallback
          console.log(`No quality URLs, using search fallback`);
          metadata.fallbackResults++;

          const searchUrl = buildSearchUrl(config.domain, materialName);
          results.push({
            store: `${config.name} - ${location}`,
            retailer: storeKey,
            price: 0,
            availability: 'check-online',
            distance: 'Search by ZIP on website',
            address: 'Multiple locations - check website',
            phone: config.phone,
            link: searchUrl,
            notes: 'Search on store website for product availability',
            confidence: 'low',
            linkQuality: 'search-fallback',
            searchFallback: true,
          });
        }

      } catch (error) {
        console.error(`Error searching ${config.name}:`, error);
        metadata.fallbackResults++;

        // Always add fallback on error
        const searchUrl = buildSearchUrl(config.domain, materialName);
        results.push({
          store: `${config.name} - ${location}`,
          retailer: storeKey,
          price: 0,
          availability: 'check-online',
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: config.phone,
          link: searchUrl,
          notes: 'Search on store website for product availability',
          confidence: 'low',
          linkQuality: 'search-fallback',
          searchFallback: true,
        });
      }

      // Rate limiting delay
      if (i < stores.length - 1) {
        await sleep(1500);
      }
    }

    // Sort results: high quality first, then by availability, then by price
    results.sort((a, b) => {
      // Quality priority
      const qualityPriority: Record<string, number> = { high: 0, medium: 1, low: 2, 'search-fallback': 3 };
      const qualityDiff = (qualityPriority[a.linkQuality || 'low'] || 2) - (qualityPriority[b.linkQuality || 'low'] || 2);
      if (qualityDiff !== 0) return qualityDiff;

      // Availability priority
      const availPriority: Record<string, number> = {
        'in-stock': 0,
        'limited': 1,
        'online-only': 2,
        'check-online': 3,
        'out-of-stock': 4,
      };
      const availDiff = availPriority[a.availability] - availPriority[b.availability];
      if (availDiff !== 0) return availDiff;

      // Price (lower is better, 0 means unknown)
      if (a.price && b.price) return a.price - b.price;
      if (a.price) return -1;
      if (b.price) return 1;
      return 0;
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`COMPLETE: ${results.length} results`);
    console.log(`High quality: ${metadata.highQualityResults}`);
    console.log(`Medium quality: ${metadata.mediumQualityResults}`);
    console.log(`Fallback: ${metadata.fallbackResults}`);
    console.log(`${'='.repeat(50)}\n`);

    const response = NextResponse.json({
      results,
      stores_searched: stores.length,
      query: materialName,
      location,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      priceRange: shoppingPrices ? {
        min: shoppingPrices.minPrice,
        max: shoppingPrices.maxPrice,
        avg: shoppingPrices.avgPrice,
        sources: shoppingPrices.sources.length,
      } : null,
    });

    return applyCorsHeaders(req, response);

  } catch (error: any) {
    console.error('Request Error:', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: error.message || 'Internal server error', results: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
