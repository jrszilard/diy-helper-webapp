import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Helper to detect if query mentions a location
function detectLocation(message: string): { city?: string; state?: string } | null {
  const message_lower = message.toLowerCase();
  
  // Common patterns for location mentions
  const patterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2}|[A-Z][a-z]+)/i,  // "in Portsmouth, NH"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2}|[A-Z][a-z]+)/i,      // "Portsmouth NH" or "Portsmouth, New Hampshire"
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        city: match[1].trim(),
        state: match[2].trim()
      };
    }
  }
  
  return null;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const systemPrompt = `You are a helpful DIY assistant specializing in home improvement projects. You have access to several tools:

**CRITICAL: Tool Selection Rules**
- If user mentions a SPECIFIC CITY or STATE → ALWAYS use search_local_codes
- If user asks about "my area", "local", "here" → ALWAYS use search_local_codes  
- If user asks about permits → ALWAYS use search_local_codes
- Only use search_building_codes for NATIONAL codes (NEC, IRC, IBC) when no location is mentioned

**MATERIALS LIST - EXTREMELY CRITICAL:**

**When you call the extract_materials_list tool, it will return a response that includes special markers:**
---MATERIALS_DATA---
{json data}
---END_MATERIALS_DATA---

**YOU MUST INCLUDE THESE EXACT MARKERS IN YOUR RESPONSE TO THE USER.**

When user says ANY of these phrases, immediately call extract_materials_list:
- "create a materials list"
- "create a complete materials list"  
- "add to shopping list"
- "add all items to shopping list"
- "save to shopping list"
- "make a shopping list"
- "call the extract_materials_list tool"
- "yes" (in response to your offer to create materials list)
- "sure" (in response to your offer to create materials list)

**Required Parameters:**
1. project_description: Brief description (e.g., "Ceiling fan installation in Portsmouth NH")
2. materials: Complete array of ALL materials with these fields:
   - name: Product name
   - quantity: Amount needed (e.g., "1", "50 ft", "1 box")
   - category: One of: electrical, lumber, plumbing, hardware, tools
   - estimated_price: Price estimate (e.g., "150", "25", "10")
   - required: true or false

**CRITICAL - After calling the tool:**
The tool will return a response with special markers. You MUST include the complete tool result in your response to the user, including all the markers.

**Example - CORRECT Response:**
"✅ I've created your materials list!

[Include the ENTIRE tool result here, word-for-word, including the markers]

Materials List for Ceiling Fan Installation
...
---MATERIALS_DATA---
{"project_description":"...","materials":[...]}
---END_MATERIALS_DATA---

You can now save these materials to your project!"

**Example - WRONG Response:**
"✅ I've created your materials list! You should now see a dialog." (without including the tool result) ❌

**The markers are ESSENTIAL - without them, materials cannot be saved.**

**Tools:**
1. search_building_codes - ONLY for national/international codes (NEC, IRC, IBC) when NO specific location is mentioned
2. search_products - Product specifications and pricing
3. calculate_wire_size - Electrical wire size calculations
4. search_local_codes - Use when ANY city, state, or location is mentioned, or for permit questions
5. extract_materials_list - **REQUIRED when user wants materials list. MUST include markers in your response.**
6. search_local_stores - Find materials at nearby stores with prices and availability
7. compare_store_prices - Compare prices across stores for best deals

**Conversation Flow:**
1. User asks about a project (e.g., "Help me install a ceiling fan in Portsmouth NH")
2. You use search_local_codes to explain the process, codes, and requirements
3. You ALWAYS end with: "Would you like me to create a complete materials list for this project?"
4. When user says YES or requests materials list → call extract_materials_list with ALL materials
5. Include the COMPLETE tool result (with markers) in your response
6. User sees "Save Materials to Project" dialog
7. After saving, materials appear in shopping list with checkboxes
8. User can search local stores for prices

**search_local_codes usage:**
- "What do I need for an addition in Portsmouth, NH?" → search_local_codes
- "I'm in Austin, what's required for a deck?" → search_local_codes
- "Chicago outlet requirements" → search_local_codes
- "Do I need a permit for a fence?" → search_local_codes (ask for location first)
- "Local building codes for my area" → search_local_codes (ask for location first)

**search_building_codes usage:**
- "What's the national code for outlet spacing?" → search_building_codes
- "NEC requirements for wire gauge" → search_building_codes
- "IRC deck railing height" → search_building_codes

**How search_local_codes works:**
When you call this tool, you'll receive instructions to use your web_search and web_fetch tools to find official local building codes. Follow the instructions to:
1. Search for official municipal code websites (.gov, municode.com, ecode360.com)
2. Fetch the relevant pages
3. Extract specific requirements (measurements, specifications)
4. Cite your sources with URLs
5. Remind users to verify with their local building department

**Material Shopping Workflow:**
After user saves materials to project:
1. Materials appear in shopping list sidebar with checkboxes
2. User selects items they want to price check
3. User enters their location (e.g., "Portsmouth, NH")
4. They click "Search" to find local store prices
5. Results show with best deals highlighted

**Important Reminders:**
- Always prioritize official government sources for building codes
- Provide specific measurements and requirements, not just links
- Include source URLs for verification
- Remind users to verify with their local building department
- When calling extract_materials_list, INCLUDE THE COMPLETE TOOL RESULT WITH MARKERS in your response`;

