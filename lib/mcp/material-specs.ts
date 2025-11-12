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
  {
    id: "HD-12347",
    name: "Southwire 250 ft. 14/2 Solid Romex SIMpull CU NM-B W/G Wire",
    category: "electrical",
    subcategory: "wire",
    price: 67.98,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 52,
    specifications: {
      gauge: "14 AWG",
      conductors: "2 with ground",
      ampacity_60c: "15A",
      voltage_rating: "600V",
      length: "250 feet",
      insulation: "PVC",
      wire_type: "NM-B (Romex)",
      material: "Copper"
    },
    url: "https://www.homedepot.com/p/12347",
    image_url: null,
    rating: 4.6,
    review_count: 1890,
    store_location: null,
    distance_miles: null,
    manufacturer: "Southwire"
  },
  {
    id: "HD-20003",
    name: "Leviton 20 Amp Industrial Grade Heavy Duty Single-Pole Toggle Switch, White",
    category: "electrical",
    subcategory: "switches",
    price: 3.47,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 423,
    specifications: {
      amperage: "20A",
      voltage: "120/277V",
      type: "Single-pole toggle",
      color: "White",
      wire_gauge: "12-14 AWG",
      features: ["Industrial grade", "Side wired"]
    },
    url: "https://www.homedepot.com/p/20003",
    image_url: null,
    rating: 4.7,
    review_count: 3201,
    store_location: null,
    distance_miles: null,
    manufacturer: "Leviton"
  },
  {
    id: "HD-30002",
    name: "Square D Homeline 15 Amp Single-Pole Circuit Breaker",
    category: "electrical",
    subcategory: "circuit_breakers",
    price: 4.97,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 189,
    specifications: {
      amperage: "15A",
      poles: "Single",
      type: "Standard",
      compatible_panels: ["Homeline"],
      ul_listed: true,
      trip_type: "Thermal-magnetic"
    },
    url: "https://www.homedepot.com/p/30002",
    image_url: null,
    rating: 4.8,
    review_count: 892,
    store_location: null,
    distance_miles: null,
    manufacturer: "Square D"
  },
  {
    id: "HD-40003",
    name: "Apollo 1/2 in. Brass PEX Barb x 1/2 in. MIP Adapter",
    category: "plumbing",
    subcategory: "fittings",
    price: 2.98,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 312,
    specifications: {
      size: "1/2 inch",
      material: "Brass",
      connection_type: "PEX barb x male threaded",
      compatible_with: ["PEX-A", "PEX-B", "PEX-C"],
      max_pressure: "200 PSI",
      lead_free: true
    },
    url: "https://www.homedepot.com/p/40003",
    image_url: null,
    rating: 4.5,
    review_count: 567,
    store_location: null,
    distance_miles: null,
    manufacturer: "Apollo"
  },
  {
    id: "HD-50003",
    name: "2 in. x 4 in. x 10 ft. #2 and Better Prime Lumber",
    category: "lumber",
    subcategory: "dimensional_lumber",
    price: 6.98,
    currency: "USD",
    supplier: "Home Depot",
    in_stock: true,
    quantity_available: 278,
    specifications: {
      dimensions: "2x4x10",
      actual_dimensions: "1.5 x 3.5 x 120 inches",
      grade: "#2 and Better",
      species: "Spruce-Pine-Fir",
      treatment: "Kiln-dried",
      use: "Interior framing"
    },
    url: "https://www.homedepot.com/p/50003",
    image_url: null,
    rating: 4.2,
    review_count: 892,
    store_location: null,
    distance_miles: null,
    manufacturer: "Various"
  },
  // === MORE ELECTRICAL PRODUCTS ===
{
  id: "HD-12348",
  name: "Southwire 100 ft. 10/3 Solid Romex SIMpull CU NM-B W/G Wire",
  category: "electrical",
  subcategory: "wire",
  price: 89.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 31,
  specifications: {
    gauge: "10 AWG",
    conductors: "3 with ground",
    ampacity_60c: "30A",
    voltage_rating: "600V",
    length: "100 feet",
    insulation: "PVC",
    wire_type: "NM-B (Romex)",
    material: "Copper",
    use: "240V circuits (dryer, range)"
  },
  url: "https://www.homedepot.com/p/12348",
  image_url: null,
  rating: 4.7,
  review_count: 456,
  store_location: null,
  distance_miles: null,
  manufacturer: "Southwire"
},
{
  id: "HD-20004",
  name: "Leviton 15 Amp Commercial Grade Single-Pole Toggle Switch, White",
  category: "electrical",
  subcategory: "switches",
  price: 2.98,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 567,
  specifications: {
    amperage: "15A",
    voltage: "120/277V",
    type: "Single-pole toggle",
    color: "White",
    wire_gauge: "14 AWG",
    features: ["Commercial grade", "Side wired", "Grounding screw"]
  },
  url: "https://www.homedepot.com/p/20004",
  image_url: null,
  rating: 4.6,
  review_count: 2134,
  store_location: null,
  distance_miles: null,
  manufacturer: "Leviton"
},
{
  id: "HD-20005",
  name: "Lutron Diva 150-Watt LED/CFL Dimmer Switch, White",
  category: "electrical",
  subcategory: "switches",
  price: 16.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 89,
  specifications: {
    wattage: "150W LED/CFL",
    voltage: "120V",
    type: "Dimmer",
    color: "White",
    features: ["LED compatible", "CFL compatible", "Slide dimmer", "On/off toggle"]
  },
  url: "https://www.homedepot.com/p/20005",
  image_url: null,
  rating: 4.8,
  review_count: 3421,
  store_location: null,
  distance_miles: null,
  manufacturer: "Lutron"
},
{
  id: "HD-20006",
  name: "Legrand 15 Amp Duplex Receptacle with USB-A/USB-C, White",
  category: "electrical",
  subcategory: "outlets",
  price: 24.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 134,
  specifications: {
    amperage: "15A",
    voltage: "125V",
    type: "Duplex with USB",
    color: "White",
    usb_ports: "1 USB-A, 1 USB-C",
    usb_output: "Total 4.2A",
    features: ["Tamper-resistant", "Smart chip technology"]
  },
  url: "https://www.homedepot.com/p/20006",
  image_url: null,
  rating: 4.7,
  review_count: 892,
  store_location: null,
  distance_miles: null,
  manufacturer: "Legrand"
},
{
  id: "HD-30003",
  name: "Square D Homeline 20 Amp Dual Function CAFCI/GFCI Circuit Breaker",
  category: "electrical",
  subcategory: "circuit_breakers",
  price: 54.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 45,
  specifications: {
    amperage: "20A",
    poles: "Single",
    type: "CAFCI/GFCI Dual Function",
    compatible_panels: ["Homeline"],
    ul_listed: true,
    features: ["Arc-fault protection", "Ground-fault protection", "Self-test"]
  },
  url: "https://www.homedepot.com/p/30003",
  image_url: null,
  rating: 4.6,
  review_count: 234,
  store_location: null,
  distance_miles: null,
  manufacturer: "Square D"
},
{
  id: "HD-30004",
  name: "GE PowerMark Gold 100 Amp 20-Space 40-Circuit Indoor Main Breaker Load Center",
  category: "electrical",
  subcategory: "panels",
  price: 127.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 23,
  specifications: {
    amperage: "100A",
    spaces: "20",
    circuits: "40",
    type: "Main breaker",
    installation: "Indoor",
    bus_rating: "10,000 AIC",
    features: ["Cover included", "Copper bus bars"]
  },
  url: "https://www.homedepot.com/p/30004",
  image_url: null,
  rating: 4.5,
  review_count: 678,
  store_location: null,
  distance_miles: null,
  manufacturer: "GE"
},
{
  id: "HD-35001",
  name: "Carlon 4 in. Square PVC Electrical Box, 2-1/8 in. Deep",
  category: "electrical",
  subcategory: "boxes",
  price: 1.98,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 892,
  specifications: {
    size: "4 inches square",
    depth: "2-1/8 inches",
    material: "PVC",
    volume: "30.3 cubic inches",
    knockouts: "8 (1/2 inch, 3/4 inch)",
    features: ["Non-metallic", "Nails included"]
  },
  url: "https://www.homedepot.com/p/35001",
  image_url: null,
  rating: 4.4,
  review_count: 1234,
  store_location: null,
  distance_miles: null,
  manufacturer: "Carlon"
},
{
  id: "HD-35002",
  name: "Ideal 30-300 In-Sure Push-In Wire Connector, Orange (25-Pack)",
  category: "electrical",
  subcategory: "connectors",
  price: 8.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 234,
  specifications: {
    wire_range: "12-10 AWG",
    ports: "3",
    type: "Push-in",
    color: "Orange",
    quantity: "25 per pack",
    rating: "600V",
    features: ["No twisting required", "Clear body", "Lever release"]
  },
  url: "https://www.homedepot.com/p/35002",
  image_url: null,
  rating: 4.8,
  review_count: 2341,
  store_location: null,
  distance_miles: null,
  manufacturer: "Ideal"
},

