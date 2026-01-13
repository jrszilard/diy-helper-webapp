import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';
import {
  fetchProductData,
  searchGoogleShopping,
  validatePrices,
  ExtractedProductData,
} from '@/lib/product-extractor';

// Helper function to add delay
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Store-specific configurations
const STORE_CONFIGS = {
  'home-depot': {
    name: 'Home Depot',
    domain: 'homedepot.com',
    phone: '1-800-466-3337',
    productPathPatterns: ['/p/'],
    excludePatterns: ['/b/', '/c/', '/search'],
    priceMultiplier: 1.0, // For any store-specific adjustments
  },
  'lowes': {
    name: "Lowe's",
    domain: 'lowes.com',
    phone: '1-800-445-6937',
    productPathPatterns: ['/pd/'],
    excludePatterns: ['/pl/', '/search'],
    priceMultiplier: 1.0,
  },
  'ace-hardware': {
    name: 'Ace Hardware',
    domain: 'acehardware.com',
    phone: '1-888-827-4223',
    productPathPatterns: ['/product/', '/p/'],
    excludePatterns: ['/category/', '/search'],
    priceMultiplier: 1.0,
  },
  'menards': {
    name: 'Menards',
    domain: 'menards.com',
    phone: '1-800-871-2800',
    productPathPatterns: ['/main/p-'],
    excludePatterns: ['/main/store', '/search'],
    priceMultiplier: 1.0,
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
}

// Extract product URLs from search results
function extractProductUrls(searchResults: string, config: typeof STORE_CONFIGS[StoreKey]): { productUrls: string[]; anyUrls: string[] } {
  console.log('Extracting URLs for', config.domain);

  const escapedDomain = config.domain.replace('.', '\\.');
  const urlRegex = new RegExp(`https?://(?:www\\.)?${escapedDomain}[^\\s<>"'\\]\\)]+`, 'g');
  const matches = searchResults.match(urlRegex) || [];

  console.log(`Found ${matches.length} total URLs`);

  // Clean all URLs
  const cleanedUrls = matches
    .map(url => {
      // Clean up URL - remove trailing punctuation and query params
      return url
        .replace(/[)\]}>'",.;:]+$/, '')
        .split('?')[0]
        .split('#')[0];
    })
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  // Filter for product URLs
  const productUrls = cleanedUrls
    .filter(url => {
      // Check if URL contains any product path pattern
      const hasProductPath = config.productPathPatterns.some(pattern => url.includes(pattern));
      // Check if URL contains any exclude pattern
      const hasExcludePath = config.excludePatterns.some(pattern => url.includes(pattern));

      return hasProductPath && !hasExcludePath;
    });

  console.log(`Filtered to ${productUrls.length} product URLs`);

  // Return both product URLs and any store URLs as fallback
  return {
    productUrls: productUrls.slice(0, 5),
    anyUrls: cleanedUrls.slice(0, 3), // Keep some general URLs as fallback
  };
}

// Fetch and extract data from multiple product URLs, return the best result
async function fetchBestProductData(
  urls: string[],
  storeKey: string,
  timeoutMs: number = 8000
): Promise<ExtractedProductData & { url: string }> {
  // Always return something - default to first URL with low confidence
  const defaultResult: ExtractedProductData & { url: string } = {
    url: urls[0],
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

  // Fetch data from up to 2 URLs in parallel with timeout
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
        console.log(`Fetch failed for ${url}:`, error);
        return null;
      }
    };

    const fetchPromises = urlsToFetch.map(url => fetchWithTimeout(url));
    const fetched = await Promise.all(fetchPromises);

    // Filter out null results and add valid ones
    for (const result of fetched) {
      if (result && (result.price !== null || result.availability !== 'check-online')) {
        results.push(result);
      }
    }
  } catch (error) {
    console.error('Error in fetchBestProductData:', error);
  }

  // If no extraction succeeded, return default with first URL
  if (results.length === 0) {
    console.log(`No extraction succeeded, using fallback for ${urls[0]}`);
    return defaultResult;
  }

  // Prioritize results with both price and availability
  const withBoth = results.find(r => r.price !== null && r.availability !== 'check-online');
  if (withBoth) return withBoth;

  // Then prioritize results with in-stock availability
  const inStock = results.find(r => r.availability === 'in-stock' || r.availability === 'limited');
  if (inStock) return inStock;

  // Then prioritize results with price
  const withPrice = results.find(r => r.price !== null);
  if (withPrice) return withPrice;

  // Return first result
  return results[0];
}

