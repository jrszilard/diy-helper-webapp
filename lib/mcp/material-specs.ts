// Material Specs MCP Logic

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  supplier: string;
  in_stock: boolean;
  quantity_available: number | null;
  specifications: Record<string, any>;
  url: string | null;
  image_url: string | null;
  rating: number | null;
  review_count: number;
  store_location: string | null;
  distance_miles: number | null;
  manufacturer: string | null;
}

// Mock products (same as your Python version)
const mockProducts: Product[] = [
  {
    id: "HD-12345",
    name: "Southwire 250 ft. 12/2 Solid Romex SIMpull CU NM-B W/G Wire",
    category: "electrical",
    subcategory: "wire",
    price: 87.43,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 47,
    specifications: {
      gauge: "12 AWG",
      conductors: "2 with ground",
      ampacity_60c: "20A",
      voltage_rating: "600V",
      length: "250 feet",
      insulation: "PVC",
      wire_type: "NM-B (Romex)",
      material: "Copper"
    },
    url: "https://www.homedepot.com/p/12345",
    image_url: null,
    rating: 4.7,
    review_count: 2340,
    store_location: null,
    distance_miles: null,
    manufacturer: "Southwire"
  },
  // Add all your other products here...
];

export class ProductDatabase {
  private products: Product[];

  constructor() {
    this.products = mockProducts;
  }

  async searchProducts(
    query: string,
    category?: string,
    zipCode?: string,
    maxPrice?: number,
    limit: number = 10
  ): Promise<Product[]> {
    const queryLower = query.toLowerCase();
    let results = [...this.products];

    // Filter by category
    if (category) {
      results = results.filter((p) => p.category === category);
    }

    // Filter by price
    if (maxPrice) {
      results = results.filter((p) => p.price <= maxPrice);
    }

    // Filter by query
    results = results.filter((p) => {
      const searchable = `${p.name} ${p.category} ${p.subcategory}`.toLowerCase();
      return queryLower.split(' ').some((word) => searchable.includes(word));
    });

    // Add mock location if zip provided
    if (zipCode) {
      results = results.map((p) => ({
        ...p,
        store_location: "Brighton, MA",
        distance_miles: 2.3
      }));
    }

    // Sort by price
    results.sort((a, b) => a.price - b.price);

    return results.slice(0, limit);
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.find((p) => p.id === productId) || null;
  }
}

// Calculator functions
export class MaterialCalculator {
  calculateWireLength(circuitLengthFeet: number, numCircuits: number = 1) {
    const wasteFactor = 0.15;
    const totalFeet = circuitLengthFeet * 2 * numCircuits;
    const withWaste = totalFeet * (1 + wasteFactor);
    const recommendedFeet = Math.ceil(withWaste / 25) * 25;

    return {
      base_feet: totalFeet,
      with_waste: withWaste,
      recommended_feet: recommendedFeet,
      waste_factor: wasteFactor,
      note: `Buying ${recommendedFeet}ft gives you buffer for mistakes and future repairs`
    };
  }

  calculateOutletsNeeded(roomPerimeterFeet: number, roomType: string) {
    let outlets: number;
    let codeRef: string;
    let note: string;

    if (roomType === "kitchen") {
      const countertopLength = roomPerimeterFeet * 0.5;
      outlets = Math.ceil(countertopLength / 4);
      codeRef = "NEC 210.52(C)(1)";
      note = "Kitchen countertops require outlets every 4 feet maximum";
    } else if (roomType === "bathroom") {
      outlets = Math.max(1, Math.ceil(roomPerimeterFeet / 12));
      codeRef = "NEC 210.52(D)";
      note = "Bathroom requires at least one GFCI outlet, all must be GFCI protected";
    } else {
      outlets = Math.ceil(roomPerimeterFeet / 12);
      codeRef = "NEC 210.52(A)(1)";
      note = "Living spaces require outlets every 12 feet of wall space";
    }

    return {
      outlets_needed: outlets,
      room_type: roomType,
      perimeter_feet: roomPerimeterFeet,
      code_reference: codeRef,
      note
    };
  }

  calculateTileNeeded(
    areaSqFt: number,
    tileSizeInches: [number, number] = [12, 12],
    wasteFactor: number = 0.10
  ) {
    const tileWidthFt = tileSizeInches[0] / 12;
    const tileHeightFt = tileSizeInches[1] / 12;
    const tileAreaSqFt = tileWidthFt * tileHeightFt;

    const baseTiles = Math.ceil(areaSqFt / tileAreaSqFt);
    const totalTiles = Math.ceil(baseTiles * (1 + wasteFactor));

    const tilesPerCase = 10;
    const casesNeeded = Math.ceil(totalTiles / tilesPerCase);
    const totalCoverage = casesNeeded * tilesPerCase * tileAreaSqFt;

    return {
      area_sq_ft: areaSqFt,
      tile_size: `${tileSizeInches[0]}x${tileSizeInches[1]} inches`,
      tiles_needed: totalTiles,
      cases_needed: casesNeeded,
      total_tiles: casesNeeded * tilesPerCase,
      total_coverage_sq_ft: Math.round(totalCoverage * 10) / 10,
      waste_factor: wasteFactor,
      note: `Ordering ${casesNeeded} cases gives you ${totalTiles - baseTiles} extra tiles for cuts and repairs`
    };
  }
}

// Export singleton instances
export const productDb = new ProductDatabase();
export const calculator = new MaterialCalculator();