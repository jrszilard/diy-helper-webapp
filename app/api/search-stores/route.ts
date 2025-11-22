import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';

// Helper function to add delay
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const { materialName, location } = await req.json();

    if (!materialName || !location) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    console.log('Searching for:', materialName, 'near', location);

    const results: any[] = [];

    // Search Home Depot
    console.log('===== HOME DEPOT SEARCH =====');
    const hdSearch = await webSearch(`${materialName} site:homedepot.com`);
    
    if (!hdSearch.includes('Search API error')) {
      const hdUrls = extractProductUrls(hdSearch, 'homedepot.com');
      console.log('Home Depot URLs found:', hdUrls.length);
      
      if (hdUrls.length > 0) {
        results.push({
          store: `Home Depot - ${location}`,
          price: 0, // No price - user will check on website
          availability: 'check-online' as const,
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: '1-800-466-3337',
          link: hdUrls[0],
          notes: 'Click "View Product" to see current price and check local availability'
        });
      }
    }

    // Add delay to avoid rate limiting
    await sleep(2000);

    // Search Lowe's
    console.log('===== LOWES SEARCH =====');
    const lowesSearch = await webSearch(`${materialName} site:lowes.com`);
    
    if (!lowesSearch.includes('Search API error')) {
      const lowesUrls = extractProductUrls(lowesSearch, 'lowes.com');
      console.log('Lowes URLs found:', lowesUrls.length);
      
      if (lowesUrls.length > 0) {
        results.push({
          store: `Lowe's - ${location}`,
          price: 0, // No price - user will check on website
          availability: 'check-online' as const,
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: '1-800-445-6937',
          link: lowesUrls[0],
          notes: 'Click "View Product" to see current price and check local availability'
        });
      }
    }

    // Add delay before Ace
    await sleep(2000);

    // Search Ace Hardware
    console.log('===== ACE HARDWARE SEARCH =====');
    const aceSearch = await webSearch(`${materialName} site:acehardware.com`);
    
    if (!aceSearch.includes('Search API error')) {
      const aceUrls = extractProductUrls(aceSearch, 'acehardware.com');
      console.log('Ace Hardware URLs found:', aceUrls.length);
      
      if (aceUrls.length > 0) {
        results.push({
          store: `Ace Hardware - ${location}`,
          price: 0, // No price - user will check on website
          availability: 'check-online' as const,
          distance: 'Search by ZIP on website',
          address: 'Multiple locations - check website',
          phone: 'See website for local store',
          link: aceUrls[0],
          notes: 'Click "View Product" to see current price and check local availability'
        });
      }
    }

    console.log('===== FINAL RESULTS =====');
    console.log('Total stores found:', results.length);
    console.log('Results:', JSON.stringify(results, null, 2));
    
    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 });
  }
}

// Extract product URLs from search results
function extractProductUrls(searchResults: string, domain: string): string[] {
  console.log('Extracting URLs for', domain);
  
  const escapedDomain = domain.replace('.', '\\.');
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
      // Home Depot product pages: /p/
      if (domain.includes('homedepot.com')) {
        return url.includes('/p/') && !url.includes('/b/') && !url.includes('/c/');
      }
      
      // Lowe's product pages: /pd/
      if (domain.includes('lowes.com')) {
        return url.includes('/pd/') && !url.includes('/pl/');
      }
      
      // Ace Hardware product pages
      if (domain.includes('acehardware.com')) {
        return (url.includes('/product/') || url.includes('/p/')) && 
               !url.includes('/category/') && 
               !url.includes('/search');
      }
      
      return false;
    })
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  console.log(`Filtered to ${productUrls.length} product URLs`);
  
  return productUrls.slice(0, 3);
}