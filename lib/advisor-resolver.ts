// Advisor resolution — determines which review strategy to use for a given request.
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// Selective invocation (§8): skip review for low-risk intents unless safety keywords detected.

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
  advisorMode: 'off' | 'beta' | 'custom';
  advisorTool: AdvisorToolConfig | null;
  useBetaApi: boolean;
  customReviewerModel: string | null;
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
    advisorMode: 'off',
    advisorTool: null,
    useBetaApi: false,
    customReviewerModel: null,
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

  // Safety keyword detection (shared by both beta and custom modes)
  const messageLower = message.toLowerCase();
  const matched = config.advisor.safetyCriticalKeywords
    .filter(kw => messageLower.includes(kw));

  if (matched.length > 0) {
    result.safetyKeywordsDetected = true;
    result.safetyKeywordsMatched = matched;
  }

  // ── Custom mode ──────────────────────────────────────────
  if (config.advisor.mode === 'custom') {
    // Selective invocation (arXiv:2510.02453 §8): skip review for quick_question
    // unless safety keywords force it. Reduces cost by ~40-60%.
    if (intentType === 'quick_question' && !result.safetyKeywordsDetected) {
      return result; // advisorMode stays 'off'
    }

    result.advisorMode = 'custom';
    result.customReviewerModel = config.advisor.customReviewer.model;
    return result;
  }

  // ── Beta mode ────────────────────────────────────────────
  if (!tier.advisor || tier.maxUses <= 0) {
    return result; // advisorMode stays 'off'
  }

  let effectiveMaxUses = tier.maxUses;
  if (matched.length > 0) {
    effectiveMaxUses += config.advisor.safetyBoostUses;
  }

  result.advisorMode = 'beta';

  result.systemPromptSuffix = `\n\n**ADVISOR TOOL — YOU HAVE ACCESS TO A MORE CAPABLE MODEL FOR REVIEW:**
You have an "advisor" tool available. It connects you to a more capable model that can review your reasoning.
You MUST call the advisor tool before providing guidance on:
- Electrical work: panels, wiring, circuits, breakers, outlets, switches
- Gas line work or appliance hookups
- Structural or load-bearing assessments
- Asbestos, lead paint, or hazardous material concerns
- Roof work at height
- Any situation where you would include a Safety-critical callout
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
