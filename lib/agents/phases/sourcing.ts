import { runPhase, type PhaseToolDef } from '../runner';
import { SOURCING_SYSTEM_PROMPT } from '../prompts';
import type {
  AgentContext, AgentStreamEvent, SourcingOutput,
  PricedMaterial, OwnedItem, StoreSummary, ToolCallLog, TokenUsage,
} from '../types';
import { AuthResult } from '@/lib/auth';

const SOURCING_TOOLS: PhaseToolDef[] = [
  {
    name: 'check_user_inventory',
    description: 'Check what tools and materials the user already owns.',
    input_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categories to check. Leave empty for all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_local_stores',
    description: 'Search for a material at local stores in a specific location.',
    input_schema: {
      type: 'object',
      properties: {
        material_name: { type: 'string', description: 'The material to search for' },
        city: { type: 'string', description: 'City name' },
        state: { type: 'string', description: 'State name or abbreviation' },
      },
      required: ['material_name', 'city', 'state'],
    },
  },
  {
    name: 'submit_sourcing_results',
    description: 'Submit the sourcing analysis as structured data. Call this when sourcing is complete.',
    input_schema: {
      type: 'object',
      properties: {
        pricedMaterials: {
          type: 'array',
          description: 'Materials with real prices from stores',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              category: { type: 'string' },
              estimatedPrice: { type: 'number', description: 'Per-unit price' },
              bestPrice: { type: 'number', description: 'Best price found at stores' },
              bestStore: { type: 'string', description: 'Store with best price' },
              productUrl: { type: 'string', description: 'URL to the product page' },
              required: { type: 'boolean' },
              priceConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['name', 'quantity', 'category', 'estimatedPrice', 'required', 'priceConfidence'],
          },
        },
        ownedItems: {
          type: 'array',
          description: 'Items the user already owns (from inventory)',
          items: {
            type: 'object',
            properties: {
              materialName: { type: 'string', description: 'Material name from the design list' },
              ownedAs: { type: 'string', description: 'Name in user inventory' },
              category: { type: 'string' },
            },
            required: ['materialName', 'ownedAs', 'category'],
          },
        },
        storeSummary: {
          type: 'array',
          description: 'Summary per store (how many items available, total cost)',
          items: {
            type: 'object',
            properties: {
              store: { type: 'string' },
              itemCount: { type: 'number' },
              totalPrice: { type: 'number' },
            },
            required: ['store', 'itemCount', 'totalPrice'],
          },
        },
        totalEstimate: { type: 'number', description: 'Total estimated cost for all materials' },
        savingsFromInventory: { type: 'number', description: 'Estimated savings from items user already owns' },
      },
      required: ['pricedMaterials', 'ownedItems', 'storeSummary', 'totalEstimate', 'savingsFromInventory'],
    },
  },
];

export async function runSourcingPhase(
  context: AgentContext,
  auth: AuthResult,
  sendEvent: (event: AgentStreamEvent) => void,
  checkCancelled?: () => boolean,
): Promise<{ output: SourcingOutput; toolCalls: ToolCallLog[]; durationMs: number; tokenUsage: TokenUsage }> {
  const design = context.design!;
  const location = `${context.location.city}, ${context.location.state}`;

  const materialsTable = design.materials
    .map((m, i) => `${i + 1}. ${m.name} — qty: ${m.quantity}, category: ${m.category}, est. $${m.estimatedPrice}/unit, ${m.required ? 'required' : 'optional'}`)
    .join('\n');

  const toolsTable = design.tools
    .map((t, i) => `${i + 1}. ${t.name} — ${t.category}, ${t.required ? 'required' : 'nice-to-have'}${t.estimatedPrice ? `, est. $${t.estimatedPrice}` : ''}`)
    .join('\n');

  const userPrompt = `Find real prices and optimize the shopping list for this DIY project.

**Project:** ${context.projectDescription}
**Location:** ${location}
**Budget Preference:** ${context.preferences.budgetLevel}

## Materials Needed (from design phase)
${materialsTable}

## Tools Needed
${toolsTable}

---

**Instructions:**
1. Check the user's inventory to see what they already own.
2. Search local stores for ONLY the top 3-4 most expensive materials. Use ONE search per material — do not repeat searches.
3. For all other items, use the design phase price estimates directly.
4. Compile the shopping list and call submit_sourcing_results.

IMPORTANT: Be efficient. Do NOT search for every item individually. Only search the 3-4 highest-cost items. Use design estimates for everything else. Call submit_sourcing_results as soon as you have enough data.`;

  const result = await runPhase({
    phase: 'sourcing',
    systemPrompt: SOURCING_SYSTEM_PROMPT,
    userPrompt,
    tools: SOURCING_TOOLS,
    outputToolName: 'submit_sourcing_results',
    auth,
    runId: context.projectId || 'unknown',
    sendEvent,
    overallProgressBase: 50,
    overallProgressRange: 35,
    maxToolLoops: 6,
    timeoutMs: 75_000,
    checkCancelled,
  });

  const raw = result.output;

  const output: SourcingOutput = {
    pricedMaterials: Array.isArray(raw.pricedMaterials)
      ? (raw.pricedMaterials as Record<string, unknown>[]).map((m): PricedMaterial => ({
          name: String(m.name || ''),
          quantity: String(m.quantity || '1'),
          category: String(m.category || 'general'),
          estimatedPrice: Number(m.estimatedPrice) || 0,
          bestPrice: m.bestPrice ? Number(m.bestPrice) : undefined,
          bestStore: m.bestStore ? String(m.bestStore) : undefined,
          productUrl: m.productUrl ? String(m.productUrl) : undefined,
          required: m.required !== false,
          priceConfidence: (['high', 'medium', 'low'].includes(String(m.priceConfidence))
            ? String(m.priceConfidence)
            : 'low') as 'high' | 'medium' | 'low',
        }))
      : [],
    ownedItems: Array.isArray(raw.ownedItems)
      ? (raw.ownedItems as Record<string, unknown>[]).map((o): OwnedItem => ({
          materialName: String(o.materialName || ''),
          ownedAs: String(o.ownedAs || ''),
          category: String(o.category || 'general'),
        }))
      : [],
    storeSummary: Array.isArray(raw.storeSummary)
      ? (raw.storeSummary as Record<string, unknown>[]).map((s): StoreSummary => ({
          store: String(s.store || ''),
          itemCount: Number(s.itemCount) || 0,
          totalPrice: Number(s.totalPrice) || 0,
        }))
      : [],
    totalEstimate: Number(raw.totalEstimate) || 0,
    savingsFromInventory: Number(raw.savingsFromInventory) || 0,
  };

  return { output, toolCalls: result.toolCalls, durationMs: result.durationMs, tokenUsage: result.tokenUsage };
}
