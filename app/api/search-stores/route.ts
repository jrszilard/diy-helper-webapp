import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { materialName, location, quantity } = await req.json();
    
    // Parse location
    const [city, state] = location.split(',').map((s: string) => s.trim());
    
    if (!city || !state) {
      return NextResponse.json(
        { error: 'Invalid location format. Use "City, State"' },
        { status: 400 }
      );
    }
    
    // Call Claude to search for stores
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Search for "${materialName}" at local stores near ${city}, ${state}. I need ${quantity} of this item.

Follow this process:
1. Use web_search to find: "${materialName} Home Depot ${city} ${state} in stock price"
2. Use web_search to find: "${materialName} Lowes ${city} ${state} price availability"
3. Use web_search to find: "${materialName} Ace Hardware ${city} ${state}"
4. Use web_fetch on the most relevant product pages to get:
   - Exact current pricing (including sales/discounts)
   - In-stock status at nearby locations
   - Store addresses within 15 miles of ${city}
   - Product links
   - Store phone numbers

Format your response as a JSON array with this structure:
[
  {
    "store": "Home Depot",
    "price": 24.99,
    "original_price": 29.99,
    "availability": "in-stock",
    "distance": "2.3 miles",
    "address": "123 Main St, ${city}, ${state}",
    "phone": "(603) 555-0100",
    "link": "https://...",
    "notes": "Sale ends Sunday"
  }
]

Return ONLY valid JSON, no other text. If you can't find exact prices, use reasonable estimates based on typical market prices.`
      }]
    });
    
    // Extract JSON from response
    let resultsText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultsText += block.text;
      }
    }
    
    // Parse JSON (remove markdown code blocks if present)
    resultsText = resultsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(resultsText);
    
    return NextResponse.json({ results });
    
  } catch (error: any) {
    console.error('Store search error:', error);
    return NextResponse.json(
      { error: 'Failed to search stores', details: error.message },
      { status: 500 }
    );
  }
}