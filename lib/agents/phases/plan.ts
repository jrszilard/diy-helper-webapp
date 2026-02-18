// Plan phase — single Claude call merging research + design into one pass.

import { runPhase, type PhaseToolDef } from '../runner';
import { PLAN_SYSTEM_PROMPT } from '../prompts';
import { formatInventoryForPrompt } from '../inventory-prefetch';
import type {
  AgentContext, AgentStreamEvent, PlanOutput, InventoryData,
  ProjectStep, DesignMaterial, DesignTool, DesignVideo, OwnedItem,
  ToolCallLog, TokenUsage,
} from '../types';
import { AuthResult } from '@/lib/auth';

const PLAN_TOOLS: PhaseToolDef[] = [
  {
    name: 'search_building_codes',
    description: 'Search national building codes (NEC, IRC, IBC) for a specific topic.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for national building codes' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_local_codes',
    description: 'Search local building codes for a specific city and state.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The specific code question' },
        city: { type: 'string', description: 'City name' },
        state: { type: 'string', description: 'State name or abbreviation' },
      },
      required: ['query', 'city', 'state'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for best practices, common pitfalls, and safety information.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_project_videos',
    description: 'Search for DIY tutorial videos related to the project.',
    input_schema: {
      type: 'object',
      properties: {
        project_query: { type: 'string', description: 'The DIY project to search videos for' },
        max_results: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['project_query'],
    },
  },
  {
    name: 'calculate_wire_size',
    description: 'Calculate required wire gauge for electrical circuits.',
    input_schema: {
      type: 'object',
      properties: {
        amperage: { type: 'number' },
        distance: { type: 'number' },
        voltage: { type: 'number' },
      },
      required: ['amperage', 'distance'],
    },
  },
  {
    name: 'submit_plan_results',
    description: 'Submit the complete project plan (research + design) as structured data.',
    input_schema: {
      type: 'object',
      properties: {
        // Research fields
        buildingCodes: { type: 'string', description: 'National building code findings' },
        localCodes: { type: 'string', description: 'Local building code findings' },
        permitRequirements: { type: 'string', description: 'Permit requirements summary' },
        bestPractices: { type: 'string', description: 'Professional best practices' },
        commonPitfalls: { type: 'string', description: 'Common DIYer mistakes' },
        safetyWarnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Safety warnings and cautions',
        },
        proRequired: { type: 'boolean', description: 'Whether licensed professional work is required' },
        proRequiredReason: { type: 'string', description: 'Why professional is required' },

        // Design fields
        approach: { type: 'string', description: 'Recommended approach with rationale' },
        steps: {
          type: 'array',
          description: 'Ordered step-by-step plan',
          items: {
            type: 'object',
            properties: {
              order: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              estimatedTime: { type: 'string' },
              skillLevel: { type: 'string' },
              safetyNotes: { type: 'array', items: { type: 'string' } },
              inspectionRequired: { type: 'boolean' },
            },
            required: ['order', 'title', 'description', 'estimatedTime', 'skillLevel'],
          },
        },
        materials: {
          type: 'array',
          description: 'Complete materials list with per-unit prices',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              category: { type: 'string' },
              estimatedPrice: { type: 'number', description: 'Per-unit price in dollars' },
              required: { type: 'boolean' },
              notes: { type: 'string' },
            },
            required: ['name', 'quantity', 'category', 'estimatedPrice', 'required'],
          },
        },
        tools: {
          type: 'array',
          description: 'Required and recommended tools',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string' },
              required: { type: 'boolean' },
              estimatedPrice: { type: 'number' },
              notes: { type: 'string' },
            },
            required: ['name', 'category', 'required'],
          },
        },
        estimatedDuration: { type: 'string', description: 'Total duration (e.g., "2-3 weekends")' },
        skillLevel: { type: 'string', description: 'Overall skill level required' },
        videos: {
          type: 'array',
          description: 'Recommended tutorial videos',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              channel: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['title', 'url', 'channel', 'description'],
          },
        },
        alternativeApproaches: { type: 'string' },
      },
      required: [
        'buildingCodes', 'localCodes', 'permitRequirements', 'bestPractices',
        'commonPitfalls', 'safetyWarnings', 'proRequired',
        'approach', 'steps', 'materials', 'tools', 'estimatedDuration', 'skillLevel', 'videos',
      ],
    },
  },
];

