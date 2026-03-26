import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '@/lib/system-prompt';
import { buildClassificationPrompt } from '@/lib/intelligence/intent-router';
import type { IntentType } from '@/lib/intelligence/types';

describe('Prompt Variants', () => {
  it('quick question prompt is significantly shorter than full project', () => {
    const quick = getSystemPrompt('quick_question');
    const full = getSystemPrompt('full_project');
    expect(quick.length).toBeLessThan(full.length * 0.5);
  });

  it('all prompt variants are non-empty strings', () => {
    const intents: IntentType[] = ['quick_question', 'troubleshooting', 'mid_project', 'full_project'];
    for (const intent of intents) {
      const prompt = getSystemPrompt(intent);
      expect(prompt.length).toBeGreaterThan(50);
    }
  });

  it('default getSystemPrompt (no argument) returns full project prompt', () => {
    const defaultPrompt = getSystemPrompt();
    const fullPrompt = getSystemPrompt('full_project');
    expect(defaultPrompt).toBe(fullPrompt);
  });

  it('classification prompt includes message and context', () => {
    const prompt = buildClassificationPrompt('Fix my leaky faucet', {
      hasActiveProjects: true,
      activeProjectCategories: ['plumbing'],
    });
    expect(prompt).toContain('Fix my leaky faucet');
    expect(prompt).toContain('plumbing');
    expect(prompt).toContain('active projects');
  });
});

describe('Route Intent Selection Logic', () => {
  it('new conversation with high confidence uses classified intent', () => {
    const existingConversationId = null;
    const prunedHistoryLength = 0;
    const classificationResult = { intent: 'quick_question' as IntentType, confidence: 0.95, reasoning: 'test' };
    const confidenceThreshold = 0.7;

    let intentType: IntentType | undefined;
    if (!existingConversationId && prunedHistoryLength === 0) {
      if (classificationResult.confidence >= confidenceThreshold) {
        intentType = classificationResult.intent;
      }
    }

    const prompt = intentType ? getSystemPrompt(intentType) : getSystemPrompt();
    expect(intentType).toBe('quick_question');
    expect(prompt).toContain('quick, direct answer');
    expect(prompt).not.toContain('CRITICAL WORKFLOW');
  });

  it('new conversation with low confidence falls back to full_project', () => {
    const existingConversationId = null;
    const prunedHistoryLength = 0;
    const classificationResult = { intent: 'quick_question' as IntentType, confidence: 0.5, reasoning: 'unsure' };
    const confidenceThreshold = 0.7;

    let intentType: IntentType | undefined;
    if (!existingConversationId && prunedHistoryLength === 0) {
      if (classificationResult.confidence >= confidenceThreshold) {
        intentType = classificationResult.intent;
      }
    }

    const prompt = intentType ? getSystemPrompt(intentType) : getSystemPrompt();
    expect(intentType).toBeUndefined();
    expect(prompt).toContain('CRITICAL WORKFLOW');
  });

  it('existing conversation uses cached intent_type', () => {
    const existingConversationId = 'conv-123';
    const cachedIntentType = 'troubleshooting' as IntentType;

    let intentType: IntentType | undefined;
    if (existingConversationId) {
      intentType = cachedIntentType;
    }

    const prompt = intentType ? getSystemPrompt(intentType) : getSystemPrompt();
    expect(intentType).toBe('troubleshooting');
    expect(prompt).toContain('diagnos');
    expect(prompt).not.toContain('CRITICAL WORKFLOW');
  });

  it('existing conversation with no cached intent falls back to full_project', () => {
    const existingConversationId = 'conv-456';
    const cachedIntentType = null;

    let intentType: IntentType | undefined;
    if (existingConversationId && cachedIntentType) {
      intentType = cachedIntentType as IntentType;
    }

    const prompt = intentType ? getSystemPrompt(intentType) : getSystemPrompt();
    expect(intentType).toBeUndefined();
    expect(prompt).toContain('CRITICAL WORKFLOW');
  });
});
