import { NextRequest, NextResponse } from 'next/server';
import { webSearchStructured, type BraveSearchResult } from '@/lib/search';
import {
  fetchProductData,
  searchGoogleShopping,
  validatePrices,
  ExtractedProductData,
} from '@/lib/product-extractor';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { SearchStoresRequestSchema, parseRequestBody } from '@/lib/validation';
import { storeSearch as storeSearchConfig } from '@/lib/config';
import { withRetry } from '@/lib/api-retry';
import { logger } from '@/lib/logger';
import {
  STORE_CONFIGS,
  type StoreKey,
  type StoreConfig,
  getCachedResult,
  setCachedResult,
  buildCacheKey,
} from '@/lib/store-patterns';

// Helper function to add delay
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  productName?: string;
  linkQuality?: 'high' | 'medium' | 'low' | 'search-fallback';
  searchFallback?: boolean;
}

/**
 * URL Scoring System
 * Scores each URL to rank better product URLs higher than search results.
 */
function scoreUrl(url: string, config: StoreConfig): number {
  let score = 0;

  try {
    // Score based on matching patterns
    for (const pattern of config.urlPatterns) {
      const regex = new RegExp(pattern.pattern);
      if (regex.test(url)) {
        score += pattern.weight;
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
    logger.error('Error scoring URL', error, { url });
    return 0;
  }

  return score;
}

/**
 * Enhanced URL Extraction with Scoring
 * Accepts structured BraveSearchResult[] and extracts URLs matching the store domain.
 */
function extractProductUrls(
  searchResults: BraveSearchResult[],
  config: StoreConfig,
  materialName: string
): { urls: string[]; quality: 'high' | 'medium' | 'low'; fallbackSearch: boolean } {
  try {
    const escapedDomain = config.domain.replace(/\./g, '\\.');
    const domainRegex = new RegExp(`^https?://(?:www\\.)?${escapedDomain}`, 'i');

    // Extract URLs from structured results that match the store domain
    const matchingUrls = searchResults
      .map(r => r.url)
      .filter(url => domainRegex.test(url))
      .map(url => url.replace(/[)\]}>'",.;:]+$/, '').split('#')[0])
      .filter(Boolean);

    // Remove duplicates before scoring
    const uniqueUrls = [...new Set(matchingUrls)];

    // Score and filter URLs
    const scoredUrls = uniqueUrls
      .map(url => {
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

    if (scoredUrls.length > 0) {
      const topScore = scoredUrls[0].score;
      const quality = topScore >= 80 ? 'high' : topScore >= 50 ? 'medium' : 'low';

      return {
        urls: scoredUrls.map(item => item.url),
        quality,
        fallbackSearch: false,
      };
    }

    return {
      urls: [],
      quality: 'low',
      fallbackSearch: true,
    };

  } catch (error) {
    logger.error('Error extracting URLs', error);
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
        logger.error('Product fetch failed', error, { url });
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
    logger.error('Error in fetchBestProductData', error);
  }

  if (results.length === 0) {
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
 * Extract price and product name from Brave search snippets.
 * When direct page scraping is blocked (common for HD/Lowe's), the search
 * results still contain prices in titles and descriptions — just like what
 * a user would see on a Google Shopping results page.
 */
function extractSnippetPricing(
  results: BraveSearchResult[],
  storeDomain: string
): { price: number | null; productName: string | null; url: string | null; confidence: 'high' | 'medium' | 'low' } {
  const priceRegex = /\$\s*([\d,]+\.?\d{0,2})/g;
  const domainRegex = new RegExp(storeDomain.replace(/\./g, '\\.'), 'i');

  // Prefer results from the store's own domain
  const storeResults = results.filter(r => domainRegex.test(r.url));
  const allResults = storeResults.length > 0 ? storeResults : results;

  const candidates: Array<{ price: number; productName: string; url: string }> = [];

  for (const result of allResults) {
    const text = `${result.title} ${result.description} ${(result.extra_snippets || []).join(' ')}`;
    let match;
    // Reset regex state for each result
    const regex = new RegExp(priceRegex.source, priceRegex.flags);
    while ((match = regex.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0.5 && price < 10000) {
        // Clean product name from title (strip price, store name, trailing junk)
        const cleanTitle = result.title
          .replace(/\$[\d,.]+/g, '')
          .replace(/[-|].*$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        candidates.push({ price, productName: cleanTitle || result.title, url: result.url });
      }
    }
  }

  if (candidates.length === 0) {
    return { price: null, productName: null, url: null, confidence: 'low' };
  }

  // Use the first (most prominent) price from a store-domain result
  const best = candidates[0];
  const confidence = storeResults.length > 0 ? 'medium' : 'low';
  return { price: best.price, productName: best.productName, url: best.url, confidence };
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
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

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

    logger.info('Store search request', { requestId, material: materialName, location, storeCount: stores.length });

    const results: StoreResult[] = [];
    const warnings: string[] = [];
    const metadata = {
      totalSearched: 0,
      successfulSearches: 0,
      highQualityResults: 0,
      mediumQualityResults: 0,
      fallbackResults: 0,
    };

    let shoppingPrices: Awaited<ReturnType<typeof searchGoogleShopping>> | null = null;

    // Get aggregated pricing in background (with extra_snippets via structured search)
    const shoppingPromise = validatePricing
      ? (async () => {
          const { results } = await webSearchStructured(`${materialName} price buy`);
          return searchGoogleShopping(materialName, undefined, results.length > 0 ? results : undefined);
        })()
      : Promise.resolve(null);

    // Search stores in parallel (concurrency controlled by config)
    const validStores = stores
      .map(s => ({ key: s as StoreKey, cfg: STORE_CONFIGS[s] }))
      .filter((s): s is { key: StoreKey; cfg: StoreConfig } => !!s.cfg);

    // Process stores in concurrent chunks
    async function searchOneStore(storeKey: StoreKey, storeCfg: StoreConfig): Promise<StoreResult> {
      metadata.totalSearched++;

      // Check cache first
      const cacheKey = buildCacheKey(storeKey, materialName, location);
      const cached = getCachedResult<StoreResult>(cacheKey);
      if (cached) {
        logger.info('Cache hit for store search', { requestId, store: storeKey, material: materialName });
        if (cached.linkQuality === 'high') metadata.highQualityResults++;
        else if (cached.linkQuality === 'medium') metadata.mediumQualityResults++;
        else metadata.fallbackResults++;
        metadata.successfulSearches++;
        return cached;
      }

      const searchQuery = `${materialName} site:${storeCfg.domain}`;

      const searchResult = await withRetry(
        () => webSearchStructured(searchQuery),
        { maxRetries: 1, baseDelayMs: 2000 }
      );

      // Check for search failures
      if (searchResult.error || searchResult.results.length === 0) {
        logger.warn('Store search returned no usable results', { requestId, store: storeKey, query: searchQuery, error: searchResult.error });
        metadata.fallbackResults++;
        return {
          store: `${storeCfg.name} - ${location}`,
          retailer: storeKey,
          price: 0,
          availability: 'check-online',
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: storeCfg.phone,
          link: buildSearchUrl(storeCfg.domain, materialName),
          notes: 'Search on store website for product availability',
          confidence: 'low',
          linkQuality: 'search-fallback',
          searchFallback: true,
        };
      }

      metadata.successfulSearches++;
      const urlData = extractProductUrls(searchResult.results, storeCfg, materialName);

      if (urlData.urls.length > 0 && !urlData.fallbackSearch) {
        const productData = await fetchBestProductData(urlData.urls, storeKey);

        // If page scraping found a price, use it
        let priceData: { price: number | null; confidence: 'high' | 'medium' | 'low'; warning?: string } = {
          price: productData.price,
          confidence: productData.confidence,
        };
        let resolvedProductName = productData.productName || undefined;
        let resolvedLink = productData.url;

        // Fallback: if page scraping was blocked (common for HD/Lowe's),
        // extract price from search snippets — same data a user sees on Google
        if (!productData.price) {
          const snippetData = extractSnippetPricing(searchResult.results, storeCfg.domain);
          if (snippetData.price) {
            priceData = { price: snippetData.price, confidence: snippetData.confidence };
            resolvedProductName = resolvedProductName || snippetData.productName || undefined;
            resolvedLink = snippetData.url || resolvedLink;
          }
        }

        if (priceData.price && shoppingPrices) {
          const validated = validatePrices(priceData.price, shoppingPrices);
          priceData = { price: validated.price, confidence: validated.confidence, warning: validated.warning };
        }

        const notes: string[] = [];
        if (urlData.quality === 'high' && productData.price) notes.push('Direct product link');
        if (productData.storeStock) notes.push(productData.storeStock);
        if (productData.rating && productData.reviewCount) notes.push(`${productData.rating}★ (${productData.reviewCount} reviews)`);
        if (priceData.warning) notes.push(priceData.warning);
        if (!priceData.price) notes.push('Click to verify price and availability');
        if (!productData.price && priceData.price) notes.push('Price from search results — verify on site');

        if (urlData.quality === 'high') metadata.highQualityResults++;
        else metadata.mediumQualityResults++;

        const storeResult: StoreResult = {
          store: `${storeCfg.name} - ${location}`,
          retailer: storeKey,
          price: priceData.price || 0,
          originalPrice: productData.originalPrice || undefined,
          availability: productData.price ? productData.availability : (priceData.price ? 'check-online' : 'check-online'),
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: storeCfg.phone,
          link: resolvedLink,
          notes: notes.length > 0 ? notes.join(' | ') : undefined,
          confidence: priceData.confidence,
          priceWarning: priceData.warning,
          sku: productData.sku || undefined,
          storeStock: productData.storeStock || undefined,
          productName: resolvedProductName,
          linkQuality: urlData.quality,
        };

        setCachedResult(cacheKey, storeResult);
        return storeResult;
      }

      // No product URLs found — try extracting price from search snippets
      const snippetData = extractSnippetPricing(searchResult.results, storeCfg.domain);
      if (snippetData.price) {
        metadata.mediumQualityResults++;
        const notes = ['Price from search results — verify on site'];

        let priceData: { price: number | null; confidence: 'high' | 'medium' | 'low'; warning?: string } = {
          price: snippetData.price,
          confidence: snippetData.confidence,
        };
        if (snippetData.price && shoppingPrices) {
          const validated = validatePrices(snippetData.price, shoppingPrices);
          priceData = { price: validated.price, confidence: validated.confidence, warning: validated.warning };
          if (validated.warning) notes.push(validated.warning);
        }

        const storeResult: StoreResult = {
          store: `${storeCfg.name} - ${location}`,
          retailer: storeKey,
          price: priceData.price || 0,
          availability: 'check-online',
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: storeCfg.phone,
          link: snippetData.url || buildSearchUrl(storeCfg.domain, materialName),
          notes: notes.join(' | '),
          confidence: priceData.confidence,
          priceWarning: priceData.warning,
          productName: snippetData.productName || undefined,
          linkQuality: 'medium',
        };

        setCachedResult(cacheKey, storeResult);
        return storeResult;
      }

      metadata.fallbackResults++;
      return {
        store: `${storeCfg.name} - ${location}`,
        retailer: storeKey,
        price: 0,
        availability: 'check-online',
        distance: 'Search by ZIP on website',
        address: 'Multiple locations - check website',
        phone: storeCfg.phone,
        link: buildSearchUrl(storeCfg.domain, materialName),
        notes: 'Search on store website for product availability',
        confidence: 'low',
        linkQuality: 'search-fallback',
        searchFallback: true,
      };
    }

    // Run searches in parallel chunks with configurable concurrency
    const concurrency = storeSearchConfig.concurrency;
    for (let i = 0; i < validStores.length; i += concurrency) {
      const chunk = validStores.slice(i, i + concurrency);

      // Wait for shopping prices before first chunk
      if (i === 0 && validatePricing) {
        shoppingPrices = await shoppingPromise;
        // shoppingPrices ready for validation
      }

      const chunkResults = await Promise.allSettled(
        chunk.map(s => searchOneStore(s.key, s.cfg))
      );

      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Store search failed', result.reason, { requestId });
          metadata.fallbackResults++;
          const failedStore = chunk[j];
          if (failedStore) {
            warnings.push(`${failedStore.cfg.name} data may be unavailable`);
          }
        }
      }

      // Small delay between concurrency chunks (not between individual stores)
      if (i + concurrency < validStores.length) {
        await sleep(storeSearchConfig.chunkDelayMs);
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

    logger.info('Store search complete', {
      requestId,
      duration: Date.now() - startTime,
      resultsCount: results.length,
      highQuality: metadata.highQualityResults,
      fallbacks: metadata.fallbackResults,
      warningCount: warnings.length,
    });

    const response = NextResponse.json({
      results,
      warnings: warnings.length > 0 ? warnings : undefined,
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

  } catch (error: unknown) {
    logger.error('Store search request error', error, { requestId, duration: Date.now() - startTime });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: message, results: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
