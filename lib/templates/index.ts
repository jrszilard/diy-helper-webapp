// Project Templates for Quick Start

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  description: string;
  starterPrompt: string;
  icon: string;
  commonMaterials?: string[];
  safetyNotes?: string[];
}

export const projectTemplates: ProjectTemplate[] = [
  // Electrical Projects
  {
    id: 'ceiling-fan-install',
    name: 'Ceiling Fan Installation',
    category: 'electrical',
    difficulty: 'intermediate',
    estimatedTime: '2-4 hours',
    description: 'Replace a light fixture with a ceiling fan, including proper wiring and mounting',
    starterPrompt: 'Help me install a ceiling fan where I currently have a light fixture. I want to make sure I do it safely and to code.',
    icon: '💨',
    commonMaterials: ['Ceiling fan kit', 'Fan-rated electrical box', 'Wire nuts', 'Electrical tape'],
    safetyNotes: ['Always turn off power at the breaker', 'Verify power is off with a voltage tester']
  },
  {
    id: 'outlet-installation',
    name: 'Add a New Outlet',
    category: 'electrical',
    difficulty: 'intermediate',
    estimatedTime: '3-5 hours',
    description: 'Add a new electrical outlet by running wire from an existing outlet or panel',
    starterPrompt: 'I need to add a new electrical outlet in my room. Help me understand the process, what materials I need, and local code requirements.',
    icon: '🔌',
    commonMaterials: ['Electrical box', 'Outlet', 'Romex wire (12/2 or 14/2)', 'Wire staples'],
    safetyNotes: ['Check local codes for outlet spacing', 'Use GFCI in kitchens, bathrooms, garages']
  },
  {
    id: 'dimmer-switch',
    name: 'Install a Dimmer Switch',
    category: 'electrical',
    difficulty: 'beginner',
    estimatedTime: '30-60 minutes',
    description: 'Replace a standard light switch with a dimmer switch for adjustable lighting',
    starterPrompt: 'I want to install a dimmer switch to replace a regular light switch. What type of dimmer do I need and how do I install it safely?',
    icon: '💡',
    commonMaterials: ['Dimmer switch', 'Wire nuts', 'Screwdriver'],
    safetyNotes: ['Ensure dimmer is compatible with your bulb type', 'LED bulbs need LED-compatible dimmers']
  },

  // Plumbing Projects
  {
    id: 'faucet-replacement',
    name: 'Replace a Faucet',
    category: 'plumbing',
    difficulty: 'beginner',
    estimatedTime: '1-2 hours',
    description: 'Remove old faucet and install a new one in kitchen or bathroom',
    starterPrompt: 'I want to replace my kitchen faucet with a new one. What tools do I need and what are the steps?',
    icon: '🚰',
    commonMaterials: ['New faucet', 'Plumber\'s putty', 'Supply lines', 'Teflon tape'],
    safetyNotes: ['Turn off water supply before starting', 'Have towels ready for residual water']
  },
  {
    id: 'toilet-replacement',
    name: 'Replace a Toilet',
    category: 'plumbing',
    difficulty: 'intermediate',
    estimatedTime: '2-3 hours',
    description: 'Remove old toilet and install a new one with proper seal',
    starterPrompt: 'I need to replace my toilet. Help me understand the process and what supplies I need.',
    icon: '🚽',
    commonMaterials: ['New toilet', 'Wax ring', 'Toilet bolts', 'Water supply line'],
    safetyNotes: ['Shut off water and flush to empty tank', 'Have rags ready - some water will remain']
  },
  {
    id: 'garbage-disposal',
    name: 'Install Garbage Disposal',
    category: 'plumbing',
    difficulty: 'intermediate',
    estimatedTime: '2-3 hours',
    description: 'Install a new garbage disposal under your kitchen sink',
    starterPrompt: 'I want to install a garbage disposal in my kitchen sink. What size do I need and how do I install it?',
    icon: '♻️',
    commonMaterials: ['Garbage disposal unit', 'Mounting hardware', 'Discharge tube', 'Plumber\'s putty'],
    safetyNotes: ['Requires dedicated 20-amp circuit', 'Disconnect power before working']
  },

  // Flooring Projects
  {
    id: 'bathroom-tile',
    name: 'Bathroom Tile Floor',
    category: 'flooring',
    difficulty: 'intermediate',
    estimatedTime: '1-2 days',
    description: 'Install new tile flooring in a bathroom including proper underlayment',
    starterPrompt: 'Help me plan a bathroom tile flooring project. I need to know about underlayment, tile options, and installation steps.',
    icon: '🔲',
    commonMaterials: ['Tile', 'Thin-set mortar', 'Cement board', 'Grout', 'Tile spacers'],
    safetyNotes: ['Ensure proper waterproofing', 'Let thin-set cure before grouting']
  },
  {
    id: 'laminate-flooring',
    name: 'Laminate Flooring Installation',
    category: 'flooring',
    difficulty: 'beginner',
    estimatedTime: '1-2 days',
    description: 'Install click-lock laminate flooring in a room',
    starterPrompt: 'I want to install laminate flooring in my living room. How do I prepare the subfloor and install it correctly?',
    icon: '🪵',
    commonMaterials: ['Laminate flooring', 'Underlayment', 'Spacers', 'Transition strips'],
    safetyNotes: ['Acclimate flooring for 48 hours', 'Leave expansion gaps at walls']
  },

  // Outdoor Projects
  {
    id: 'deck-building',
    name: 'Build a Deck',
    category: 'outdoor',
    difficulty: 'advanced',
    estimatedTime: '2-4 days',
    description: 'Build a new outdoor deck including framing, decking, and railings',
    starterPrompt: 'I want to build a 12x16 foot deck in my backyard. Help me understand permits, materials, and the building process.',
    icon: '🏡',
    commonMaterials: ['Pressure-treated lumber', 'Deck boards', 'Joist hangers', 'Concrete footings'],
    safetyNotes: ['Check local building codes', 'Get required permits before starting']
  },
  {
    id: 'fence-installation',
    name: 'Install a Fence',
    category: 'outdoor',
    difficulty: 'intermediate',
    estimatedTime: '2-3 days',
    description: 'Install a new privacy or picket fence in your yard',
    starterPrompt: 'I need to install a privacy fence in my backyard. What are the steps and what permits might I need?',
    icon: '🏘️',
    commonMaterials: ['Fence posts', 'Fence panels', 'Concrete', 'Post caps', 'Hardware'],
    safetyNotes: ['Call 811 to mark utilities before digging', 'Check property lines']
  },

  // Structural Projects
  {
    id: 'drywall-repair',
    name: 'Drywall Repair',
    category: 'structural',
    difficulty: 'beginner',
    estimatedTime: '2-4 hours',
    description: 'Repair holes and damage in drywall',
    starterPrompt: 'I have a large hole in my drywall that needs repair. How do I fix it so it looks seamless?',
    icon: '🧱',
    commonMaterials: ['Drywall patch', 'Joint compound', 'Mesh tape', 'Sandpaper'],
    safetyNotes: ['Wear dust mask when sanding', 'Multiple thin coats are better than one thick coat']
  },

  // Painting Projects
  {
    id: 'room-painting',
    name: 'Paint a Room',
    category: 'painting',
    difficulty: 'beginner',
    estimatedTime: '1-2 days',
    description: 'Properly prep and paint an interior room',
    starterPrompt: 'I want to repaint my bedroom. What prep work do I need and what type of paint should I use?',
    icon: '🎨',
    commonMaterials: ['Paint', 'Primer', 'Rollers and brushes', 'Painter\'s tape', 'Drop cloths'],
    safetyNotes: ['Ensure good ventilation', 'Allow proper dry time between coats']
  },
  {
    id: 'cabinet-painting',
    name: 'Paint Kitchen Cabinets',
    category: 'painting',
    difficulty: 'intermediate',
    estimatedTime: '2-3 days',
    description: 'Transform kitchen cabinets with proper prep and paint',
    starterPrompt: 'I want to paint my kitchen cabinets. What\'s the best way to prep them and what type of paint holds up best?',
    icon: '🪣',
    commonMaterials: ['Cabinet paint', 'Primer', 'Deglosser', 'Fine grit sandpaper', 'Foam rollers'],
    safetyNotes: ['Remove doors and hardware', 'Apply thin, even coats']
  }
];

// Get templates by category
export function getTemplatesByCategory(category: string): ProjectTemplate[] {
  return projectTemplates.filter(t => t.category === category);
}

// Get templates by difficulty
export function getTemplatesByDifficulty(difficulty: ProjectTemplate['difficulty']): ProjectTemplate[] {
  return projectTemplates.filter(t => t.difficulty === difficulty);
}

// Get a specific template by ID
export function getTemplateById(id: string): ProjectTemplate | undefined {
  return projectTemplates.find(t => t.id === id);
}

// Get popular/featured templates
export function getFeaturedTemplates(count: number = 6): ProjectTemplate[] {
  // Return a mix of categories and difficulties
  const featured = [
    'ceiling-fan-install',
    'faucet-replacement',
    'bathroom-tile',
    'dimmer-switch',
    'drywall-repair',
    'room-painting'
  ];
  return featured
    .map(id => getTemplateById(id))
    .filter((t): t is ProjectTemplate => t !== undefined)
    .slice(0, count);
}

// Get all unique categories
export function getCategories(): string[] {
  return [...new Set(projectTemplates.map(t => t.category))];
}
