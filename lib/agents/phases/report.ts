import { runPhase, type PhaseToolDef } from '../runner';
import { REPORT_SYSTEM_PROMPT } from '../prompts';
import type { AgentContext, AgentStreamEvent, ReportOutput, ReportSection, ToolCallLog, TokenUsage } from '../types';
import { AuthResult } from '@/lib/auth';

// Report phase has no real tools — only the output submission tool
const REPORT_TOOLS: PhaseToolDef[] = [
  {
    name: 'submit_report_results',
    description: 'Submit the complete project report as structured data with all sections.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Report title (e.g., "12x16 Composite Deck Project Plan")' },
        summary: { type: 'string', description: 'One-paragraph executive summary of the project' },
        totalCost: { type: 'number', description: 'Total estimated project cost including contingency' },
        sections: {
          type: 'array',
          description: 'Report sections in order',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Section identifier (overview, plan, materials, cost, resources)' },
              title: { type: 'string', description: 'Section display title' },
              content: { type: 'string', description: 'Section content in concise markdown format (150-250 words max)' },
              order: { type: 'number', description: 'Display order (1-5)' },
              type: {
                type: 'string',
                enum: ['overview', 'plan', 'materials', 'cost', 'resources'],
              },
            },
            required: ['id', 'title', 'content', 'order', 'type'],
          },
        },
      },
      required: ['title', 'summary', 'totalCost', 'sections'],
    },
  },
];

export async function runReportPhase(
  context: AgentContext,
  auth: AuthResult,
  sendEvent: (event: AgentStreamEvent) => void,
  checkCancelled?: () => boolean,
): Promise<{ output: ReportOutput; toolCalls: ToolCallLog[]; durationMs: number; tokenUsage: TokenUsage }> {
  const research = context.research!;
  const design = context.design!;
  const sourcing = context.sourcing!;

  // Build a comprehensive data dump for the report writer
  const materialsTable = sourcing.pricedMaterials
    .map(m => {
      const price = m.bestPrice || m.estimatedPrice;
      const store = m.bestStore ? ` (${m.bestStore})` : '';
      const confidence = m.priceConfidence !== 'high' ? ` [${m.priceConfidence} confidence]` : '';
      return `- ${m.name}: ${m.quantity} @ $${price}${store}${confidence} ${m.required ? '[required]' : '[optional]'}`;
    })
    .join('\n');

  const ownedList = sourcing.ownedItems.length > 0
    ? sourcing.ownedItems.map(o => `- ${o.materialName} (you have: ${o.ownedAs})`).join('\n')
    : 'None matched from inventory.';

  const stepsText = design.steps
    .map(s => {
      let text = `**Step ${s.order}: ${s.title}**\n${s.description}\n- Time: ${s.estimatedTime}\n- Skill: ${s.skillLevel}`;
      if (s.safetyNotes?.length) text += `\n- Safety: ${s.safetyNotes.join('; ')}`;
      if (s.inspectionRequired) text += `\n- **INSPECTION REQUIRED**`;
      return text;
    })
    .join('\n\n');

  const toolsList = design.tools
    .map(t => {
      let text = `- ${t.name} (${t.category}) — ${t.required ? 'Required' : 'Nice-to-have'}`;
      if (t.estimatedPrice) text += ` ~$${t.estimatedPrice}`;
      if (t.notes) text += ` — ${t.notes}`;
      return text;
    })
    .join('\n');

  const videosText = design.videos.length > 0
    ? design.videos.map(v => `- [${v.title}](${v.url}) by ${v.channel} — ${v.description}`).join('\n')
    : 'No tutorial videos found.';

  const storeText = sourcing.storeSummary
    .map(s => `- ${s.store}: ${s.itemCount} items, ~$${s.totalPrice.toFixed(2)} total`)
    .join('\n');

  const userPrompt = `Write a comprehensive project report using all the data below.

## Project Information
- **Project:** ${context.projectDescription}
- **Location:** ${context.location.city}, ${context.location.state}
- **Experience Level:** ${context.preferences.experienceLevel}
- **Budget:** ${context.preferences.budgetLevel}
${context.preferences.timeframe ? `- **Timeframe:** ${context.preferences.timeframe}` : ''}

## Research Data

### Building Codes
${research.buildingCodes}

### Local Codes (${context.location.city}, ${context.location.state})
${research.localCodes}

### Permits
${research.permitRequirements}

### Best Practices
${research.bestPractices}

### Common Pitfalls
${research.commonPitfalls}

### Safety Warnings
${research.safetyWarnings.map(w => `- ${w}`).join('\n')}
${research.proRequired ? `\n**PROFESSIONAL REQUIRED:** ${research.proRequiredReason}` : ''}

## Design Data

### Approach
${design.approach}

### Steps
${stepsText}

### Estimated Duration: ${design.estimatedDuration}
### Overall Skill Level: ${design.skillLevel}
${design.alternativeApproaches ? `\n### Alternative Approaches\n${design.alternativeApproaches}` : ''}

## Sourcing Data

### Materials (Priced)
${materialsTable}

### Items You Already Own
${ownedList}

### Tools Required
${toolsList}

### Store Summary
${storeText}

### Cost Summary
- Materials Total: $${sourcing.totalEstimate.toFixed(2)}
- Savings from Inventory: $${sourcing.savingsFromInventory.toFixed(2)}

### Tutorial Videos
${videosText}

---

IMMEDIATELY call submit_report_results with exactly 5 sections (overview, plan, materials, cost, resources). Keep each section concise (150-250 words). Do NOT output any text before the tool call.`;

  const result = await runPhase({
    phase: 'report',
    systemPrompt: REPORT_SYSTEM_PROMPT,
    userPrompt,
    tools: REPORT_TOOLS,
    outputToolName: 'submit_report_results',
    auth,
    runId: context.projectId || 'unknown',
    sendEvent,
    overallProgressBase: 85,
    overallProgressRange: 15,
    maxToolLoops: 2,
    timeoutMs: 60_000,
    checkCancelled,
  });

  const raw = result.output;

  const output: ReportOutput = {
    id: '', // Will be set when saved to DB
    title: String(raw.title || `${context.projectDescription} — Project Plan`),
    summary: String(raw.summary || ''),
    totalCost: Number(raw.totalCost) || sourcing.totalEstimate,
    sections: Array.isArray(raw.sections)
      ? (raw.sections as Record<string, unknown>[]).map((s): ReportSection => ({
          id: String(s.id || ''),
          title: String(s.title || ''),
          content: String(s.content || ''),
          order: Number(s.order) || 0,
          type: (s.type as ReportSection['type']) || 'overview',
        }))
      : [],
    generatedAt: new Date().toISOString(),
  };

  return { output, toolCalls: result.toolCalls, durationMs: result.durationMs, tokenUsage: result.tokenUsage };
}
