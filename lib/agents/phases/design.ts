import { runPhase, type PhaseToolDef } from '../runner';
import { DESIGN_SYSTEM_PROMPT } from '../prompts';
import type {
  AgentContext, AgentStreamEvent, DesignOutput,
  ProjectStep, DesignMaterial, DesignTool, DesignVideo, ToolCallLog, TokenUsage,
} from '../types';
import { AuthResult } from '@/lib/auth';

const DESIGN_TOOLS: PhaseToolDef[] = [
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
    name: 'web_search',
    description: 'Search the web for specific techniques, product specs, or project details.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'submit_design_results',
    description: 'Submit the project design as structured data. Call this when the design is complete.',
    input_schema: {
      type: 'object',
      properties: {
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
          description: 'Complete materials list',
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
          description: 'Required tools',
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
        estimatedDuration: { type: 'string', description: 'Total estimated duration (e.g., "2-3 weekends")' },
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
        alternativeApproaches: { type: 'string', description: 'Other ways to accomplish this project' },
      },
      required: ['approach', 'steps', 'materials', 'tools', 'estimatedDuration', 'skillLevel', 'videos'],
    },
  },
];

export async function runDesignPhase(
  context: AgentContext,
  auth: AuthResult,
  sendEvent: (event: AgentStreamEvent) => void,
  checkCancelled?: () => boolean,
): Promise<{ output: DesignOutput; toolCalls: ToolCallLog[]; durationMs: number; tokenUsage: TokenUsage }> {
  const research = context.research!;

  const userPrompt = `Design a complete project plan for the following DIY project.

**Project:** ${context.projectDescription}
**Location:** ${context.location.city}, ${context.location.state}
**Experience Level:** ${context.preferences.experienceLevel}
**Budget Preference:** ${context.preferences.budgetLevel}
${context.preferences.timeframe ? `**Timeframe:** ${context.preferences.timeframe}` : ''}

## Research Findings

### Building Codes
${research.buildingCodes}

### Local Codes
${research.localCodes}

### Permit Requirements
${research.permitRequirements}

### Best Practices
${research.bestPractices}

### Common Pitfalls
${research.commonPitfalls}

### Safety Warnings
${research.safetyWarnings.map(w => `- ${w}`).join('\n')}

${research.proRequired ? `**WARNING: Professional Required** — ${research.proRequiredReason}` : ''}

---

Based on this research, design a complete project plan with step-by-step instructions, a full materials list with realistic prices, tool requirements, and timeline. Search for tutorial videos for the key techniques. When done, call submit_design_results.`;

  const result = await runPhase({
    phase: 'design',
    systemPrompt: DESIGN_SYSTEM_PROMPT,
    userPrompt,
    tools: DESIGN_TOOLS,
    outputToolName: 'submit_design_results',
    auth,
    runId: context.projectId || 'unknown',
    sendEvent,
    overallProgressBase: 25,
    overallProgressRange: 25,
    maxToolLoops: 4,
    timeoutMs: 75_000,
    maxTokens: 8192,
    checkCancelled,
  });

  const raw = result.output;

  const output: DesignOutput = {
    approach: String(raw.approach || ''),
    steps: Array.isArray(raw.steps)
      ? (raw.steps as Record<string, unknown>[]).map((s): ProjectStep => ({
          order: Number(s.order) || 0,
          title: String(s.title || ''),
          description: String(s.description || ''),
          estimatedTime: String(s.estimatedTime || ''),
          skillLevel: String(s.skillLevel || 'beginner'),
          safetyNotes: Array.isArray(s.safetyNotes) ? s.safetyNotes.map(String) : undefined,
          inspectionRequired: Boolean(s.inspectionRequired),
        }))
      : [],
    materials: Array.isArray(raw.materials)
      ? (raw.materials as Record<string, unknown>[]).map((m): DesignMaterial => ({
          name: String(m.name || ''),
          quantity: String(m.quantity || '1'),
          category: String(m.category || 'general'),
          estimatedPrice: Number(m.estimatedPrice) || 0,
          required: m.required !== false,
          notes: m.notes ? String(m.notes) : undefined,
        }))
      : [],
    tools: Array.isArray(raw.tools)
      ? (raw.tools as Record<string, unknown>[]).map((t): DesignTool => ({
          name: String(t.name || ''),
          category: String(t.category || 'general'),
          required: t.required !== false,
          estimatedPrice: t.estimatedPrice ? Number(t.estimatedPrice) : undefined,
          notes: t.notes ? String(t.notes) : undefined,
        }))
      : [],
    estimatedDuration: String(raw.estimatedDuration || 'TBD'),
    skillLevel: String(raw.skillLevel || 'intermediate'),
    videos: Array.isArray(raw.videos)
      ? (raw.videos as Record<string, unknown>[]).map((v): DesignVideo => ({
          title: String(v.title || ''),
          url: String(v.url || ''),
          channel: String(v.channel || ''),
          description: String(v.description || ''),
        }))
      : [],
    alternativeApproaches: raw.alternativeApproaches
      ? String(raw.alternativeApproaches)
      : undefined,
  };

  return { output, toolCalls: result.toolCalls, durationMs: result.durationMs, tokenUsage: result.tokenUsage };
}
