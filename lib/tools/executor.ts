import { webSearch, webFetch } from '@/lib/search';
import { AuthResult } from '@/lib/auth';
import { ToolName } from './types';
import { isSameItem } from '@/lib/fuzzy-match';
import { lookupMaterialPrices } from '@/lib/product-extractor';

type ToolHandler = (input: Record<string, unknown>, auth: AuthResult) => Promise<string>;

// --- Individual tool handlers ---

async function handleSearchBuildingCodes(input: Record<string, unknown>): Promise<string> {
  const { query } = input as { query: string };
  try {
    const results = await webSearch(`national building code ${query} NEC IRC IBC requirements`);
    return `**Building Code Search Results:**\n\n${results}\n\n**Disclaimer:** Always verify these requirements with your local building department, as local amendments may apply.`;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error searching building codes: ${message}. Please try again.`;
  }
}

async function handleSearchProducts(input: Record<string, unknown>): Promise<string> {
  const { query } = input as { query: string };
  try {
    const results = await webSearch(`${query} price buy specifications`);
    return `**Product Search Results:**\n\n${results}`;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error searching products: ${message}. Please try again.`;
  }
}

// NEC 310.16 ampacity table (copper, 60C/75C column, residential)
const NEC_AMPACITY = [
  { awg: 14, ampacity: 15 },
  { awg: 12, ampacity: 20 },
  { awg: 10, ampacity: 30 },
  { awg: 8, ampacity: 40 },
  { awg: 6, ampacity: 55 },
  { awg: 4, ampacity: 70 },
  { awg: 3, ampacity: 85 },
  { awg: 2, ampacity: 95 },
  { awg: 1, ampacity: 110 },
];

// Resistance per 1000 ft (ohms) for copper wire at 75C
const WIRE_RESISTANCE: Record<number, number> = {
  14: 3.14, 12: 1.98, 10: 1.24, 8: 0.778,
  6: 0.491, 4: 0.308, 3: 0.245, 2: 0.194, 1: 0.154,
};

async function handleCalculateWireSize(input: Record<string, unknown>): Promise<string> {
  const { amperage, distance, voltage: inputVoltage } = input as {
    amperage: number;
    distance: number;
    voltage?: number;
  };
  const voltage = inputVoltage || 120;
  const maxDropPct = 3; // NEC recommends max 3% voltage drop

  // Find minimum AWG by ampacity
  const byAmpacity = NEC_AMPACITY.find(entry => entry.ampacity >= amperage);
  if (!byAmpacity) {
    return `Amperage of ${amperage}A exceeds residential wire table (max 110A for 1 AWG). Consult an electrician for larger service conductors.`;
  }

  let selectedAwg = byAmpacity.awg;

  // Check voltage drop and upsize if needed
  const roundTripFt = distance * 2;
  for (const entry of NEC_AMPACITY) {
    if (entry.awg > selectedAwg) continue; // only consider same or larger wire
    const resistance = WIRE_RESISTANCE[entry.awg];
    if (!resistance) continue;
    const drop = (amperage * resistance * roundTripFt) / 1000;
    const dropPct = (drop / voltage) * 100;
    if (dropPct <= maxDropPct) {
      selectedAwg = entry.awg;
      break;
    }
    // Need to go larger (smaller AWG number)
    selectedAwg = entry.awg;
  }

  // Recalculate actual voltage drop for selected wire
  const finalResistance = WIRE_RESISTANCE[selectedAwg];
  const actualDrop = finalResistance
    ? (amperage * finalResistance * roundTripFt) / 1000
    : 0;
  const actualDropPct = finalResistance ? (actualDrop / voltage) * 100 : 0;

  let result = `**Wire Size Calculation (per NEC 310.16)**\n\n`;
  result += `**Circuit:** ${amperage}A at ${voltage}V, ${distance} ft run\n`;
  result += `**Recommended:** ${selectedAwg} AWG copper wire\n\n`;
  result += `**Details:**\n`;
  result += `- Ampacity rating: ${NEC_AMPACITY.find(e => e.awg === selectedAwg)?.ampacity}A\n`;
  result += `- Voltage drop: ${actualDrop.toFixed(2)}V (${actualDropPct.toFixed(1)}%) over ${distance} ft\n`;
  result += `- NEC max recommended: ${maxDropPct}% (${(voltage * maxDropPct / 100).toFixed(1)}V)\n`;

  if (actualDropPct > maxDropPct) {
    result += `\n**Warning:** Even with ${selectedAwg} AWG, voltage drop exceeds ${maxDropPct}%. Consider a shorter run or consult an electrician.\n`;
  }

  if (byAmpacity.awg !== selectedAwg) {
    result += `\n**Note:** Wire was upsized from ${byAmpacity.awg} AWG to ${selectedAwg} AWG to meet voltage drop requirements at ${distance} ft.\n`;
  }

  result += `\n**Always verify with your local building department and a licensed electrician.**`;
  return result;
}