export async function POST(req: Request) {
  try {
    const {
      materialName,
      location,
      stores = ['home-depot', 'lowes', 'ace-hardware'],
      validatePricing = true, // Enable multi-source price validation
    } = await req.json();

    if (!materialName || !location) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    console.log(`\n========================================`);
    console.log(`Searching for "${materialName}" near ${location}`);
    console.log(`Stores to search: ${stores.join(', ')}`);
    console.log(`Price validation: ${validatePricing ? 'enabled' : 'disabled'}`);
    console.log(`========================================\n`);

    const results: StoreResult[] = [];
    let shoppingPrices: Awaited<ReturnType<typeof searchGoogleShopping>> | null = null;

    // First, get aggregated pricing for validation (in parallel with first store search)
    const shoppingPromise = validatePricing
      ? searchGoogleShopping(materialName)
      : Promise.resolve(null);

    // Search each requested store
    for (let i = 0; i < stores.length; i++) {
      const storeKey = stores[i] as StoreKey;
      const config = STORE_CONFIGS[storeKey];

      if (!config) {
        console.log(`Unknown store: ${storeKey}`);
        continue;
      }

      console.log(`\n===== ${config.name.toUpperCase()} SEARCH =====`);

      try {
        // Use more specific search query for better results
        const searchQuery = `${materialName} site:${config.domain}`;
        console.log(`Search query: ${searchQuery}`);

        const searchResult = await webSearch(searchQuery);

        if (searchResult.includes('Search API error') || searchResult.includes('No search results')) {
          console.log(`No results from ${config.name}`);
          continue;
        }

        const { productUrls, anyUrls } = extractProductUrls(searchResult, config);
        console.log(`${config.name} product URLs found:`, productUrls.length);
        console.log(`${config.name} total URLs found:`, anyUrls.length);

        // Use product URLs if available, otherwise fall back to any store URLs
        const urlsToUse = productUrls.length > 0 ? productUrls : anyUrls;

        if (urlsToUse.length > 0) {
          console.log(`Using URLs: ${urlsToUse.slice(0, 3).join(', ')}`);

          // Fetch and extract actual product data (always returns non-null with fallback)
          const productData = await fetchBestProductData(urlsToUse, storeKey);

          // Wait for shopping prices if this is the first store
          if (i === 0 && validatePricing) {
            shoppingPrices = await shoppingPromise;
            console.log(`Shopping price range: $${shoppingPrices?.minPrice?.toFixed(2)} - $${shoppingPrices?.maxPrice?.toFixed(2)}`);
          }

          // Validate price against aggregated data
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

          // Build result notes
          const notes: string[] = [];
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
            confidence: priceData.confidence as 'high' | 'medium' | 'low',
            priceWarning: priceData.warning,
            sku: productData.sku || undefined,
            storeStock: productData.storeStock || undefined,
          };

          console.log(`Result: $${storeResult.price} | ${storeResult.availability} | Confidence: ${storeResult.confidence}`);
          results.push(storeResult);
        } else {
          // No URLs found, but search had results - create a generic search link
          console.log(`No URLs extracted for ${config.name}, creating search fallback`);
          const searchUrl = `https://www.${config.domain}/search?q=${encodeURIComponent(materialName)}`;
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
          });
        }
      } catch (error) {
        console.error(`Error searching ${config.name}:`, error);
      }

      // Add delay between stores to avoid rate limiting
      if (i < stores.length - 1) {
        await sleep(1500);
      }
    }

    // Sort results: in-stock first, then by confidence, then by price
    results.sort((a, b) => {
      // Availability priority
      const availPriority = {
        'in-stock': 0,
        'limited': 1,
        'online-only': 2,
        'check-online': 3,
        'out-of-stock': 4,
      };
      const availDiff = availPriority[a.availability] - availPriority[b.availability];
      if (availDiff !== 0) return availDiff;

      // Confidence priority
      const confPriority = { high: 0, medium: 1, low: 2 };
      const confDiff = confPriority[a.confidence] - confPriority[b.confidence];
      if (confDiff !== 0) return confDiff;

      // Price (lower is better, but 0 means unknown)
      if (a.price && b.price) return a.price - b.price;
      if (a.price) return -1;
      if (b.price) return 1;
      return 0;
    });

    console.log(`\n===== FINAL RESULTS =====`);
    console.log('Total stores found:', results.length);
    for (const r of results) {
      console.log(`  ${r.retailer}: $${r.price} | ${r.availability} | ${r.confidence}`);
    }

    return NextResponse.json({
      results,
      stores_searched: stores.length,
      query: materialName,
      location,
      priceRange: shoppingPrices ? {
        min: shoppingPrices.minPrice,
        max: shoppingPrices.maxPrice,
        avg: shoppingPrices.avgPrice,
        sources: shoppingPrices.sources.length,
      } : null,
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 });
  }
}
