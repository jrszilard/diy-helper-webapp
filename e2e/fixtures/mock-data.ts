import type { StreamEvent } from '../../lib/tools/types';

// Basic chat response: progress → text chunks → done
export const SIMPLE_CHAT_EVENTS: StreamEvent[] = [
  {
    type: 'progress',
    step: 'thinking',
    message: 'Analyzing your question...',
    icon: '🤔',
  },
  { type: 'text', content: 'To install a ceiling fan, ' },
  { type: 'text', content: 'you will need to follow these steps:\n\n' },
  { type: 'text', content: '1. **Turn off the power** at the circuit breaker\n' },
  { type: 'text', content: '2. Remove the existing fixture\n' },
  { type: 'text', content: '3. Install the mounting bracket\n' },
  { type: 'text', content: '4. Wire the fan according to the manufacturer instructions\n' },
  { type: 'text', content: '5. Attach the fan blades and light kit' },
  { type: 'done', conversationId: 'test-conv-001' },
];

// Response with materials data that triggers SaveMaterialsDialog
export const MATERIALS_CHAT_EVENTS: StreamEvent[] = [
  {
    type: 'progress',
    step: 'analyzing',
    message: 'Analyzing project requirements...',
    icon: '📋',
  },
  {
    type: 'text',
    content: "Here's what you'll need for your deck project:\n\n",
  },
  {
    type: 'text',
    content:
      '---MATERIALS_DATA---\n' +
      JSON.stringify({
        project_description: 'Build a 12x12 Deck',
        materials: [
          {
            name: '2x6 Pressure Treated Lumber (12ft)',
            quantity: '20',
            category: 'lumber',
            estimated_price: '12.98',
            required: true,
          },
          {
            name: '4x4 Post (8ft)',
            quantity: '6',
            category: 'lumber',
            estimated_price: '15.48',
            required: true,
          },
          {
            name: 'Deck Screws (5lb box)',
            quantity: '3',
            category: 'fasteners',
            estimated_price: '24.97',
            required: true,
          },
        ],
        total_estimate: 427.39,
      }) +
      '\n---END_MATERIALS_DATA---\n\n',
  },
  {
    type: 'text',
    content: 'Would you like me to find local prices for these materials?',
  },
  { type: 'done', conversationId: 'test-conv-002' },
];

// Response with multiple progress steps (tool use simulation)
export const TOOL_USE_CHAT_EVENTS: StreamEvent[] = [
  {
    type: 'progress',
    step: 'searching_codes',
    message: 'Searching building codes...',
    icon: '📚',
  },
  {
    type: 'progress',
    step: 'searching_videos',
    message: 'Finding tutorial videos...',
    icon: '🎥',
  },
  {
    type: 'text',
    content:
      'Based on the **NEC 210.19**, for a 20-amp circuit at 35 feet, you need **12-gauge wire**.\n\n',
  },
  {
    type: 'text',
    content:
      'Here are the key code requirements:\n- Use 12/2 NM-B (Romex) for interior residential\n- GFCI protection required in kitchens\n- Maximum 13 outlets on a 20-amp circuit',
  },
  { type: 'done' },
];

// Error event sequence
export const ERROR_CHAT_EVENTS: StreamEvent[] = [
  {
    type: 'progress',
    step: 'thinking',
    message: 'Processing your request...',
    icon: '🤔',
  },
  {
    type: 'error',
    content: 'An error occurred while processing your request. Please try again.',
  },
  { type: 'done' },
];

// Mock /api/search-stores response
export const STORE_SEARCH_RESPONSE = {
  results: [
    {
      store: 'Home Depot - Portsmouth',
      retailer: 'Home Depot',
      price: 12.98,
      availability: 'in-stock' as const,
      distance: '3.2 mi',
      address: '100 Durgin Ln, Portsmouth, NH 03801',
      phone: '(603) 431-3200',
      link: 'https://www.homedepot.com/p/test-product',
      confidence: 'high' as const,
      sku: 'HD-12345',
    },
    {
      store: "Lowe's - Newington",
      retailer: "Lowe's",
      price: 13.47,
      availability: 'in-stock' as const,
      distance: '4.1 mi',
      address: '50 Gosling Rd, Newington, NH 03801',
      phone: '(603) 431-4100',
      link: 'https://www.lowes.com/pd/test-product',
      confidence: 'medium' as const,
    },
  ],
  stores_searched: 2,
  query: '2x6 Pressure Treated Lumber',
  location: 'Portsmouth, NH',
  metadata: {
    totalSearched: 2,
    successfulSearches: 2,
    highQualityResults: 1,
    mediumQualityResults: 1,
    fallbackResults: 0,
    timestamp: new Date().toISOString(),
  },
  priceRange: {
    min: 12.98,
    max: 13.47,
    avg: 13.23,
    sources: 2,
  },
};

// Mock /api/extract-materials response
export const EXTRACT_MATERIALS_RESPONSE = {
  project_description: 'Bathroom Tile Project',
  materials: [
    {
      name: 'Ceramic Floor Tile (1 sq ft)',
      quantity: '50',
      category: 'tile',
      estimated_price: '2.49',
      required: true,
    },
    {
      name: 'Thin-set Mortar (50lb bag)',
      quantity: '2',
      category: 'adhesive',
      estimated_price: '18.97',
      required: true,
    },
    {
      name: 'Tile Spacers (1/4 inch, 200pk)',
      quantity: '1',
      category: 'tools',
      estimated_price: '4.98',
      required: true,
    },
  ],
  total_estimate: 167.42,
};
