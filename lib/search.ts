export async function webSearch(query: string, retries: number = 2): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.error('BRAVE_SEARCH_API_KEY not set');
    return "Web search not configured. Please add BRAVE_SEARCH_API_KEY to environment variables.";
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15`,
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
        if (attempt < retries && response.status >= 500) {
          continue;
        }
        return `Search API error: ${response.status}`;
      }

      const data = await response.json();

      if (!data.web || !data.web.results || data.web.results.length === 0) {
        if (attempt < retries) {
          continue;
        }
        return "No search results found";
      }

      let results = `Search results for "${query}":\n\n`;

      for (const result of data.web.results.slice(0, 12)) {
        results += `**${result.title}**\n`;
        results += `${result.description}\n`;
        results += `URL: ${result.url}\n\n`;
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      if (attempt < retries) {
        continue;
      }
      return `Search error: ${error}`;
    }
  }

  return "Search failed after retries";
}

export async function webFetch(url: string): Promise<string> {
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

    if (!response.ok) {
      console.error('Fetch failed:', response.status);
      return `Error fetching URL: HTTP ${response.status}`;
    }

    const html = await response.text();

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

    return text.substring(0, 15000);
  } catch (error: unknown) {
    console.error('Fetch error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return 'Error fetching URL: Request timeout';
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Error fetching URL: ${message}`;
  }
}