export async function runPlanPhase(
  context: AgentContext,
  auth: AuthResult,
  sendEvent: (event: AgentStreamEvent) => void,
  inventoryData: InventoryData | null,
  checkCancelled?: () => boolean,
): Promise<{ output: PlanOutput; toolCalls: ToolCallLog[]; durationMs: number; tokenUsage: TokenUsage }> {
  const inventorySection = formatInventoryForPrompt(inventoryData);

  const userPrompt = `Plan the following DIY project end-to-end: research codes, then design a complete plan.

**Project:** ${context.projectDescription}
**Location:** ${context.location.city}, ${context.location.state}${context.location.zipCode ? ` (${context.location.zipCode})` : ''}
**Experience Level:** ${context.preferences.experienceLevel}
**Budget Preference:** ${context.preferences.budgetLevel}
${context.preferences.timeframe ? `**Timeframe:** ${context.preferences.timeframe}` : ''}

## User's Inventory
${inventorySection}

---

**Step 1:** Search building codes, local codes, and web for best practices — call ALL search tools in a SINGLE response for parallel execution (3-4 calls max).
**Step 2:** Once search results return, IMMEDIATELY call submit_plan_results with the full structured plan. Do NOT make additional search calls. Use your knowledge + search results to fill in steps, materials, tools, and videos. Be concise in text fields.

IMPORTANT: You have exactly 2 turns — one for searches, one for submit_plan_results. Do not do additional research.`;

  const result = await runPhase({
    phase: 'plan',
    systemPrompt: PLAN_SYSTEM_PROMPT,
    userPrompt,
    tools: PLAN_TOOLS,
    outputToolName: 'submit_plan_results',
    auth,
    runId: context.projectId || 'unknown',
    sendEvent,
    overallProgressBase: 0,
    overallProgressRange: 85,
    maxToolLoops: 3,
    timeoutMs: 90_000,
    maxTokens: 8192,
    checkCancelled,
  });

  const raw = result.output;

  // Match owned items from inventory
  const ownedItems = matchOwnedItems(
    raw.materials as Record<string, unknown>[] | undefined,
    raw.tools as Record<string, unknown>[] | undefined,
    inventoryData,
  );

  // Calculate totals
  const materials = parseMaterials(raw.materials as Record<string, unknown>[] | undefined);
  const tools = parseTools(raw.tools as Record<string, unknown>[] | undefined);
  const materialsTotal = materials.reduce((sum, m) => sum + m.estimatedPrice * parseQuantity(m.quantity), 0);
  const toolsTotal = tools
    .filter(t => t.required && t.estimatedPrice)
    .reduce((sum, t) => sum + (t.estimatedPrice || 0), 0);
  const totalEstimate = materialsTotal + toolsTotal;

  // Savings from owned items
  const savingsFromInventory = ownedItems.reduce((sum, o) => {
    const mat = materials.find(m => m.name.toLowerCase() === o.materialName.toLowerCase());
    if (mat) return sum + mat.estimatedPrice * parseQuantity(mat.quantity);
    const tool = tools.find(t => t.name.toLowerCase() === o.materialName.toLowerCase());
    if (tool?.estimatedPrice) return sum + tool.estimatedPrice;
    return sum;
  }, 0);

  const output: PlanOutput = {
    buildingCodes: String(raw.buildingCodes || ''),
    localCodes: String(raw.localCodes || ''),
    permitRequirements: String(raw.permitRequirements || ''),
    bestPractices: String(raw.bestPractices || ''),
    commonPitfalls: String(raw.commonPitfalls || ''),
    safetyWarnings: Array.isArray(raw.safetyWarnings) ? raw.safetyWarnings.map(String) : [],
    proRequired: Boolean(raw.proRequired),
    proRequiredReason: raw.proRequiredReason ? String(raw.proRequiredReason) : undefined,
    approach: String(raw.approach || ''),
    steps: parseSteps(raw.steps as Record<string, unknown>[] | undefined),
    materials,
    tools,
    estimatedDuration: String(raw.estimatedDuration || 'TBD'),
    skillLevel: String(raw.skillLevel || 'intermediate'),
    videos: parseVideos(raw.videos as Record<string, unknown>[] | undefined),
    alternativeApproaches: raw.alternativeApproaches ? String(raw.alternativeApproaches) : undefined,
    ownedItems,
    totalEstimate,
    savingsFromInventory,
  };

  return { output, toolCalls: result.toolCalls, durationMs: result.durationMs, tokenUsage: result.tokenUsage };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(raw: Record<string, unknown>[] | undefined): ProjectStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s): ProjectStep => ({
    order: Number(s.order) || 0,
    title: String(s.title || ''),
    description: String(s.description || ''),
    estimatedTime: String(s.estimatedTime || ''),
    skillLevel: String(s.skillLevel || 'beginner'),
    safetyNotes: Array.isArray(s.safetyNotes) ? s.safetyNotes.map(String) : undefined,
    inspectionRequired: Boolean(s.inspectionRequired),
  }));
}