// === MORE PLUMBING PRODUCTS ===
{
  id: "HD-40004",
  name: "Apollo 100 ft. Coil Blue 1/2 in. PEX-A Expansion Pipe",
  category: "plumbing",
  subcategory: "pipe",
  price: 67.98,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 38,
  specifications: {
    size: "1/2 inch",
    material: "PEX-A",
    color: "Blue (cold water)",
    length: "100 feet",
    max_pressure: "160 PSI at 73°F",
    temp_rating: "200°F",
    certifications: ["NSF-61", "NSF-14"]
  },
  url: "https://www.homedepot.com/p/40004",
  image_url: null,
  rating: 4.8,
  review_count: 723,
  store_location: null,
  distance_miles: null,
  manufacturer: "Apollo"
},
{
  id: "HD-40005",
  name: "SharkBite 1/2 in. Brass Push-to-Connect 90-Degree Elbow",
  category: "plumbing",
  subcategory: "fittings",
  price: 9.97,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 178,
  specifications: {
    size: "1/2 inch",
    material: "Brass",
    connection_type: "Push-to-connect",
    angle: "90 degrees",
    compatible_with: ["PEX", "Copper", "CPVC"],
    max_pressure: "200 PSI",
    temp_rating: "200°F"
  },
  url: "https://www.homedepot.com/p/40005",
  image_url: null,
  rating: 4.7,
  review_count: 1892,
  store_location: null,
  distance_miles: null,
  manufacturer: "SharkBite"
},
{
  id: "HD-40006",
  name: "BrassCraft 1/2 in. FIP x 3/8 in. Compression Quarter-Turn Angle Stop Valve",
  category: "plumbing",
  subcategory: "valves",
  price: 7.98,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 267,
  specifications: {
    inlet: "1/2 inch FIP",
    outlet: "3/8 inch compression",
    material: "Brass",
    type: "Quarter-turn angle stop",
    use: "Toilet, faucet supply",
    features: ["Multi-turn handle", "Chrome plated"]
  },
  url: "https://www.homedepot.com/p/40006",
  image_url: null,
  rating: 4.5,
  review_count: 1456,
  store_location: null,
  distance_miles: null,
  manufacturer: "BrassCraft"
},
{
  id: "HD-40007",
  name: "Everbilt 1-1/2 in. Plastic P-Trap",
  category: "plumbing",
  subcategory: "drainage",
  price: 5.98,
  currency: "USD",
  supplier: "Home Depot",
  in_stock: true,
  quantity_available: 342,
  specifications: {
    size: "1-1/2 inch",
    material: "PVC",
    type: "P-trap",
    color: "White",
    features: ["Slip joint connections", "Adjustable", "17-gauge wall thickness"]
  },
  url: "https://www.homedepot.com/p/40007",
  image_url: null,
  rating: 4.4,
  review_count: 892,
  store_location: null,
  distance_miles: null,
  manufacturer: "Everbilt"
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
