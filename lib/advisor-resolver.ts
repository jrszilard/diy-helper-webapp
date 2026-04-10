import config from '@/lib/config';
import { ADVISOR_TOOL_TYPE } from '@/lib/tools/definitions';
import type { IntentType } from '@/lib/intelligence/types';

export interface AdvisorToolConfig {
  type: string;
  name: 'advisor';
  model: string;
  max_uses: number;
}

export interface AdvisorResolution {
  executorModel: string;
  advisorTool: AdvisorToolConfig | null;
  useBetaApi: boolean;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  systemPromptSuffix: string;
}

export function resolveAdvisorConfig(
  intentType: IntentType | undefined,
  message: string,
): AdvisorResolution {
  const result: AdvisorResolution = {
    executorModel: config.anthropic.model,
    advisorTool: null,
    useBetaApi: false,
    safetyKeywordsDetected: false,
    safetyKeywordsMatched: [],
    systemPromptSuffix: '',
  };

  if (config.advisor.mode === 'off' || !intentType) {
    return result;
  }

  const tier = config.advisor.tiers[intentType];
  if (!tier) {
    return result;
  }

  result.executorModel = tier.executor;

  if (!tier.advisor || tier.maxUses <= 0) {
    return result;
  }

  let effectiveMaxUses = tier.maxUses;

  // Server-side keyword forcing
  const messageLower = message.toLowerCase();
  const matched = config.advisor.safetyCriticalKeywords
    .filter(kw => messageLower.includes(kw));

  if (matched.length > 0) {
    result.safetyKeywordsDetected = true;
    result.safetyKeywordsMatched = matched;
    effectiveMaxUses += config.advisor.safetyBoostUses;
  }

  // The beta API doesn't accept a description field on the advisor tool,
  // so we inject advisor usage instructions into the system prompt instead.
  result.systemPromptSuffix = `\n\n**ADVISOR TOOL — YOU HAVE ACCESS TO A MORE CAPABLE MODEL FOR REVIEW:**
You have an "advisor" tool available. It connects you to a more capable model that can review your reasoning.
You MUST call the advisor tool before providing guidance on:
- Electrical work: panels, wiring, circuits, breakers, outlets, switches
- Gas line work or appliance hookups
- Structural or load-bearing assessments
- Asbestos, lead paint, or hazardous material concerns
- Roof work at height
- Any situation where you would include a ⚠️ Safety-critical callout
- Building code interpretation where you're not fully certain
- Complex multi-step projects where getting the sequence wrong could cause damage

When calling the advisor, describe what the user asked and your draft reasoning. The advisor will confirm, correct, or flag issues.${
    matched.length > 0
      ? '\n\nCRITICAL: The user\'s question involves safety-critical work. You MUST consult the advisor before responding.'
      : ''
  }`;

  result.advisorTool = {
    type: ADVISOR_TOOL_TYPE,
    name: 'advisor',
    model: tier.advisor,
    max_uses: effectiveMaxUses,
  };
  result.useBetaApi = true;

  return result;
}
