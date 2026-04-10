import config from '@/lib/config';
import { ADVISOR_TOOL_DESCRIPTION, ADVISOR_TOOL_TYPE } from '@/lib/tools/definitions';
import type { IntentType } from '@/lib/intelligence/types';

export interface AdvisorToolConfig {
  type: string;
  name: string;
  model: string;
  max_uses: number;
  description: string;
}

export interface AdvisorResolution {
  executorModel: string;
  advisorTool: AdvisorToolConfig | null;
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
    safetyKeywordsDetected: false,
    safetyKeywordsMatched: [],
    systemPromptSuffix: '',
  };

  if (!config.advisor.enabled || !intentType) {
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
    result.systemPromptSuffix = '\n\nIMPORTANT: The user\'s question involves safety-critical work. You MUST consult the advisor before responding.';
  }

  result.advisorTool = {
    type: ADVISOR_TOOL_TYPE,
    name: 'advisor',
    model: tier.advisor,
    max_uses: effectiveMaxUses,
    description: ADVISOR_TOOL_DESCRIPTION,
  };

  return result;
}
