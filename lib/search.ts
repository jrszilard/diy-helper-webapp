export async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  
  if (!apiKey) {
    console.error('BRAVE_SEARCH_API_KEY not set');
    return "Web search not configured. Please add BRAVE_SEARCH_API_KEY to environment variables.";
  }

  console.log('Searching for:', query);

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      console.error('Brave API error:', response.status, response.statusText);
      return `Search API error: ${response.status}`;
    }

    const data = await response.json();
    
    if (!data.web || !data.web.results || data.web.results.length === 0) {
      return "No search results found";
    }

    console.log('Found', data.web.results.length, 'results');

    let results = `Search results for "${query}":\n\n`;
    
    for (const result of data.web.results.slice(0, 8)) {
      results += `**${result.title}**\n`;
      results += `${result.description}\n`;
      results += `URL: ${result.url}\n\n`;
    }

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return `Search error: ${error}`;
  }
}

export async function webFetch(url: string): Promise<string> {
  console.log('Fetching:', url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('Fetch failed - HTTP', response.status);
      return `Error fetching URL: HTTP ${response.status}`;
    }

    const html = await response.text();
    
    console.log('Raw HTML length:', html.length, 'characters');
    console.log('First 500 chars of HTML:', html.substring(0, 500));
    
    if (html.length < 1000) {
      console.warn('Very short response - might be blocked or redirected');
      console.log('Full response:', html);
    }
    
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Extracted text length:', text.length, 'characters');
    
    if (text.length < 500) {
      console.log('Full extracted text:', text);
    } else {
      console.log('First 500 chars of extracted text:', text.substring(0, 500));
    }
    
    return text.substring(0, 15000);
  } catch (error: any) {
    console.error('Fetch error:', error);
    
    if (error.name === 'AbortError') {
      return 'Error fetching URL: Request timeout';
    }
    
    return `Error fetching URL: ${error.message}`;
  }
}