import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';

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
    excludePatterns: ['/b/', '/c/'],
  },
  'lowes': {
    name: "Lowe's",
    domain: 'lowes.com',
    phone: '1-800-445-6937',
    productPathPatterns: ['/pd/'],
    excludePatterns: ['/pl/'],
  },
  'ace-hardware': {
    name: 'Ace Hardware',
    domain: 'acehardware.com',
    phone: '1-888-827-4223',
    productPathPatterns: ['/product/', '/p/'],
    excludePatterns: ['/category/', '/search'],
  },
  'menards': {
    name: 'Menards',
    domain: 'menards.com',
    phone: '1-800-871-2800',
    productPathPatterns: ['/main/p-'],
    excludePatterns: ['/main/store'],
  },
};

type StoreKey = keyof typeof STORE_CONFIGS;

// Extract product URLs from search results
function extractProductUrls(searchResults: string, config: typeof STORE_CONFIGS[StoreKey]): string[] {
  console.log('Extracting URLs for', config.domain);

  const escapedDomain = config.domain.replace('.', '\\.');
  const urlRegex = new RegExp(`https?://(?:www\\.)?${escapedDomain}[^\\s<>"']+`, 'g');
  const matches = searchResults.match(urlRegex) || [];

  console.log(`Found ${matches.length} total URLs`);

  // Clean and filter URLs
  const productUrls = matches
    .map(url => {
      // Clean up URL
      return url
        .replace(/[)\]}>'",.;]+$/, '')
        .split('?')[0]
        .split('#')[0];
    })
    .filter(url => {
      // Check if URL contains any product path pattern
      const hasProductPath = config.productPathPatterns.some(pattern => url.includes(pattern));
      // Check if URL contains any exclude pattern
      const hasExcludePath = config.excludePatterns.some(pattern => url.includes(pattern));

      return hasProductPath && !hasExcludePath;
    })
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  console.log(`Filtered to ${productUrls.length} product URLs`);

  return productUrls.slice(0, 3);
}

export async function POST(req: Request) {
  try {
    const { materialName, location, stores = ['home-depot', 'lowes', 'ace-hardware'] } = await req.json();

    if (!materialName || !location) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    console.log(`Searching for "${materialName}" near ${location}`);
    console.log(`Stores to search: ${stores.join(', ')}`);

    const results: any[] = [];

    // Search each requested store
    for (let i = 0; i < stores.length; i++) {
      const storeKey = stores[i] as StoreKey;
      const config = STORE_CONFIGS[storeKey];

      if (!config) {
        console.log(`Unknown store: ${storeKey}`);
        continue;
      }

      console.log(`===== ${config.name.toUpperCase()} SEARCH =====`);

      try {
        const searchQuery = `${materialName} site:${config.domain}`;
        const searchResult = await webSearch(searchQuery);

        if (!searchResult.includes('Search API error')) {
          const urls = extractProductUrls(searchResult, config);
          console.log(`${config.name} URLs found:`, urls.length);

          if (urls.length > 0) {
            results.push({
              store: `${config.name} - ${location}`,
              retailer: storeKey,
              price: 0, // User checks on website
              availability: 'check-online',
              distance: 'Search by ZIP on website',
              address: 'Multiple locations - check website',
              phone: config.phone,
              link: urls[0],
              notes: 'Click "View Product" to see current price and check local availability',
            });
          }
        }
      } catch (error) {
        console.error(`Error searching ${config.name}:`, error);
      }

      // Add delay between stores to avoid rate limiting
      if (i < stores.length - 1) {
        await sleep(2000);
      }
    }

    console.log('===== FINAL RESULTS =====');
    console.log('Total stores found:', results.length);

    return NextResponse.json({
      results,
      stores_searched: stores.length,
      query: materialName,
      location,
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 });
  }
}
