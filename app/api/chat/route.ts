import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { webSearch, webFetch } from '@/lib/search';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Progress event types
interface StreamEvent {
  type: 'progress' | 'text' | 'tool_start' | 'tool_result' | 'done' | 'error';
  step?: string;
  message?: string;
  icon?: string;
  content?: string;
  toolName?: string;
  result?: any;
}

// Progress messages for each tool
const progressMessages: Record<string, { message: string; icon: string }> = {
  search_building_codes: { message: 'Searching building codes...', icon: '📋' },
  search_local_codes: { message: 'Looking up local building codes...', icon: '🏛️' },
  search_project_videos: { message: 'Finding tutorial videos...', icon: '🎥' },
  extract_materials_list: { message: 'Creating materials list...', icon: '📝' },
  search_local_stores: { message: 'Checking local store prices...', icon: '🏪' },
  check_user_inventory: { message: 'Cross-referencing your inventory...', icon: '🔧' },
  detect_owned_items: { message: 'Adding items to your inventory...', icon: '📦' },
  search_products: { message: 'Searching for products...', icon: '🔍' },
  calculate_wire_size: { message: 'Calculating wire requirements...', icon: '⚡' },
  compare_store_prices: { message: 'Comparing store prices...', icon: '💰' },
  web_search: { message: 'Searching the web...', icon: '🌐' },
  web_fetch: { message: 'Fetching page content...', icon: '📄' }
};

const systemPrompt = `You are a helpful DIY assistant specializing in home improvement projects. You have access to several tools:

**CRITICAL WORKFLOW - FOLLOW THIS EXACTLY:**

1. User asks about a DIY project (e.g., "I want to install a ceiling fan")
2. You provide helpful guidance and information about the project
3. You ALWAYS end with: "Would you like to see some helpful videos of similar projects?"
4. When user says YES or wants videos → **IMMEDIATELY call search_project_videos tool with the project description**
5. Display video results to user with titles, descriptions, and links
6. After showing videos, ask: "Would you like me to create a complete materials list for this project?"
7. When user agrees to materials list → **IMMEDIATELY call check_user_inventory FIRST, then call extract_materials_list tool with ALL materials**
8. User sees "Save Materials to Project" dialog
9. After saving, materials appear in their shopping list with checkboxes
10. User can then search local stores for prices

**INVENTORY DETECTION - THIS IS CRITICAL - ALWAYS DO THIS:**

You MUST call the detect_owned_items tool IMMEDIATELY when the user mentions owning ANY tools or materials. Do NOT just acknowledge what they said - you MUST call the tool.

**Trigger phrases that REQUIRE calling detect_owned_items:**
- "I have a..." / "I have..." / "I've got..."
- "I already have..." / "I already own..."
- "I own a..." / "I own..."
- "We have..." / "We've got..." / "We own..."
- "My [tool]..." / "My tools include..."
- "I bought a..." / "I picked up a..."
- "I can use my..." / "I'll use my..."
- "got a [tool]" / "have [tool] already"

**INVENTORY CHECK - BEFORE EVERY MATERIALS LIST:**

BEFORE creating any materials list with extract_materials_list, you MUST:
1. FIRST call check_user_inventory to see what the user already owns
2. THEN call extract_materials_list
3. The extract_materials_list tool will automatically cross-reference and mark owned items

**Video Search Guidelines:**
- Search for instructional/tutorial videos, not product reviews
- Use specific, actionable queries like "how to install ceiling fan" not just "ceiling fan"
- Present videos in a clear, organized format with titles and links
- Focus on beginner-friendly, comprehensive tutorials

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

**Tools:**
1. detect_owned_items - **MUST call when user mentions owning tools/materials**
2. check_user_inventory - **MUST call before extract_materials_list**
3. search_building_codes - ONLY for national/international codes (NEC, IRC, IBC) when NO specific location is mentioned
4. search_products - Product specifications and pricing
5. calculate_wire_size - Electrical wire size calculations
6. search_local_codes - Use when ANY city, state, or location is mentioned, or for permit questions
7. extract_materials_list - **REQUIRED when user wants materials list. MUST include markers in your response.**
8. search_local_stores - Find materials at nearby stores with prices and availability
9. compare_store_prices - Compare prices across stores for best deals
10. search_project_videos - Search for DIY tutorial videos

**Conversation Flow:**
1. User asks about a project (e.g., "Help me install a ceiling fan in Portsmouth NH")
2. **If user mentions tools they have → IMMEDIATELY call detect_owned_items**
3. You use search_local_codes to explain the process, codes, and requirements
4. You ALWAYS end with: "Would you like to see some helpful videos of similar projects?"
5. User says yes → call search_project_videos
6. After videos, ask: "Would you like me to create a complete materials list for this project?"
7. When user says YES → **FIRST call check_user_inventory, THEN call extract_materials_list**
8. Include the COMPLETE tool result (with markers) in your response
9. User sees "Save Materials to Project" dialog
10. After saving, materials appear in shopping list with checkboxes
11. User can search local stores for prices

**Important Reminders:**
- Always prioritize official government sources for building codes
- Provide specific measurements and requirements, not just links
- Include source URLs for verification
- Remind users to verify with their local building department
- When calling extract_materials_list, INCLUDE THE COMPLETE TOOL RESULT WITH MARKERS in your response
- **ALWAYS call detect_owned_items when user mentions tools they have - this is NOT optional**`;

