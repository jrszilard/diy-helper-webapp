import { ToolName } from './types';

export const progressMessages: Record<ToolName, { message: string; icon: string }> = {
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
  web_fetch: { message: 'Fetching page content...', icon: '📄' },
};

export const tools = [
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
              estimated_price: { type: "string", description: "Per-unit price at current big-box retailer prices (Home Depot/Lowe's). Use standard grade, not premium. E.g., 2x4x8='4', GFCI outlet='17', Romex 12/2 250ft='85'" },
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
