import { runPhase, type PhaseToolDef } from '../runner';
import { RESEARCH_SYSTEM_PROMPT } from '../prompts';
import type { AgentContext, AgentStreamEvent, ResearchOutput, ToolCallLog, TokenUsage } from '../types';
import { AuthResult } from '@/lib/auth';

// Tools available to the research phase
const RESEARCH_TOOLS: PhaseToolDef[] = [
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
    name: 'web_fetch',
    description: 'Fetch and read the contents of a specific web page.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'submit_research_results',
    description: 'Submit the research findings as structured data. Call this when you have gathered enough information.',
    input_schema: {
      type: 'object',
      properties: {
        buildingCodes: { type: 'string', description: 'National building code findings relevant to this project' },
        localCodes: { type: 'string', description: 'Local building code findings for the specified city/state' },
        permitRequirements: { type: 'string', description: 'Summary of required permits, estimated costs, and how to apply' },
        bestPractices: { type: 'string', description: 'Professional best practices for this type of project' },
        commonPitfalls: { type: 'string', description: 'Common mistakes DIYers make on this project type' },
        safetyWarnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Explicit safety warnings and cautions',
        },
        proRequired: { type: 'boolean', description: 'Whether this project legally requires licensed professional work' },
        proRequiredReason: { type: 'string', description: 'If proRequired is true, explain why' },
      },
      required: ['buildingCodes', 'localCodes', 'permitRequirements', 'bestPractices', 'commonPitfalls', 'safetyWarnings', 'proRequired'],
    },
  },
];

export async function runResearchPhase(
  context: AgentContext,
  auth: AuthResult,
  sendEvent: (event: AgentStreamEvent) => void,
  checkCancelled?: () => boolean,
): Promise<{ output: ResearchOutput; toolCalls: ToolCallLog[]; durationMs: number; tokenUsage: TokenUsage }> {
  const userPrompt = `Research the following DIY project:

**Project:** ${context.projectDescription}
**Location:** ${context.location.city}, ${context.location.state}${context.location.zipCode ? ` (${context.location.zipCode})` : ''}
**DIYer Experience Level:** ${context.preferences.experienceLevel}

Please research:
1. National building codes (NEC, IRC, IBC) that apply to this project
2. Local building codes and amendments for ${context.location.city}, ${context.location.state}
3. Permit requirements for this project in this location
4. Best practices from professional contractors
5. Common pitfalls and mistakes for this type of project
6. Safety warnings and whether any part requires a licensed professional

When done, call submit_research_results with your structured findings.`;

  const result = await runPhase({
    phase: 'research',
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt,
    tools: RESEARCH_TOOLS,
    outputToolName: 'submit_research_results',
    auth,
    runId: context.projectId || 'unknown',
    sendEvent,
    overallProgressBase: 0,
    overallProgressRange: 25,
    timeoutMs: 120_000,
    checkCancelled,
  });

  const output: ResearchOutput = {
    buildingCodes: String(result.output.buildingCodes || ''),
    localCodes: String(result.output.localCodes || ''),
    permitRequirements: String(result.output.permitRequirements || ''),
    bestPractices: String(result.output.bestPractices || ''),
    commonPitfalls: String(result.output.commonPitfalls || ''),
    safetyWarnings: Array.isArray(result.output.safetyWarnings)
      ? result.output.safetyWarnings.map(String)
      : [],
    proRequired: Boolean(result.output.proRequired),
    proRequiredReason: result.output.proRequiredReason
      ? String(result.output.proRequiredReason)
      : undefined,
  };

  return { output, toolCalls: result.toolCalls, durationMs: result.durationMs, tokenUsage: result.tokenUsage };
}