const tools = [
  {
    name: "detect_owned_items",
    description: "REQUIRED: Detect and extract tools or materials the user mentions they already own. You MUST call this tool whenever the user says things like 'I have a drill', 'I already own...', 'I've got...', 'we have...', 'my tools include...'. This adds items to their digital inventory automatically.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Array of items the user mentioned they own",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the tool or material (e.g., 'cordless drill', '12-gauge wire', 'safety glasses')"
              },
              category: {
                type: "string",
                enum: ["power_tools", "hand_tools", "measuring", "safety", "electrical", "plumbing", "painting", "fasteners", "materials", "general"],
                description: "Category of the item"
              },
              quantity: {
                type: "number",
                description: "Quantity if mentioned (default: 1)"
              },
              condition: {
                type: "string",
                enum: ["new", "good", "fair", "needs_repair"],
                description: "Condition if mentioned (default: good)"
              }
            },
            required: ["name", "category"]
          }
        },
        source_context: {
          type: "string",
          description: "The part of the user's message that indicated ownership"
        }
      },
      required: ["items"]
    }
  },
  {
    name: "check_user_inventory",
    description: "REQUIRED before extract_materials_list: Check what tools and materials the user already owns. Always call this BEFORE extract_materials_list to identify items the user doesn't need to buy.",
    input_schema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Categories to check (e.g., ['power_tools', 'hand_tools', 'electrical']). Leave empty to get all inventory."
        }
      },
      required: []
    }
  },
  {
    name: "search_project_videos",
    description: "Search for helpful DIY tutorial videos related to a project. Use this when the user wants to see videos of similar projects or learn visually how to complete a task.",
    input_schema: {
      type: "object",
      properties: {
        project_query: {
          type: "string",
          description: "The DIY project to search videos for (e.g., 'ceiling fan installation', 'deck building', 'kitchen backsplash tile')"
        },
        max_results: {
          type: "number",
          description: "Maximum number of video results to return (default: 5)",
          default: 5
        }
      },
      required: ["project_query"]
    }
  },
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
    description: "Extract a list of materials and tools needed for a project. IMPORTANT: Always call check_user_inventory BEFORE this tool to cross-reference what the user already owns.",
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
  },
  {
    name: "web_search",
    description: "Search the web for current information. Use this to find real-time product prices, store locations, and availability.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "web_fetch",
    description: "Fetch and read the contents of a web page at a given URL",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch"
        }
      },
      required: ["url"]
    }
  }
];