function parseMaterials(raw: Record<string, unknown>[] | undefined): DesignMaterial[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m): DesignMaterial => ({
    name: String(m.name || ''),
    quantity: String(m.quantity || '1'),
    category: String(m.category || 'general'),
    estimatedPrice: Number(m.estimatedPrice) || 0,
    required: m.required !== false,
    notes: m.notes ? String(m.notes) : undefined,
  }));
}

function parseTools(raw: Record<string, unknown>[] | undefined): DesignTool[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t): DesignTool => ({
    name: String(t.name || ''),
    category: String(t.category || 'general'),
    required: t.required !== false,
    estimatedPrice: t.estimatedPrice ? Number(t.estimatedPrice) : undefined,
    notes: t.notes ? String(t.notes) : undefined,
  }));
}

function parseVideos(raw: Record<string, unknown>[] | undefined): DesignVideo[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v): DesignVideo => ({
    title: String(v.title || ''),
    url: String(v.url || ''),
    channel: String(v.channel || ''),
    description: String(v.description || ''),
  }));
}

function matchOwnedItems(
  materials: Record<string, unknown>[] | undefined,
  tools: Record<string, unknown>[] | undefined,
  inventory: InventoryData | null,
): OwnedItem[] {
  if (!inventory || inventory.items.length === 0) return [];

  const owned: OwnedItem[] = [];
  const inventoryNames = inventory.items.map(i => i.item_name.toLowerCase());

  if (Array.isArray(materials)) {
    for (const m of materials) {
      const name = String(m.name || '').toLowerCase();
      const idx = inventoryNames.findIndex(n => n.includes(name) || name.includes(n));
      if (idx !== -1) {
        owned.push({
          materialName: String(m.name),
          ownedAs: inventory.items[idx].item_name,
          category: String(m.category || inventory.items[idx].category),
        });
      }
    }
  }

  if (Array.isArray(tools)) {
    for (const t of tools) {
      const name = String(t.name || '').toLowerCase();
      const idx = inventoryNames.findIndex(n => n.includes(name) || name.includes(n));
      if (idx !== -1 && !owned.some(o => o.materialName.toLowerCase() === name)) {
        owned.push({
          materialName: String(t.name),
          ownedAs: inventory.items[idx].item_name,
          category: String(t.category || inventory.items[idx].category),
        });
      }
    }
  }

  return owned;
}

export function parseQuantity(qty: string): number {
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) || 1 : 1;
}