const tools = [
  {
    name: "search_building_codes",
    description: "Search NATIONAL building codes ONLY (NEC, IRC, IBC). Use this ONLY when the user asks about national/international codes and does NOT mention any specific city, state, or location. If a location is mentioned, use search_local_codes instead.",
    input_schema: {
      type: "object",
      properties: {
        query: { 
          type: "string",
          description: "Search query for NATIONAL building codes only"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_products",
    description: "Search for construction materials and products with pricing",
    input_schema: {
      type: "object",
      properties: {
        query: { 
          type: "string",
          description: "Product search query"
        },
        category: {
          type: "string",
          description: "Product category (electrical, plumbing, lumber, etc.)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_wire_size",
    description: "Calculate required wire gauge for electrical circuits",
    input_schema: {
      type: "object",
      properties: {
        amperage: { type: "number" },
        distance: { type: "number" },
        voltage: { type: "number" }
      },
      required: ["amperage", "distance"]
    }
  },
  {
    name: "search_local_codes",
    description: "Search for LOCAL building code requirements for a SPECIFIC city and state. Use this tool whenever a user mentions ANY location (city, state, address) or asks about permits, zoning, or local requirements. This will trigger a web search for official local building codes and municipal ordinances.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The specific question about local codes (e.g., 'home addition requirements', 'zoning compliance', 'deck permit requirements', 'outlet spacing')"
        },
        city: {
          type: "string",
          description: "The city name (e.g., 'Portsmouth', 'Austin', 'Chicago')"
        },
        state: {
          type: "string",
          description: "The state name or abbreviation (e.g., 'New Hampshire', 'NH', 'Texas', 'TX')"
        }
      },
      required: ["query", "city", "state"]
    }
  },
  {
    name: "extract_materials_list",
    description: "Extract a list of materials and tools needed for a project from the conversation context. Returns a structured list that users can selectively add to their shopping list.",
    input_schema: {
      type: "object",
      properties: {
        project_description: {
          type: "string",
          description: "Brief description of the project (e.g., 'home office addition', 'deck installation', 'outlet installation')"
        },
        project_id: {
          type: "string",
          description: "Optional project ID to save materials to database"
        },
        materials: {
          type: "array",
          description: "Array of materials needed",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Material name" },
              quantity: { type: "string", description: "Quantity needed (e.g., '250 ft', '10 pieces', '1 box')" },
              category: { type: "string", description: "Category (electrical, lumber, plumbing, hardware, tools)" },
              estimated_price: { type: "string", description: "Rough price estimate" },
              required: { type: "boolean", description: "Is this absolutely required vs optional" }
            }
          }
        }
      },
      required: ["project_description", "materials"]
    }
  },
  {
    name: "search_local_stores",
    description: "Search for materials at local stores (Home Depot, Lowe's, Ace Hardware, etc.) in a specific location. Finds availability, pricing, and in-stock status.",
    input_schema: {
      type: "object",
      properties: {
        material_name: {
          type: "string",
          description: "The material to search for (e.g., '12/2 Romex wire', '2x4 lumber', 'GFCI outlet')"
        },
        city: {
          type: "string",
          description: "City name"
        },
        state: {
          type: "string",
          description: "State name or abbreviation"
        },
        radius_miles: {
          type: "number",
          description: "Search radius in miles (default 10)",
          default: 10
        }
      },
      required: ["material_name", "city", "state"]
    }
  },
  {
    name: "compare_store_prices",
    description: "Compare prices for a specific material across multiple stores. Returns best deals and availability.",
    input_schema: {
      type: "object",
      properties: {
        material_name: {
          type: "string",
          description: "Material to compare"
        },
        stores: {
          type: "array",
          description: "List of store names to compare",
          items: { type: "string" }
        },
        location: {
          type: "string",
          description: "City, State format"
        }
      },
      required: ["material_name", "location"]
    }
  }
];

async function executeTool(toolName: string, toolInput: any): Promise<string> {
  if (toolName === "search_building_codes") {
    return "**Building Code Results:**\n\nKitchen countertop receptacles must be installed so that no point along the wall line is more than 24 inches from a receptacle outlet (NEC 210.52(C)(1)).\n\nGFCI protection is required for all 125-volt, 15- and 20-ampere receptacles in garages (NEC 210.8(A)(2)).\n\nSource: National Electrical Code 2023";
  }
  
  if (toolName === "search_products") {
    return "**Product Results:**\n\n1. Southwire 250 ft. 12/2 Solid Romex NM-B Wire\n   - Price: $87.43\n   - Rating: 4.7/5 (2,340 reviews)\n   - In Stock\n\n2. Leviton 20 Amp GFCI Outlet, White\n   - Price: $18.97\n   - Rating: 4.6/5 (1,892 reviews)\n   - In Stock";
  }
  
  if (toolName === "calculate_wire_size") {
    const { amperage, distance } = toolInput;
    if (amperage <= 15 && distance <= 50) {
      return "For a 15-amp circuit up to 50 feet: Use 14 AWG wire (per NEC 210.19)";
    } else if (amperage <= 20 && distance <= 50) {
      return "For a 20-amp circuit up to 50 feet: Use 12 AWG wire (per NEC 210.19)";
    } else {
      return "For a 30-amp circuit or longer runs: Use 10 AWG wire (per NEC 210.19)";
    }
  }
  
  if (toolName === "search_local_codes") {
    const { query, city, state } = toolInput;
    
    return `Please search for local building codes for ${city}, ${state} regarding: ${query}

Follow this process:
1. Use web_search to find: "${city} ${state} building code ${query}"
2. Prioritize official sources (.gov, municode.com, ecode360.com)
3. Use web_fetch on the most authoritative source you find
4. Extract and summarize:
   - Specific requirements (measurements, specifications)
   - Permit requirements if applicable
   - Any local amendments that differ from national codes
   - The official source URL
5. Always conclude with: "Verify these requirements with ${city} Building Department before starting work."

If you cannot find specific local codes, provide the national code reference and explain that local amendments may apply.`;
  }
  
  if (toolName === "extract_materials_list") {
    const { project_description, materials } = toolInput;
    
  // Log what we received
  console.log('extract_materials_list called with:', {
    project_description,
    materials_count: materials?.length || 0,
    materials: materials
  });
  
  // Validate we have materials
  if (!materials || materials.length === 0) {
    console.error('❌ No materials provided to extract_materials_list!');
    return "❌ Error: No materials were provided. Please list the specific materials needed for this project.";
  }

    // Don't save to database yet - let user choose
    let response = `**Materials List for ${project_description}**\n\n`;
    response += `I've identified ${materials.length} items you'll need:\n\n`;
    
    const categories = materials.reduce((acc: any, mat: any) => {
      if (!acc[mat.category]) acc[mat.category] = [];
      acc[mat.category].push(mat);
      return acc;
    }, {});
    
    for (const [category, items] of Object.entries(categories)) {
      response += `**${category.toUpperCase()}:**\n`;
      (items as any[]).forEach((item) => {
        const reqTag = item.required ? '✓ Required' : '○ Optional';
        response += `- ${item.name} (${item.quantity}) - Est. $${item.estimated_price} [${reqTag}]\n`;
      });
      response += `\n`;
    }
    
    // Add a special marker that the UI can detect
    response += `\n---MATERIALS_DATA---\n`;
    response += JSON.stringify({ project_description, materials });
    response += `\n---END_MATERIALS_DATA---\n`;

    console.log('✅ Returning materials data with markers');
    console.log('Response length:', response.length);
    console.log('Contains markers:', response.includes('---MATERIALS_DATA---'));
    
    return response;
  }

  if (toolName === "search_local_stores") {
    const { material_name, city, state, radius_miles = 10 } = toolInput;
    
    return `Please search for "${material_name}" at local stores near ${city}, ${state}:

Follow this process:
1. Use web_search to find: "${material_name} Home Depot ${city} ${state} in stock"
2. Use web_search to find: "${material_name} Lowes ${city} ${state} price"
3. Use web_search to find: "${material_name} Ace Hardware ${city} ${state}"
4. Use web_fetch on store product pages to get:
   - Exact pricing
   - In-stock status
   - Store locations within ${radius_miles} miles
   - Online ordering/pickup options
   - Product specifications
5. Extract and format:
   - Store name and address
   - Price (including any sales/discounts)
   - Availability (In Stock / Limited / Out of Stock / Order Online)
   - Distance from ${city}
   - Direct product link
   - Store phone number

Present results in a comparison table format with the best deal highlighted.
Include a note about checking store websites for real-time availability.`;
  }
  
  if (toolName === "compare_store_prices") {
    const { material_name, stores, location } = toolInput;
    
    const storeList = stores && stores.length > 0 
      ? stores.join(', ')
      : 'Home Depot, Lowes, Ace Hardware';
    
    return `Please compare prices for "${material_name}" across stores near ${location}:

Follow this process:
1. For each store (${storeList}):
   - Use web_search: "${material_name} [STORE NAME] ${location} price"
   - Use web_fetch on product pages
   - Extract current price, sale prices, and bulk discounts
2. Create a comparison showing:
   - Store name
   - Regular price
   - Sale price (if applicable)
   - Price per unit (if sold in bulk)
   - Availability
   - Delivery/pickup options
   - Total cost for quantity needed
3. Identify and highlight:
   - Lowest price
   - Best value (considering quality/quantity)
   - Fastest availability
   - Free delivery options
4. Include:
   - Direct purchase links
   - Store locations
   - Any promo codes or coupons found

Present as a clear comparison table with a recommendation for the best option.`;
  }

  return "Tool not implemented yet.";
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Received message:', message);

    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: message
      }
    ];

    // FIRST API CALL - Include system prompt
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as any,
      messages: messages
    });

    console.log('Claude response received');

    // Tool use loop
    while (response.stop_reason === 'tool_use') {
      const assistantContent: any[] = [];
      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`Tool called: ${block.name}`);
          
          const result = await executeTool(block.name, block.input);

          assistantContent.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });
        } else if (block.type === 'text') {
          assistantContent.push({
            type: 'text',
            text: block.text
          });
        }
      }

      messages.push({
        role: 'assistant' as const,
        content: assistantContent
      });

      messages.push({
        role: 'user' as const,
        content: toolResults
      });

      // FOLLOW-UP API CALL - Include system prompt again
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as any,
        messages: messages
      });
    }

    let finalResponse = '';
    const finalContent: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
        finalContent.push({
          type: 'text',
          text: block.text
        });
      }
    }

    messages.push({
      role: 'assistant' as const,
      content: finalContent
    });

    return NextResponse.json({
      response: finalResponse,
      history: messages
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}