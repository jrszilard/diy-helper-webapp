// Execute MCP tools
import { buildingCodesDb } from './building-codes';
import { productDb, calculator } from './material-specs';

export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  try {
    switch (toolName) {
      case "search_building_codes": {
        const results = await buildingCodesDb.search(
          toolInput.query,
          toolInput.jurisdiction || "National",
          toolInput.code_type,
          3
        );

        if (!results.length) {
          return "No relevant codes found.";
        }

        let output = "**Building Codes Found:**\n\n";
        results.forEach((result, i) => {
          output += `${i + 1}. **${result.title}** (${result.code_ref})\n`;
          output += `   - ${result.summary}\n`;
          output += `   - Source: ${result.source}\n\n`;
        });

        return output;
      }

      case "search_materials": {
        const products = await productDb.searchProducts(
          toolInput.query,
          toolInput.category,
          toolInput.zip_code,
          toolInput.max_price,
          5
        );

        if (!products.length) {
          return "No products found.";
        }

        let output = `**Found ${products.length} Products:**\n\n`;
        products.forEach((product, i) => {
          output += `${i + 1}. **${product.name}**\n`;
          output += `   - Price: $${product.price.toFixed(2)}\n`;
          output += `   - Supplier: ${product.supplier}\n`;
          output += `   - In Stock: ${product.in_stock ? 'Yes' : 'No'}\n`;
          if (product.rating) {
            output += `   - Rating: ${product.rating}/5.0\n`;
          }
          output += "\n";
        });

        return output;
      }

      case "calculate_wire_needed": {
        const result = calculator.calculateWireLength(
          toolInput.circuit_length_feet,
          toolInput.num_circuits || 1
        );

        let output = "**Wire Calculation:**\n\n";
        output += `- Base feet needed: ${result.base_feet} ft\n`;
        output += `- With 15% waste: ${result.with_waste.toFixed(1)} ft\n`;
        output += `- Recommended to buy: ${result.recommended_feet} ft\n`;
        output += `\n💡 ${result.note}\n`;

        return output;
      }

      case "calculate_outlets_needed": {
        const result = calculator.calculateOutletsNeeded(
          toolInput.room_perimeter_feet,
          toolInput.room_type
        );

        let output = "**Outlet Calculation:**\n\n";
        output += `- Outlets needed: ${result.outlets_needed}\n`;
        output += `- Room type: ${result.room_type}\n`;
        output += `- Code reference: ${result.code_reference}\n`;
        output += `\n💡 ${result.note}\n`;

        return output;
      }

      case "calculate_tile_needed": {
        const result = calculator.calculateTileNeeded(
          toolInput.area_sq_ft,
          [toolInput.tile_width_inches || 12, toolInput.tile_height_inches || 12]
        );

        let output = "**Tile Calculation:**\n\n";
        output += `- Area to cover: ${result.area_sq_ft} sq ft\n`;
        output += `- Tile size: ${result.tile_size}\n`;
        output += `- Tiles needed: ${result.tiles_needed}\n`;
        output += `- Cases to buy: ${result.cases_needed}\n`;
        output += `- Total coverage: ${result.total_coverage_sq_ft} sq ft\n`;
        output += `\n💡 ${result.note}\n`;

        return output;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    return `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}