async function executeTool(toolName: string, toolInput: any, requestBody?: any): Promise<string> {
  console.log(`🔧 Executing tool: ${toolName}`, JSON.stringify(toolInput, null, 2));

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

  if (toolName === "search_project_videos") {
    const { project_query, max_results = 5 } = toolInput;

    try {
      console.log('🎥 Searching videos for:', project_query);

      // Use Brave Search API to find videos
      const searchQuery = `${project_query} DIY tutorial how to`;
      const videoResponse = await fetch(
        `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(searchQuery)}&count=${max_results}`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || ''
          }
        }
      );

      if (!videoResponse.ok) {
        throw new Error(`Brave Search API error: ${videoResponse.status}`);
      }

      const data = await videoResponse.json();
      const videos = data.results || [];

      console.log(`📹 Found ${videos.length} videos`);

      const formattedResults = videos.map((video: any) => ({
        title: video.title || 'Untitled Video',
        description: video.description || 'No description available',
        url: video.url || video.page_url || '#',
        thumbnail: video.thumbnail?.src || null,
        duration: video.meta_url?.duration || null,
        channel: video.creator || video.meta_url?.hostname || 'Unknown',
        views: video.video?.views || null,
        published: video.age || null
      }));

      return JSON.stringify({
        success: true,
        query: project_query,
        videos: formattedResults,
        count: formattedResults.length,
        message: formattedResults.length > 0
          ? `Found ${formattedResults.length} helpful video tutorials`
          : 'No videos found for this search'
      });

    } catch (error: any) {
      console.error('❌ Video search error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Unable to search for videos at this time. Please try again later.'
      });
    }
  }

  if (toolName === "detect_owned_items") {
    const { items, source_context } = toolInput;

    // Get user ID from request context
    const userId = requestBody?.userId;

    console.log('🔧 detect_owned_items called:', {
      items,
      source_context,
      userId,
      hasUserId: !!userId
    });

    if (!userId) {
      console.log('⚠️ No userId provided for detect_owned_items');
      return "⚠️ User not logged in. Items noted but cannot be saved to inventory. Please sign in to save your tools.";
    }

    if (!items || items.length === 0) {
      return "No items detected to add to inventory.";
    }

    const addedItems: string[] = [];
    const existingItems: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        console.log(`📦 Processing item: ${item.name}`);

        // First, check if item already exists (case-insensitive)
        const { data: existingData } = await supabase
          .from('user_inventory')
          .select('id, item_name')
          .eq('user_id', userId)
          .ilike('item_name', item.name);

        if (existingData && existingData.length > 0) {
          console.log(`ℹ️ Item already exists: ${item.name}`);
          existingItems.push(item.name);
          continue;
        }

        // Insert new item
        const { data, error } = await supabase
          .from('user_inventory')
          .insert({
            user_id: userId,
            item_name: item.name,
            category: item.category || 'general',
            quantity: item.quantity || 1,
            condition: item.condition || 'good',
            auto_added: true,
            source_message: source_context || null
          })
          .select();

        if (error) {
          console.error('❌ Error adding inventory item:', error);
          // Check if it's a duplicate error
          if (error.code === '23505') {
            existingItems.push(item.name);
          } else {
            errors.push(`${item.name} (${error.message})`);
          }
        } else {
          console.log(`✅ Added item: ${item.name}`);
          addedItems.push(item.name);
        }
      } catch (err: any) {
        console.error('❌ Exception adding inventory item:', err);
        errors.push(`${item.name} (${err.message})`);
      }
    }

    let response = '';

    if (addedItems.length > 0) {
      response += `✅ Added to your inventory: ${addedItems.join(', ')}\n`;
    }

    if (existingItems.length > 0) {
      response += `ℹ️ Already in inventory: ${existingItems.join(', ')}\n`;
    }

    if (errors.length > 0) {
      response += `⚠️ Could not add: ${errors.join(', ')}\n`;
    }

    // Return a hidden marker for the frontend
    response += `\n---INVENTORY_UPDATE---\n`;
    response += JSON.stringify({ added: addedItems, existing: existingItems, errors });
    response += `\n---END_INVENTORY_UPDATE---\n`;

    console.log('📋 detect_owned_items result:', { addedItems, existingItems, errors });

    return response;
  }

  if (toolName === "check_user_inventory") {
    const { categories } = toolInput;
    const userId = requestBody?.userId;

    console.log('🔍 check_user_inventory called:', { categories, userId, hasUserId: !!userId });

    if (!userId) {
      return "User not logged in. Cannot check inventory. Will assume user needs to purchase all items.";
    }

    try {
      let query = supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .order('category')
        .order('item_name');

      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error checking inventory:', error);
        return "Error checking inventory: " + error.message;
      }

      console.log(`📦 Found ${data?.length || 0} inventory items`);

      if (!data || data.length === 0) {
        return "User's inventory is empty. They will need to purchase all required items.";
      }

      // Group by category for easier reading
      const grouped = data.reduce((acc: any, item: any) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});

      let response = `**User's Current Inventory (${data.length} items):**\n\n`;

      const categoryLabels: Record<string, string> = {
        power_tools: '⚡ Power Tools',
        hand_tools: '🔧 Hand Tools',
        measuring: '📏 Measuring',
        safety: '🦺 Safety Gear',
        electrical: '💡 Electrical',
        plumbing: '🔩 Plumbing',
        painting: '🎨 Painting',
        fasteners: '🔩 Fasteners',
        materials: '📦 Materials',
        general: '📋 General'
      };

      for (const [category, items] of Object.entries(grouped)) {
        const label = categoryLabels[category] || category;
        response += `${label}:\n`;
        (items as any[]).forEach((item: any) => {
          const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
          const cond = item.condition !== 'good' ? ` [${item.condition}]` : '';
          response += `  - ${item.item_name}${qty}${cond}\n`;
        });
        response += '\n';
      }

      // Add the data as JSON for potential frontend use
      response += `\n---INVENTORY_DATA---\n`;
      response += JSON.stringify(data);
      response += `\n---END_INVENTORY_DATA---\n`;

      return response;
    } catch (err: any) {
      console.error('❌ Exception checking inventory:', err);
      return "Error checking inventory: " + err.message;
    }
  }

  if (toolName === "extract_materials_list") {
    const { project_description, materials } = toolInput;
    const userId = requestBody?.userId;

    console.log('📝 extract_materials_list called:', {
      project_description,
      materials_count: materials?.length || 0,
      userId,
      hasUserId: !!userId
    });

    if (!materials || materials.length === 0) {
      return "❌ Error: No materials were provided.";
    }

    // Cross-reference with user's inventory
    let inventoryItems: any[] = [];
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_inventory')
          .select('item_name, category, quantity')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching inventory:', error);
        } else {
          inventoryItems = data || [];
          console.log(`📦 Found ${inventoryItems.length} inventory items for cross-reference`);
        }
      } catch (err) {
        console.error('Error fetching inventory for cross-reference:', err);
      }
    }

    // Function to check if user has a similar item
    const findOwnedItem = (materialName: string): string | null => {
      const normalizedName = materialName.toLowerCase().trim();

      for (const invItem of inventoryItems) {
        const invName = invItem.item_name.toLowerCase().trim();

        // Exact match
        if (normalizedName === invName) {
          return invItem.item_name;
        }

        // Check if one contains the other
        if (normalizedName.includes(invName) || invName.includes(normalizedName)) {
          return invItem.item_name;
        }

        // Check for key word matches (at least 2 common words or 1 significant word)
        const materialWords = normalizedName.split(/\s+/).filter((w: string) => w.length > 2);
        const invWords = invName.split(/\s+/).filter((w: string) => w.length > 2);

        const commonWords = materialWords.filter((mw: string) =>
          invWords.some((iw: string) =>
            iw === mw ||
            (mw.length > 4 && iw.includes(mw)) ||
            (iw.length > 4 && mw.includes(iw))
          )
        );

        // Match if we have 2+ common words, or 1 significant word (5+ chars)
        if (commonWords.length >= 2 ||
            (commonWords.length === 1 && commonWords[0].length >= 5)) {
          return invItem.item_name;
        }
      }

      return null;
    };

    // Categorize materials
    const needToBuy: any[] = [];
    const alreadyOwn: any[] = [];

    materials.forEach((mat: any) => {
      const ownedMatch = findOwnedItem(mat.name);
      if (ownedMatch) {
        alreadyOwn.push({ ...mat, ownedAs: ownedMatch });
        console.log(`✅ User owns: ${mat.name} (matches: ${ownedMatch})`);
      } else {
        needToBuy.push(mat);
        console.log(`🛒 User needs: ${mat.name}`);
      }
    });

    // Build response
    let response = `**Materials List for ${project_description}**\n\n`;

    if (alreadyOwn.length > 0) {
      response += `### ✅ Items You Already Have (${alreadyOwn.length})\n`;
      response += `*Based on your inventory - no need to purchase:*\n\n`;
      alreadyOwn.forEach((item) => {
        const matchNote = item.ownedAs.toLowerCase() !== item.name.toLowerCase()
          ? ` *(matches: ${item.ownedAs})*`
          : '';
        response += `- ~~${item.name}~~ ${matchNote}\n`;
      });
      response += `\n`;
    }

    if (needToBuy.length > 0) {
      response += `### 🛒 Items to Purchase (${needToBuy.length})\n\n`;

      // Group by category
      const categories = needToBuy.reduce((acc: any, mat: any) => {
        const cat = mat.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(mat);
        return acc;
      }, {});

      for (const [category, items] of Object.entries(categories)) {
        response += `**${category.toUpperCase()}:**\n`;
        (items as any[]).forEach((item) => {
          const reqTag = item.required !== false ? '✓ Required' : '○ Optional';
          const price = item.estimated_price || '?';
          response += `- ${item.name} (${item.quantity}) - Est. $${price} [${reqTag}]\n`;
        });
        response += `\n`;
      }
    } else if (alreadyOwn.length === materials.length) {
      response += `### 🎉 Great news! You already have everything you need!\n`;
      response += `Check your inventory to make sure items are in good condition.\n\n`;
    }

    // Calculate totals
    const totalEstimate = needToBuy.reduce((sum, item) => {
      const price = parseFloat(item.estimated_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);

    if (needToBuy.length > 0) {
      response += `**Estimated Total: $${totalEstimate.toFixed(2)}**\n`;
      if (alreadyOwn.length > 0) {
        response += `*Savings from inventory: ${alreadyOwn.length} item(s) you don't need to buy!*\n`;
      }
    }

    // Add markers for frontend - ONLY include items to buy, not owned items
    response += `\n---MATERIALS_DATA---\n`;
    response += JSON.stringify({
      project_description,
      materials: needToBuy,
      owned_items: alreadyOwn,
      total_estimate: totalEstimate
    });
    response += `\n---END_MATERIALS_DATA---\n`;

    console.log('📋 Materials list result:', {
      needToBuy: needToBuy.length,
      alreadyOwn: alreadyOwn.length,
      totalEstimate
    });

    return response;
  }

  if (toolName === "search_local_stores") {
    const { material_name, city, state, radius_miles = 25 } = toolInput;

    return `YOU MUST use web_search and web_fetch tools to find REAL products. DO NOT make up information.

Step 1: Call web_search with query: "site:homedepot.com ${material_name}"
Step 2: Call web_search with query: "site:lowes.com ${material_name}"
Step 3: Call web_search with query: "site:acehardware.com ${material_name}"

Step 4: For each product URL found in search results, call web_fetch to get the actual price and details

Step 5: Search for store locations:
- Call web_search with: "Home Depot ${city} ${state} store location"
- Call web_search with: "Lowes ${city} ${state} store location"

CRITICAL RULES:
- ONLY return products you found via web_search
- ONLY include URLs that were in the search results
- If web_search returns no results for a store, DO NOT include that store
- DO NOT make up prices, URLs, or availability
- You MUST call web_search at least 3 times before responding

Return results ONLY after you have called web_search multiple times.`;
  }

  if (toolName === "compare_store_prices") {
    const { material_name, location } = toolInput;
    return `To compare prices, use web_search to search each store:
1. web_search: "site:homedepot.com ${material_name} price"
2. web_search: "site:lowes.com ${material_name} price"
3. web_search: "site:acehardware.com ${material_name} price"

Then compile the results with actual prices found.`;
  }

  if (toolName === "web_search") {
    console.log('🔍 WEB_SEARCH CALLED with query:', toolInput.query);
    const result = await webSearch(toolInput.query);
    console.log('📊 Search returned:', result.substring(0, 200));
    return result;
  }

  if (toolName === "web_fetch") {
    console.log('📄 WEB_FETCH CALLED with URL:', toolInput.url);
    const result = await webFetch(toolInput.url);
    console.log('📄 Fetch returned:', result.substring(0, 200));
    return result;
  }

  return "Tool not implemented yet.";
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { message, history = [], userId, streaming = true } = body;

    console.log('📨 Received request:', {
      messageLength: message?.length,
      historyLength: history?.length,
      userId: userId || 'not provided',
      streaming
    });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If not streaming, use the old behavior
    if (!streaming) {
      return handleNonStreamingRequest(body, message, history, userId);
    }

    // Streaming response using Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch (e) {
            console.error('Error sending event:', e);
          }
        };

        try {
          sendEvent({
            type: 'progress',
            step: 'thinking',
            message: 'Analyzing your question...',
            icon: '🤔'
          });

          const messages = [
            ...history,
            { role: 'user' as const, content: message }
          ];

          // First API call
          let response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: systemPrompt,
            tools: tools as any,
            messages
          });

          console.log('🤖 Claude initial response, stop_reason:', response.stop_reason);

          // Tool use loop
          let loopCount = 0;
          const maxLoops = 10;

          while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
            loopCount++;
            console.log(`🔄 Tool loop iteration ${loopCount}`);

            const assistantContent: any[] = [];
            const toolResults: any[] = [];

            for (const block of response.content) {
              if (block.type === 'tool_use') {
                // Send progress for this tool
                const progress = progressMessages[block.name] || {
                  message: `Running ${block.name}...`,
                  icon: '⚙️'
                };
                sendEvent({
                  type: 'progress',
                  step: block.name,
                  message: progress.message,
                  icon: progress.icon
                });

                console.log(`🔧 Tool called: ${block.name}`, JSON.stringify(block.input).substring(0, 200));

                // Execute tool
                const result = await executeTool(block.name, block.input, body);

                console.log(`📤 Tool result for ${block.name}:`, result.substring(0, 200));

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

                // Stream intermediate text content
                if (block.text) {
                  sendEvent({ type: 'text', content: block.text });
                }
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

            sendEvent({
              type: 'progress',
              step: 'synthesizing',
              message: 'Putting it all together...',
              icon: '✨'
            });

            // Continue conversation with tool results
            response = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 4096,
              system: systemPrompt,
              tools: tools as any,
              messages
            });

            console.log(`🤖 Claude response after tool ${loopCount}, stop_reason:`, response.stop_reason);
          }

          if (loopCount >= maxLoops) {
            console.warn('⚠️ Hit maximum tool loop iterations');
          }

          // Stream final response in chunks for visual effect
          for (const block of response.content) {
            if (block.type === 'text') {
              const text = block.text;
              const chunkSize = 50; // Characters per chunk

              for (let i = 0; i < text.length; i += chunkSize) {
                sendEvent({ type: 'text', content: text.slice(i, i + chunkSize) });
                // Small delay for visual streaming effect
                await new Promise(resolve => setTimeout(resolve, 15));
              }
            }
          }

          sendEvent({ type: 'done' });
          controller.close();

        } catch (error: any) {
          console.error('❌ Stream error:', error);
          sendEvent({
            type: 'error',
            content: `An error occurred: ${error.message}. Please try again.`
          });
          sendEvent({ type: 'done' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('❌ Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process message',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle non-streaming requests (backward compatibility)
async function handleNonStreamingRequest(body: any, message: string, history: any[], userId?: string) {
  const messages = [
    ...history,
    { role: 'user' as const, content: message }
  ];

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemPrompt,
    tools: tools as any,
    messages
  });

  // Tool use loop
  let loopCount = 0;
  const maxLoops = 10;

  while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
    loopCount++;

    const assistantContent: any[] = [];
    const toolResults: any[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input, body);

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

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as any,
      messages
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

  return new Response(
    JSON.stringify({
      response: finalResponse,
      history: messages
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