async function handleSearchLocalCodes(input: Record<string, unknown>): Promise<string> {
  const { query, city, state } = input as { query: string; city: string; state: string };
  try {
    const [officialResults, permitResults] = await Promise.all([
      webSearch(`${city} ${state} building code ${query} site:gov OR site:municode.com OR site:ecode360.com`),
      webSearch(`${city} ${state} permit requirements ${query}`),
    ]);

    let response = `**Local Building Code Results for ${city}, ${state}:**\n\n`;
    response += `### Official / Municipal Sources\n${officialResults}\n\n`;
    response += `### Permit & General Requirements\n${permitResults}\n\n`;
    response += `**Important:** Verify these requirements with the ${city} Building Department before starting work.`;
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error searching local codes for ${city}, ${state}: ${message}. Please try again.`;
  }
}

async function handleSearchProjectVideos(input: Record<string, unknown>): Promise<string> {
  const { project_query, max_results = 5 } = input as { project_query: string; max_results?: number };
  try {
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

    interface BraveVideoResult {
      title?: string;
      description?: string;
      url?: string;
      page_url?: string;
      thumbnail?: { src?: string };
      meta_url?: { duration?: string; hostname?: string };
      creator?: string;
      video?: { views?: string };
      age?: string;
    }

    const formattedResults = videos.map((video: BraveVideoResult) => ({
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Video search error:', error);
    return JSON.stringify({
      success: false,
      error: message,
      message: 'Unable to search for videos at this time. Please try again later.'
    });
  }
}

async function handleDetectOwnedItems(input: Record<string, unknown>, auth: AuthResult): Promise<string> {
  const { items, source_context } = input as {
    items: Array<{ name: string; category: string; quantity?: number; condition?: string }>;
    source_context?: string;
  };

  const userId = auth.userId;

  if (!userId) {
    return "FAILED: User is NOT logged in. The items were NOT added to inventory. NOTHING was saved. You MUST tell the user that their items could not be saved because they are not signed in, and suggest they sign in to save their tools.";
  }

  if (!items || items.length === 0) {
    return "No items detected to add to inventory.";
  }

  const addedItems: string[] = [];
  const existingItems: string[] = [];
  const errors: string[] = [];

  for (const item of items) {
    try {
      const normalizedName = item.name
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const escapedName = normalizedName.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data: existingData } = await auth.supabaseClient
        .from('user_inventory')
        .select('id, item_name')
        .eq('user_id', userId)
        .ilike('item_name', escapedName);

      if (existingData && existingData.length > 0) {
        existingItems.push(item.name);
        continue;
      }

      const { error } = await auth.supabaseClient
        .from('user_inventory')
        .insert({
          user_id: userId,
          item_name: normalizedName,
          category: item.category || 'general',
          quantity: item.quantity || 1,
          condition: item.condition || 'good',
          auto_added: true,
          source_message: source_context || null
        })
        .select();

      if (error) {
        console.error('Error adding inventory item:', error);
        if (error.code === '23505') {
          existingItems.push(item.name);
        } else {
          errors.push(`${item.name} (${error.message})`);
        }
      } else {
        addedItems.push(item.name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Exception adding inventory item:', err);
      errors.push(`${item.name} (${message})`);
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

  response += `\n---INVENTORY_UPDATE---\n`;
  response += JSON.stringify({ added: addedItems, existing: existingItems, errors });
  response += `\n---END_INVENTORY_UPDATE---\n`;

  return response;
}

async function handleCheckUserInventory(input: Record<string, unknown>, auth: AuthResult): Promise<string> {
  const { categories } = input as { categories?: string[] };
  const userId = auth.userId;

  if (!userId) {
    return "User not logged in. Cannot check inventory. Will assume user needs to purchase all items.";
  }

  try {
    let query = auth.supabaseClient
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
      console.error('Error checking inventory:', error);
      return "Error checking inventory: " + error.message;
    }

    if (!data || data.length === 0) {
      return "User's inventory is empty. They will need to purchase all required items.";
    }

    interface InventoryRecord {
      category: string;
      item_name: string;
      quantity: number;
      condition: string;
    }

    const grouped = data.reduce((acc: Record<string, InventoryRecord[]>, item: InventoryRecord) => {
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
      (items as InventoryRecord[]).forEach((item: InventoryRecord) => {
        const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
        const cond = item.condition !== 'good' ? ` [${item.condition}]` : '';
        response += `  - ${item.item_name}${qty}${cond}\n`;
      });
      response += '\n';
    }

    response += `\n---INVENTORY_DATA---\n`;
    response += JSON.stringify(data);
    response += `\n---END_INVENTORY_DATA---\n`;

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception checking inventory:', err);
    return "Error checking inventory: " + message;
  }
}

async function handleExtractMaterialsList(input: Record<string, unknown>, auth: AuthResult): Promise<string> {
  const { project_description, materials } = input as {
    project_description: string;
    materials: Array<{
      name: string;
      quantity: string;
      category: string;
      estimated_price: string;
      required: boolean;
    }>;
  };
  const userId = auth.userId;

  if (!materials || materials.length === 0) {
    return "Error: No materials were provided.";
  }

  interface InventoryItem {
    item_name: string;
    category: string;
    quantity: number;
  }

  let inventoryItems: InventoryItem[] = [];
  if (userId) {
    try {
      const { data, error } = await auth.supabaseClient
        .from('user_inventory')
        .select('item_name, category, quantity')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching inventory:', error);
      } else {
        inventoryItems = (data || []) as InventoryItem[];
      }
    } catch (err) {
      console.error('Error fetching inventory for cross-reference:', err);
    }
  }

  const ALIAS_GROUPS: string[][] = [
    ['drill', 'cordless drill', 'power drill', 'drill driver', 'impact driver'],
    ['saw', 'circular saw', 'miter saw', 'mitre saw', 'table saw', 'reciprocating saw', 'jigsaw'],
    ['sander', 'orbital sander', 'belt sander', 'palm sander', 'random orbit sander'],
    ['hammer', 'claw hammer', 'framing hammer', 'ball peen hammer'],
    ['screwdriver', 'screwdriver set', 'phillips screwdriver', 'flathead screwdriver'],
    ['wrench', 'adjustable wrench', 'pipe wrench', 'socket wrench', 'crescent wrench'],
    ['pliers', 'needle nose pliers', 'channel lock pliers', 'slip joint pliers', 'lineman pliers'],
    ['tape measure', 'measuring tape', 'tape'],
    ['level', 'spirit level', 'laser level', 'torpedo level'],
    ['safety glasses', 'safety goggles', 'protective eyewear', 'eye protection'],
    ['wire strippers', 'wire stripper', 'wire cutter', 'wire cutters'],
    ['stud finder', 'stud sensor', 'wall scanner'],
    ['voltage tester', 'circuit tester', 'non-contact voltage tester', 'multimeter'],
  ];

  const findOwnedItem = (materialName: string): string | null => {
    const normalizedName = materialName.toLowerCase().trim();

    for (const invItem of inventoryItems) {
      const invName = invItem.item_name.toLowerCase().trim();

      if (normalizedName === invName) return invItem.item_name;
      if (normalizedName.includes(invName) || invName.includes(normalizedName)) return invItem.item_name;

      for (const group of ALIAS_GROUPS) {
        const materialInGroup = group.some(alias => normalizedName.includes(alias) || alias.includes(normalizedName));
        const invInGroup = group.some(alias => invName.includes(alias) || alias.includes(invName));
        if (materialInGroup && invInGroup) return invItem.item_name;
      }

      // Fuzzy match as final fallback
      if (isSameItem(normalizedName, invName)) {
        return invItem.item_name;
      }
    }

    return null;
  };

  interface MaterialWithOwned {
    name: string;
    quantity: string;
    category: string;
    estimated_price: string;
    required: boolean;
    ownedAs?: string;
    [key: string]: unknown;
  }

  const needToBuy: MaterialWithOwned[] = [];
  const alreadyOwn: MaterialWithOwned[] = [];

  materials.forEach((mat) => {
    const ownedMatch = findOwnedItem(mat.name);
    if (ownedMatch) {
      alreadyOwn.push({ ...mat, ownedAs: ownedMatch });
    } else {
      needToBuy.push(mat);
    }
  });

  // Live price lookup — budget ~8s max (leaves time for inventory fetch + response)
  if (needToBuy.length > 0) {
    await lookupMaterialPrices(needToBuy, {
      limit: 8, concurrency: 4, perCallTimeoutMs: 2500, totalTimeoutMs: 8000,
    });
  }

  let response = `**Materials List for ${project_description}**\n\n`;

  if (alreadyOwn.length > 0) {
    response += `### ✅ Items You Already Have (${alreadyOwn.length})\n`;
    response += `*Based on your inventory - no need to purchase:*\n\n`;
    alreadyOwn.forEach((item) => {
      const matchNote = item.ownedAs!.toLowerCase() !== item.name.toLowerCase()
        ? ` *(matches: ${item.ownedAs})*`
        : '';
      response += `- ~~${item.name}~~ ${matchNote}\n`;
    });
    response += `\n`;
  }

  if (needToBuy.length > 0) {
    response += `### 🛒 Items to Purchase (${needToBuy.length})\n\n`;

    const categories = needToBuy.reduce((acc: Record<string, MaterialWithOwned[]>, mat) => {
      const cat = mat.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mat);
      return acc;
    }, {});

    for (const [category, items] of Object.entries(categories)) {
      response += `**${category.toUpperCase()}:**\n`;
      items.forEach((item) => {
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

  response += `\n---MATERIALS_DATA---\n`;
  response += JSON.stringify({
    project_description,
    materials: needToBuy,
    owned_items: alreadyOwn,
    total_estimate: totalEstimate
  });
  response += `\n---END_MATERIALS_DATA---\n`;

  return response;
}

async function handleSearchLocalStores(input: Record<string, unknown>): Promise<string> {
  const { material_name, city, state } = input as { material_name: string; city: string; state: string };
  try {
    const stores = ['Home Depot', "Lowe's", 'Ace Hardware'];
    const storeSearches = stores.map(store =>
      webSearch(`${store} ${material_name} ${city} ${state} price availability`)
    );
    const locationSearch = webSearch(`hardware stores near ${city} ${state} hours`);

    const [storeResults, locationResults] = await Promise.all([
      Promise.allSettled(storeSearches),
      locationSearch,
    ]);

    let response = `**Store Search Results for "${material_name}" near ${city}, ${state}:**\n\n`;

    stores.forEach((store, i) => {
      const result = storeResults[i];
      if (result.status === 'fulfilled') {
        response += `### ${store}\n${result.value}\n\n`;
      } else {
        response += `### ${store}\nSearch unavailable. Visit the store website directly.\n\n`;
      }
    });

    response += `### Nearby Store Locations\n${locationResults}\n`;
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error searching stores: ${message}. Please try again.`;
  }
}

async function handleCompareStorePrices(input: Record<string, unknown>): Promise<string> {
  const { material_name, stores: requestedStores, location } = input as {
    material_name: string;
    stores?: string[];
    location: string;
  };
  try {
    const storeList = requestedStores && requestedStores.length > 0
      ? requestedStores
      : ['Home Depot', "Lowe's", 'Ace Hardware'];

    const searches = storeList.map((store: string) =>
      webSearch(`${store} ${material_name} price ${location}`)
    );

    const results = await Promise.allSettled(searches);

    let response = `**Price Comparison for "${material_name}" near ${location}:**\n\n`;

    storeList.forEach((store: string, i: number) => {
      const result = results[i];
      if (result.status === 'fulfilled') {
        response += `### ${store}\n${result.value}\n\n`;
      } else {
        response += `### ${store}\nPrice search unavailable.\n\n`;
      }
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error comparing prices: ${message}. Please try again.`;
  }
}

async function handleWebSearch(input: Record<string, unknown>): Promise<string> {
  return await webSearch(input.query as string);
}

async function handleWebFetch(input: Record<string, unknown>): Promise<string> {
  return await webFetch(input.url as string);
}

// --- Dispatch map ---

const toolHandlers: Record<ToolName, ToolHandler> = {
  search_building_codes: (input) => handleSearchBuildingCodes(input),
  search_products: (input) => handleSearchProducts(input),
  calculate_wire_size: (input) => handleCalculateWireSize(input),
  search_local_codes: (input) => handleSearchLocalCodes(input),
  search_project_videos: (input) => handleSearchProjectVideos(input),
  detect_owned_items: (input, auth) => handleDetectOwnedItems(input, auth),
  check_user_inventory: (input, auth) => handleCheckUserInventory(input, auth),
  extract_materials_list: (input, auth) => handleExtractMaterialsList(input, auth),
  search_local_stores: (input) => handleSearchLocalStores(input),
  compare_store_prices: (input) => handleCompareStorePrices(input),
  web_search: (input) => handleWebSearch(input),
  web_fetch: (input) => handleWebFetch(input),
};

// --- Per-tool timeout overrides ---

const TOOL_TIMEOUTS: Partial<Record<ToolName, number>> = {
  extract_materials_list: 25_000, // extra time for live price lookups
};

// --- Timeout wrapper ---

const TOOL_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// --- Main executor ---

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  auth: AuthResult
): Promise<string> {
  const handler = toolHandlers[toolName as ToolName];
  if (!handler) return 'Tool not implemented yet.';

  try {
    const timeout = TOOL_TIMEOUTS[toolName as ToolName] ?? TOOL_TIMEOUT_MS;
    return await withTimeout(handler(toolInput, auth), timeout, toolName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Tool execution error (${toolName}):`, err);
    return `Error executing ${toolName}: ${message}`;
  }
}
