import Anthropic from '@anthropic-ai/sdk';
import config from '@/lib/config';
import { logger } from '@/lib/logger';
import type { IntentClassification, IntentClassificationContext } from './types';

const FALLBACK_CLASSIFICATION: IntentClassification = {
  intent: 'full_project',
  confidence: 0,
  reasoning: 'Classification fallback — using default mode',
};

const CLASSIFICATION_SYSTEM_PROMPT = `You are an intent classifier for a DIY home improvement assistant. Classify the user's message into exactly one category:

- quick_question: Simple factual questions with short answers (e.g., "What size nail for baseboards?", "Can I mix PEX and copper?")
- troubleshooting: User has a problem and needs diagnostic help (e.g., "My outlet isn't working", "Water is leaking under my sink")
- mid_project: User is in the middle of an active project and needs help with a specific step (e.g., "The mortar isn't sticking", "I'm stuck on the wiring")
- full_project: User wants to plan or start a new project (e.g., "I want to build a deck", "Planning a bathroom remodel")

Respond with ONLY a JSON object:
{"intent":"<category>","confidence":<0-1>,"reasoning":"<brief explanation>"}`;

export function buildClassificationPrompt(
  message: string,
  context: IntentClassificationContext
): string {
  const parts: string[] = [`User message: "${message}"`];
  if (context.hasActiveProjects) {
    const cats = context.activeProjectCategories?.join(', ') || 'unknown';
    parts.push(`Context: User has active projects in categories: ${cats}`);
  } else {
    parts.push('Context: User has no active projects');
  }
  return parts.join('\n');
}

export async function classifyIntent(
  message: string,
  context: IntentClassificationContext
): Promise<IntentClassification> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const userPrompt = buildClassificationPrompt(message, context);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.intelligence.classificationTimeoutMs
    );

    try {
      const response = await anthropic.messages.create(
        {
          model: config.intelligence.classificationModel,
          max_tokens: config.intelligence.classificationMaxTokens,
          temperature: 0,
          system: CLASSIFICATION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const parsed = JSON.parse(text) as IntentClassification;

      const validIntents = ['quick_question', 'troubleshooting', 'mid_project', 'full_project'];
      if (!validIntents.includes(parsed.intent)) {
        logger.warn('Unknown intent type from classification', { intent: parsed.intent });
        return FALLBACK_CLASSIFICATION;
      }

      return {
        intent: parsed.intent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        reasoning: parsed.reasoning || '',
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.error('Intent classification failed, using fallback', error);
    return FALLBACK_CLASSIFICATION;
  }
}
