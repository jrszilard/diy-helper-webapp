// MCP Tool Definitions for Anthropic API

export const mcpTools = [
  {
    name: "search_building_codes",
    description: "Search building codes by query and jurisdiction. Returns relevant code sections with citations.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'kitchen outlet spacing')"
        },
        jurisdiction: {
          type: "string",
          description: "Jurisdiction (default: National)",
          default: "National"
        },
        code_type: {
          type: "string",
          enum: ["electrical", "plumbing", "structural", "mechanical", "general"],
          description: "Type of code"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_materials",
    description: "Search for building materials and get current pricing",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Product search query"
        },
        category: {
          type: "string",
          enum: ["electrical", "plumbing", "lumber", "flooring", "hardware"]
        },
        zip_code: {
          type: "string",
          description: "ZIP code for local availability"
        },
        max_price: {
          type: "number",
          description: "Maximum price filter"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_wire_needed",
    description: "Calculate electrical wire quantity needed",
    input_schema: {
      type: "object",
      properties: {
        circuit_length_feet: {
          type: "number",
          description: "Circuit length in feet"
        },
        num_circuits: {
          type: "integer",
          default: 1
        }
      },
      required: ["circuit_length_feet"]
    }
  },
  {
    name: "calculate_outlets_needed",
    description: "Calculate number of outlets needed per NEC code",
    input_schema: {
      type: "object",
      properties: {
        room_perimeter_feet: {
          type: "number",
          description: "Room perimeter in feet"
        },
        room_type: {
          type: "string",
          enum: ["living", "kitchen", "bathroom", "garage"]
        }
      },
      required: ["room_perimeter_feet", "room_type"]
    }
  },
  {
    name: "calculate_tile_needed",
    description: "Calculate tile quantity needed",
    input_schema: {
      type: "object",
      properties: {
        area_sq_ft: {
          type: "number",
          description: "Area in square feet"
        },
        tile_width_inches: {
          type: "number",
          default: 12
        },
        tile_height_inches: {
          type: "number",
          default: 12
        }
      },
      required: ["area_sq_ft"]
    }
  }
];