/**
 * Advanced Product Data Extraction
 *
 * Creative approaches to extract real-time pricing and inventory
 * without using official retail APIs:
 *
 * 1. JSON-LD Structured Data - Schema.org data embedded for SEO
 * 2. Meta Tags - OpenGraph and product meta tags
 * 3. HTML Patterns - Common price/availability markup patterns
 * 4. Google Shopping - Aggregated pricing from multiple sources
 * 5. Multi-URL Validation - Cross-reference multiple results
 */

import { logger } from '@/lib/logger';
import type { BraveSearchResult } from '@/lib/search';

export interface ExtractedProductData {
  price: number | null;
  originalPrice: number | null;
  currency: string;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only' | 'check-online';
  sku: string | null;
  productName: string | null;
  brand: string | null;
  rating: number | null;
  reviewCount: number | null;
  storeStock: string | null; // e.g., "5 in stock at your store"
  confidence: 'high' | 'medium' | 'low';
  source: string; // Which extraction method found the data
}

/**
 * Extract JSON-LD structured data from HTML
 * Most e-commerce sites include Schema.org Product data for SEO
 */
export function extractJsonLd(html: string): Partial<ExtractedProductData> | null {
  try {
    // Find all JSON-LD script tags
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = html.matchAll(jsonLdRegex);

    for (const match of matches) {
      try {
        const jsonStr = match[1].trim();
        const data = JSON.parse(jsonStr);

        // Handle arrays of JSON-LD objects
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          // Look for Product type
          if (item['@type'] === 'Product' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            return parseProductJsonLd(item);
          }

          // Check @graph for embedded products
          if (item['@graph']) {
            for (const graphItem of item['@graph']) {
              if (graphItem['@type'] === 'Product') {
                return parseProductJsonLd(graphItem);
              }
            }
          }
        }
      } catch (e) {
        // Continue to next JSON-LD block
        continue;
      }
    }
    return null;
  } catch (error) {
    logger.error('JSON-LD extraction error', error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-LD from external sites has unpredictable shape
function parseProductJsonLd(product: Record<string, any>): Partial<ExtractedProductData> {
  const result: Partial<ExtractedProductData> = {
    source: 'json-ld',
    confidence: 'high',
  };

  // Extract name
  result.productName = product.name || null;
  result.brand = product.brand?.name || product.brand || null;
  result.sku = product.sku || product.productID || product.mpn || null;

  // Extract offer/price data
  const offers = product.offers;
  if (offers) {
    const offer = Array.isArray(offers) ? offers[0] : offers;

    // Price extraction
    result.price = parseFloat(offer.price) || null;
    result.currency = offer.priceCurrency || 'USD';

    // Check for sale price vs original
    if (offer.priceSpecification) {
      const priceSpec = Array.isArray(offer.priceSpecification)
        ? offer.priceSpecification[0]
        : offer.priceSpecification;
      if (priceSpec.price) {
        result.price = parseFloat(priceSpec.price);
      }
    }

    // Availability mapping
    const availabilityUrl = offer.availability || '';
    result.availability = mapSchemaAvailability(availabilityUrl);

    // Stock level hints
    if (offer.inventoryLevel) {
      const level = offer.inventoryLevel.value || offer.inventoryLevel;
      if (typeof level === 'number') {
        result.storeStock = `${level} available`;
        if (level === 0) {
          result.availability = 'out-of-stock';
        } else if (level < 5) {
          result.availability = 'limited';
        }
      }
    }
  }

  // Extract ratings
  if (product.aggregateRating) {
    result.rating = parseFloat(product.aggregateRating.ratingValue) || null;
    result.reviewCount = parseInt(product.aggregateRating.reviewCount) || null;
  }

  return result;
}

function mapSchemaAvailability(url: string): ExtractedProductData['availability'] {
  const lower = url.toLowerCase();
  if (lower.includes('instock') || lower.includes('in_stock')) {
    return 'in-stock';
  } else if (lower.includes('outofstock') || lower.includes('out_of_stock')) {
    return 'out-of-stock';
  } else if (lower.includes('limitedavailability') || lower.includes('limited')) {
    return 'limited';
  } else if (lower.includes('onlineonly')) {
    return 'online-only';
  } else if (lower.includes('preorder') || lower.includes('backorder')) {
    return 'limited';
  }
  return 'check-online';
}

/**
 * Extract product data from meta tags
 * OpenGraph, Twitter Cards, and product-specific meta tags
 */
export function extractMetaTags(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'meta-tags',
    confidence: 'medium',
  };

  // Common meta tag patterns for product data
  const metaPatterns = [
    // Price patterns
    { regex: /<meta[^>]*(?:property|name)=["'](?:og:price:amount|product:price:amount|twitter:data1)["'][^>]*content=["']([^"']+)["']/i, field: 'price' },
    { regex: /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:price:amount|product:price:amount)["']/i, field: 'price' },
    // Currency
    { regex: /<meta[^>]*(?:property|name)=["'](?:og:price:currency|product:price:currency)["'][^>]*content=["']([^"']+)["']/i, field: 'currency' },
    // Availability
    { regex: /<meta[^>]*(?:property|name)=["'](?:og:availability|product:availability)["'][^>]*content=["']([^"']+)["']/i, field: 'availability' },
    // Product name
    { regex: /<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i, field: 'productName' },
    // SKU
    { regex: /<meta[^>]*(?:property|name)=["'](?:product:sku|og:sku)["'][^>]*content=["']([^"']+)["']/i, field: 'sku' },
  ];

  let foundData = false;

  for (const pattern of metaPatterns) {
    const match = html.match(pattern.regex);
    if (match && match[1]) {
      foundData = true;
      if (pattern.field === 'price') {
        result.price = parseFloat(match[1].replace(/[^0-9.]/g, ''));
      } else if (pattern.field === 'currency') {
        result.currency = match[1];
      } else if (pattern.field === 'availability') {
        result.availability = mapMetaAvailability(match[1]);
      } else if (pattern.field === 'productName') {
        result.productName = match[1];
      } else if (pattern.field === 'sku') {
        result.sku = match[1];
      }
    }
  }

  return foundData ? result : null;
}

function mapMetaAvailability(value: string): ExtractedProductData['availability'] {
  const lower = value.toLowerCase();
  if (lower === 'instock' || lower === 'in stock' || lower === 'available') {
    return 'in-stock';
  } else if (lower === 'outofstock' || lower === 'out of stock' || lower === 'unavailable') {
    return 'out-of-stock';
  } else if (lower.includes('limited') || lower.includes('low')) {
    return 'limited';
  }
  return 'check-online';
}

/**
 * Extract pricing from common HTML patterns
 * Fallback when structured data isn't available
 */
export function extractHtmlPatterns(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'html-patterns',
    confidence: 'medium',
  };

  // Price extraction patterns (ordered by reliability)
  const pricePatterns = [
    // Data attributes (most reliable)
    /data-price=["']?([\d.]+)["']?/i,
    /data-product-price=["']?([\d.]+)["']?/i,
    /data-current-price=["']?([\d.]+)["']?/i,
    /data-analytics-price=["']?([\d.]+)["']?/i,

    // Itemprop (Schema.org microdata)
    /itemprop=["']price["'][^>]*content=["']?([\d.]+)["']?/i,
    /<[^>]*itemprop=["']price["'][^>]*>\s*\$?([\d.]+)/i,

    // Common price class patterns
    /<[^>]*class=["'][^"']*(?:price|product-price|current-price|sale-price)[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i,

    // Home Depot specific
    /price-format__main-price[^>]*>\s*\$?([\d,]+)/i,
    /class=["'][^"']*price__dollars[^"']*["'][^>]*>\s*\$?([\d,]+)/i,

    // Lowe's specific
    /class=["'][^"']*art-pd-price[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i,
    /main-price[^>]*>\s*\$?([\d,]+\.?\d*)/i,

    // Generic price patterns with $ sign
    />\s*\$\s*([\d,]+\.?\d{0,2})\s*</,

    // JSON in script with price
    /"price"\s*:\s*([\d.]+)/,
    /"salePrice"\s*:\s*([\d.]+)/,
    /"currentPrice"\s*:\s*([\d.]+)/,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0 && price < 100000) { // Sanity check
        result.price = price;
        break;
      }
    }
  }

  // Availability extraction patterns
  const availabilityPatterns = [
    // In stock patterns
    { pattern: /(?:class|id)=["'][^"']*(?:in-stock|instock|available)[^"']*["']/i, status: 'in-stock' as const },
    { pattern: />(?:\s*In Stock\s*|\s*Available\s*)</i, status: 'in-stock' as const },
    { pattern: /(?:add.to.cart|add-to-cart)["'][^>]*(?!disabled)/i, status: 'in-stock' as const },
    { pattern: /available.for.(?:pickup|delivery)/i, status: 'in-stock' as const },
    { pattern: /ready.in.(?:\d+|same)/i, status: 'in-stock' as const },

    // Limited stock patterns
    { pattern: /only.(\d+).left/i, status: 'limited' as const },
    { pattern: /low.stock/i, status: 'limited' as const },
    { pattern: /limited.availability/i, status: 'limited' as const },
    { pattern: /(\d+).in.stock/i, status: 'limited' as const },

    // Out of stock patterns
    { pattern: /(?:class|id)=["'][^"']*(?:out-of-stock|outofstock|unavailable|sold-out)[^"']*["']/i, status: 'out-of-stock' as const },
    { pattern: />(?:\s*Out of Stock\s*|\s*Sold Out\s*|\s*Unavailable\s*)</i, status: 'out-of-stock' as const },
    { pattern: /currently.(?:unavailable|out.of.stock)/i, status: 'out-of-stock' as const },
    { pattern: /add.to.cart["'][^>]*disabled/i, status: 'out-of-stock' as const },

    // Online only
    { pattern: /(?:ship.to.home|online.only|delivery.only)/i, status: 'online-only' as const },
  ];

  for (const { pattern, status } of availabilityPatterns) {
    if (pattern.test(html)) {
      result.availability = status;
      break;
    }
  }

  // Extract stock quantity if mentioned
  const stockQuantityMatch = html.match(/(\d+)\s*(?:in stock|available|left|remaining)/i);
  if (stockQuantityMatch) {
    const qty = parseInt(stockQuantityMatch[1]);
    result.storeStock = `${qty} available`;
    if (qty === 0) {
      result.availability = 'out-of-stock';
    } else if (qty <= 3) {
      result.availability = 'limited';
    }
  }

  // SKU patterns
  const skuPatterns = [
    /(?:sku|item|model|product)[\s#:]*([A-Z0-9-]{5,})/i,
    /data-sku=["']([^"']+)["']/i,
    /"sku"\s*:\s*["']([^"']+)["']/,
  ];

  for (const pattern of skuPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.sku = match[1];
      break;
    }
  }

  return result.price || result.availability !== 'check-online' ? result : null;
}

/**
 * Store-specific extraction enhancements
 */
export function extractStoreSpecific(html: string, store: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: `store-specific-${store}`,
    confidence: 'high',
  };

  switch (store) {
    case 'home-depot':
      return extractHomeDepot(html);
    case 'lowes':
      return extractLowes(html);
    case 'ace-hardware':
      return extractAceHardware(html);
    case 'menards':
      return extractMenards(html);
    default:
      return null;
  }
}

function extractHomeDepot(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'home-depot-specific',
    confidence: 'high',
  };

  // Home Depot embeds product data in window.__PRELOADED_STATE__ or similar
  const preloadedStateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*(?:<\/script>|window\.)/);
  if (preloadedStateMatch) {
    try {
      // This is complex nested JSON, extract just the price
      const priceMatch = preloadedStateMatch[1].match(/"price"\s*:\s*([\d.]+)/);
      const availMatch = preloadedStateMatch[1].match(/"fulfillmentOptions"[\s\S]*?"available"\s*:\s*(true|false)/);

      if (priceMatch) {
        result.price = parseFloat(priceMatch[1]);
      }
      if (availMatch) {
        result.availability = availMatch[1] === 'true' ? 'in-stock' : 'out-of-stock';
      }
    } catch (e) {
      // Fall through to regex patterns
    }
  }

  // Backup: Look for HD's price format
  const hdPriceMatch = html.match(/\$\s*([\d,]+)\s*(?:<sup[^>]*>|\.)(\d{2})/);
  if (hdPriceMatch && !result.price) {
    result.price = parseFloat(`${hdPriceMatch[1].replace(/,/g, '')}.${hdPriceMatch[2]}`);
  }

  // Check for BOPIS (Buy Online Pick Up In Store) availability
  if (/pickup.?(?:today|available|ready)/i.test(html)) {
    result.availability = 'in-stock';
    result.storeStock = 'Available for pickup';
  } else if (/ship.to.store/i.test(html) && !result.availability) {
    result.availability = 'online-only';
  }

  return result.price ? result : null;
}

function extractLowes(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'lowes-specific',
    confidence: 'high',
  };

  // Lowe's uses data layer and structured pricing
  const lowesDataMatch = html.match(/window\.digitalData\s*=\s*({[\s\S]*?});/);
  if (lowesDataMatch) {
    try {
      const priceMatch = lowesDataMatch[1].match(/"price"\s*:\s*([\d.]+)/);
      if (priceMatch) {
        result.price = parseFloat(priceMatch[1]);
      }
    } catch (e) {
      // Continue to backup patterns
    }
  }

  // Lowe's price patterns
  const lowesPricePatterns = [
    /art-pd-price[^>]*>\s*\$\s*([\d,]+\.?\d*)/i,
    /finalPrice["']\s*:\s*([\d.]+)/,
    /class=["'][^"']*price[^"']*["'][^>]*>\s*\$\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of lowesPricePatterns) {
    const match = html.match(pattern);
    if (match && match[1] && !result.price) {
      result.price = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Check availability indicators
  if (/(?:in.stock|available).at.your.store/i.test(html)) {
    result.availability = 'in-stock';
  } else if (/check.other.stores/i.test(html)) {
    result.availability = 'limited';
  } else if (/out.of.stock|unavailable/i.test(html)) {
    result.availability = 'out-of-stock';
  }

  return result.price ? result : null;
}

function extractAceHardware(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'ace-specific',
    confidence: 'high',
  };

  // Ace Hardware patterns
  const acePriceMatch = html.match(/class=["'][^"']*product-price[^"']*["'][^>]*>\s*\$\s*([\d,]+\.?\d*)/i);
  if (acePriceMatch) {
    result.price = parseFloat(acePriceMatch[1].replace(/,/g, ''));
  }

  // JSON price data
  const aceJsonMatch = html.match(/"productPrice"\s*:\s*([\d.]+)/);
  if (aceJsonMatch && !result.price) {
    result.price = parseFloat(aceJsonMatch[1]);
  }

  // Ace availability - often shows local store stock
  if (/available.at.(?:your|nearby)/i.test(html)) {
    result.availability = 'in-stock';
  } else if (/order.online/i.test(html)) {
    result.availability = 'online-only';
  }

  return result.price ? result : null;
}

function extractMenards(html: string): Partial<ExtractedProductData> | null {
  const result: Partial<ExtractedProductData> = {
    source: 'menards-specific',
    confidence: 'high',
  };

  // Menards price patterns
  const menardsPriceMatch = html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*\$\s*([\d,]+\.?\d*)/i);
  if (menardsPriceMatch) {
    result.price = parseFloat(menardsPriceMatch[1].replace(/,/g, ''));
  }

  // Menards availability
  if (/in.stock|available/i.test(html)) {
    result.availability = 'in-stock';
  }

  return result.price ? result : null;
}

/**
 * Master extraction function - tries all methods and merges results
 */
export function extractProductData(html: string, store?: string): ExtractedProductData {
  const defaultResult: ExtractedProductData = {
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
    source: 'none',
  };

  // Try extraction methods in order of reliability
  const methods = [
    () => extractJsonLd(html),
    () => store ? extractStoreSpecific(html, store) : null,
    () => extractMetaTags(html),
    () => extractHtmlPatterns(html),
  ];

  let result = { ...defaultResult };

  for (const method of methods) {
    const extracted = method();
    if (extracted) {
      // Merge results, preferring earlier (more reliable) extractions
      result = {
        ...result,
        ...Object.fromEntries(
          Object.entries(extracted).filter(([_, v]) => v !== null && v !== undefined)
        ),
      } as ExtractedProductData;

      // If we have price and availability with high confidence, we're done
      if (result.price && result.availability !== 'check-online' && result.confidence === 'high') {
        break;
      }
    }
  }

  // Determine overall confidence
  if (result.price && result.availability !== 'check-online') {
    result.confidence = result.source.includes('json-ld') || result.source.includes('specific') ? 'high' : 'medium';
  } else if (result.price) {
    result.confidence = 'medium';
  } else {
    result.confidence = 'low';
  }

  return result;
}

/**
 * Fetch and extract product data from a URL
 */
export async function fetchProductData(url: string, store?: string): Promise<ExtractedProductData & { url: string }> {
  const defaultResult: ExtractedProductData & { url: string } = {
    url,
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
    source: 'fetch-failed',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('Failed to fetch product URL', null, { url, status: response.status });
      return defaultResult;
    }

    const html = await response.text();
    const extracted = extractProductData(html, store);

    return {
      ...extracted,
      url,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching product data', error, { url });
    return defaultResult;
  }
}

/**
 * Extract prices from text using regex, returning price+store pairs.
 */
function extractPricesFromText(
  text: string,
  url: string
): Array<{ store: string; price: number }> {
  const found: Array<{ store: string; price: number }> = [];
  const priceRegex = /\$\s*([\d,]+\.?\d{0,2})/g;
  let match;
  while ((match = priceRegex.exec(text)) !== null) {
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (price > 0.5 && price < 10000) {
      let store = 'Unknown';
      if (url.includes('homedepot')) store = 'Home Depot';
      else if (url.includes('lowes')) store = "Lowe's";
      else if (url.includes('amazon')) store = 'Amazon';
      else if (url.includes('walmart')) store = 'Walmart';
      else if (url.includes('ace')) store = 'Ace Hardware';
      else if (url.includes('menards')) store = 'Menards';
      found.push({ store, price });
    }
  }
  return found;
}

function storeNameFromUrl(url: string): string {
  if (url.includes('homedepot')) return 'Home Depot';
  if (url.includes('lowes')) return "Lowe's";
  if (url.includes('amazon')) return 'Amazon';
  if (url.includes('walmart')) return 'Walmart';
  if (url.includes('ace')) return 'Ace Hardware';
  if (url.includes('menards')) return 'Menards';
  return 'Unknown';
}

/**
 * Extract the single most likely product price from one search result.
 * Takes only the FIRST price found in title > description > snippets,
 * preventing noise from related products, shipping, bundles, etc.
 */
function extractBestPriceFromResult(result: { title: string; description: string; extra_snippets?: string[]; url: string }): { store: string; price: number } | null {
  const priceRegex = /\$\s*([\d,]+\.?\d{0,2})/;

  // Priority 1: Price in title (most likely the main product price)
  const titleMatch = result.title.match(priceRegex);
  if (titleMatch) {
    const price = parseFloat(titleMatch[1].replace(/,/g, ''));
    if (price > 0.5 && price < 10000) return { store: storeNameFromUrl(result.url), price };
  }

  // Priority 2: First price in description
  const descMatch = result.description.match(priceRegex);
  if (descMatch) {
    const price = parseFloat(descMatch[1].replace(/,/g, ''));
    if (price > 0.5 && price < 10000) return { store: storeNameFromUrl(result.url), price };
  }

  // Priority 3: First price in extra snippets
  if (result.extra_snippets) {
    for (const snippet of result.extra_snippets) {
      const snippetMatch = snippet.match(priceRegex);
      if (snippetMatch) {
        const price = parseFloat(snippetMatch[1].replace(/,/g, ''));
        if (price > 0.5 && price < 10000) return { store: storeNameFromUrl(result.url), price };
      }
    }
  }

  return null;
}

/**
 * Filter outlier prices using IQR (Interquartile Range) method.
 * Removes prices that fall outside 1.5×IQR from Q1/Q3.
 */
function filterPriceOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return sorted.filter(p => p >= lower && p <= upper);
}

/**
 * Search Google Shopping for price validation.
 * Returns aggregated pricing from multiple retailers.
 *
 * When prefetchedResults are provided (from webSearchStructured), uses those
 * instead of making a separate API call — avoids double requests and leverages
 * extra_snippets from Brave Pro AI for richer price extraction.
 */
export async function searchGoogleShopping(
  query: string,
  apiKey?: string,
  prefetchedResults?: BraveSearchResult[]
): Promise<{
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sources: Array<{ store: string; price: number }>;
}> {
  const result = {
    avgPrice: null as number | null,
    minPrice: null as number | null,
    maxPrice: null as number | null,
    sources: [] as Array<{ store: string; price: number }>,
  };

  // Helper to process search results into prices (one price per result, with outlier filtering)
  function processResults(items: Array<{ title: string; description: string; extra_snippets?: string[]; url: string }>) {
    const rawPrices: number[] = [];
    for (const item of items) {
      const best = extractBestPriceFromResult(item);
      if (best) {
        rawPrices.push(best.price);
        result.sources.push(best);
      }
    }

    // Filter outliers before computing aggregates
    const filtered = filterPriceOutliers(rawPrices);
    if (filtered.length > 0) {
      result.minPrice = Math.min(...filtered);
      result.maxPrice = Math.max(...filtered);
      result.avgPrice = filtered.reduce((a, b) => a + b, 0) / filtered.length;
    }
  }

  // If pre-fetched structured results are available, use them directly
  if (prefetchedResults && prefetchedResults.length > 0) {
    processResults(prefetchedResults);
    return result;
  }

  // Fallback: make our own API call
  if (!apiKey) {
    apiKey = process.env.BRAVE_SEARCH_API_KEY;
  }

  if (!apiKey) {
    return result;
  }

  try {
    const searchQuery = `${query} price buy`;
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=15&extra_snippets=true`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      return result;
    }

    const data = await response.json();

    if (data.web?.results) {
      processResults(data.web.results);
    }

    return result;
  } catch (error) {
    logger.error('Google Shopping search error', error, { query });
    return result;
  }
}

/**
 * Validate and reconcile prices from multiple sources
 */
export function validatePrices(
  directPrice: number | null,
  shoppingPrices: { avgPrice: number | null; minPrice: number | null; maxPrice: number | null }
): { price: number | null; confidence: 'high' | 'medium' | 'low'; warning?: string } {
  if (!directPrice && !shoppingPrices.avgPrice) {
    return { price: null, confidence: 'low' };
  }

  if (!directPrice && shoppingPrices.avgPrice) {
    return {
      price: shoppingPrices.avgPrice,
      confidence: 'medium',
      warning: 'Price estimated from similar products',
    };
  }

  if (directPrice && !shoppingPrices.avgPrice) {
    return { price: directPrice, confidence: 'medium' };
  }

  // Both available - validate
  const diff = Math.abs(directPrice! - shoppingPrices.avgPrice!) / shoppingPrices.avgPrice!;

  if (diff < 0.15) {
    // Within 15% - good match
    return { price: directPrice, confidence: 'high' };
  } else if (diff < 0.5) {
    // Within 50% - might be sale or different size
    return {
      price: directPrice,
      confidence: 'medium',
      warning: `Price varies. Range: $${shoppingPrices.minPrice?.toFixed(2)} - $${shoppingPrices.maxPrice?.toFixed(2)}`,
    };
  } else {
    // Large difference - flag it
    return {
      price: directPrice,
      confidence: 'low',
      warning: `Price may be incorrect. Typical range: $${shoppingPrices.minPrice?.toFixed(2)} - $${shoppingPrices.maxPrice?.toFixed(2)}`,
    };
  }
}

/**
 * Look up real prices for a list of materials using web search,
 * then update estimated_price in-place where better data is found.
 *
 * Design:
 * - Pre-checks API key once before entering the loop
 * - Per-call timeout + total timeout prevents hanging callers
 * - Median-based price selection reduces outlier influence
 * - Sanity check rejects lookups >10x or <0.1x the AI estimate
 * - Rate-limit detection: if majority of a chunk fails, abort
 * - Never throws — returns gracefully so materials list generation isn't blocked
 */
export async function lookupMaterialPrices(
  materials: Array<{ name: string; estimated_price: string; [key: string]: unknown }>,
  options?: { limit?: number; concurrency?: number; perCallTimeoutMs?: number; totalTimeoutMs?: number }
): Promise<number> {
  const {
    limit = 8,
    concurrency = 4,
    perCallTimeoutMs = 3000,
    totalTimeoutMs = 10000,
  } = options || {};

  // Pre-check API key — avoid N wasted calls
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return 0;
  }

  const totalDeadline = Date.now() + totalTimeoutMs;
  const toProcess = materials.slice(0, limit);
  let updatedCount = 0;
  let failCount = 0;

  // Process in chunks of `concurrency`
  for (let i = 0; i < toProcess.length; i += concurrency) {
    if (Date.now() >= totalDeadline) break;

    // Rate-limit detection: if majority of previous chunk failed, abort
    if (i > 0 && failCount > i * 0.6) break;

    const chunk = toProcess.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      chunk.map(async (mat) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), perCallTimeoutMs);

        try {
          // Include quantity in search for better specificity (e.g., "14/2 Romex 25ft price")
          const qtyHint = mat.quantity ? ` ${mat.quantity}` : '';
          const searchQuery = `${mat.name}${qtyHint} price`;
          const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10&extra_snippets=true`,
            {
              headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey,
              },
              signal: controller.signal,
            }
          );

          clearTimeout(timeout);

          if (!response.ok) return null;

          const data = await response.json();
          const webResults = data.web?.results;
          if (!webResults?.length) return null;

          // Extract ONE price per search result (reduces noise dramatically)
          const rawPrices: number[] = [];
          for (const item of webResults) {
            const best = extractBestPriceFromResult(item);
            if (best) rawPrices.push(best.price);
          }

          if (rawPrices.length === 0) return null;

          // Filter outliers using IQR
          const filtered = filterPriceOutliers(rawPrices);
          if (filtered.length === 0) return null;

          // Skip if remaining prices have high variance (coefficient of variation > 0.8)
          const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
          if (filtered.length >= 3) {
            const variance = filtered.reduce((sum, p) => sum + (p - mean) ** 2, 0) / filtered.length;
            const cv = Math.sqrt(variance) / mean;
            if (cv > 0.8) return null; // prices are all over the place, data is unreliable
          }

          // Compute price using median-based selection
          const sorted = [...filtered].sort((a, b) => a - b);
          const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          const bestPrice = filtered.length >= 3 ? Math.min(mean, median) : median;

          return { mat, bestPrice };
        } catch {
          clearTimeout(timeout);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'rejected' || result.value === null) {
        failCount++;
        continue;
      }

      const { mat, bestPrice } = result.value;
      const aiEstimate = parseFloat(mat.estimated_price);

      // Tighter sanity check: reject if lookup is >3x or <0.33x the AI estimate
      // (AI estimate is already in the right ballpark thanks to pricing reference table)
      if (aiEstimate > 0 && (bestPrice > aiEstimate * 3 || bestPrice < aiEstimate * 0.33)) {
        continue;
      }

      const rounded = Math.round(bestPrice * 100) / 100;
      mat.estimated_price = String(rounded);
      updatedCount++;
    }
  }

  return updatedCount;
}
