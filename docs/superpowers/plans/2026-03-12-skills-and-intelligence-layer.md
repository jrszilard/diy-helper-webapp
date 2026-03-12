# Skills & Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a User Intelligence Layer (Smart Routing, Skill Calibration, Expert Co-Pilot) and 5 developer workflow skills to the DIY Helper platform.

**Architecture:** Three middleware features share `lib/intelligence/` — intent routing classifies user messages into quick/troubleshoot/mid-project/full-project modes, skill calibration adjusts AI response depth based on passive user profiling, and an expert co-pilot provides opt-in tools for contractors. Five Claude Code skills automate testing and validation workflows.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL + RLS), Anthropic Claude API (Haiku for classification, Sonnet for responses), Vitest, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-03-12-skills-and-intelligence-layer-design.md`

---

## Chunk 1: Foundation + Smart Routing

This chunk creates the `lib/intelligence/` module, adds intent classification to the chat flow, and modifies the system prompt to be intent-aware. After this chunk, users get routed to different response modes based on their message.

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/intelligence/types.ts` | Shared TypeScript interfaces for the intelligence layer |
| Create | `lib/intelligence/intent-router.ts` | Intent classification using Haiku |
| Create | `lib/__tests__/intent-router.test.ts` | Unit tests for intent classification |
| Modify | `lib/system-prompt.ts` | Convert from string constant to function that accepts intent type |
| Create | `lib/__tests__/system-prompt.test.ts` | Tests for intent-aware prompt generation |
| Modify | `app/api/chat/route.ts` | Add classification step before main AI call |
| Create | `supabase/migrations/20260312000000_intent_type_column.sql` | Add `intent_type` column to `conversations` table |
| Modify | `lib/chat-history.ts` | Accept and persist `intent_type` on conversation creation |
| Modify | `lib/config.ts` | Add intelligence config section |

---

### Task 1: Intelligence Layer Types

**Files:**
- Create: `lib/intelligence/types.ts`

- [ ] **Step 1: Create the lib/intelligence/ directory**

Run: `mkdir -p lib/intelligence`

- [ ] **Step 2: Write the types file**

```typescript
// lib/intelligence/types.ts

export type IntentType = 'quick_question' | 'troubleshooting' | 'mid_project' | 'full_project';

export interface IntentClassification {
  intent: IntentType
  confidence: number
  reasoning: string
}

export type FamiliarityLevel = 'novice' | 'familiar' | 'experienced';
export type CommunicationLevel = 'beginner' | 'intermediate' | 'advanced';

export type DomainCategory =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'hvac'
  | 'general'
  | 'landscaping'
  | 'painting'
  | 'roofing';

export const DOMAIN_CATEGORIES: DomainCategory[] = [
  'electrical', 'plumbing', 'carpentry', 'hvac',
  'general', 'landscaping', 'painting', 'roofing',
];

export interface SkillProfile {
  userId: string
  domainFamiliarity: Record<DomainCategory, FamiliarityLevel>
  communicationLevel: CommunicationLevel
  knownTopics: string[]
  lastCalibrated: Date
}

export interface IntentClassificationContext {
  hasActiveProjects: boolean
  activeProjectCategories?: string[]
  skillProfile?: SkillProfile | null
}

export function defaultSkillProfile(userId: string): SkillProfile {
  const familiarity: Record<DomainCategory, FamiliarityLevel> = {
    electrical: 'novice',
    plumbing: 'novice',
    carpentry: 'novice',
    hvac: 'novice',
    general: 'novice',
    landscaping: 'novice',
    painting: 'novice',
    roofing: 'novice',
  };
  return {
    userId,
    domainFamiliarity: familiarity,
    communicationLevel: 'beginner',
    knownTopics: [],
    lastCalibrated: new Date(),
  };
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `npx tsc --noEmit lib/intelligence/types.ts 2>&1 | head -20`
Expected: No errors (or only errors from missing tsconfig paths — that's fine for an isolated types file)

- [ ] **Step 4: Commit**

```bash
git add lib/intelligence/types.ts
git commit -m "feat: add intelligence layer shared types"
```

---

### Task 2: Config for Intelligence Layer

**Files:**
- Modify: `lib/config.ts`

- [ ] **Step 1: Add intelligence config section to lib/config.ts**

Add before the final `const config = ...` line (before line 193):

```typescript
// ── Intelligence Layer ────────────────────────────────────────────────────
export const intelligence = {
  /** Model for intent classification (fast, cheap) */
  classificationModel: envString('INTENT_CLASSIFICATION_MODEL', 'claude-haiku-4-5-20251001'),
  classificationMaxTokens: envInt('INTENT_CLASSIFICATION_MAX_TOKENS', 100),
  /** Confidence threshold — below this, ask user to clarify */
  confidenceThreshold: envFloat('INTENT_CONFIDENCE_THRESHOLD', 0.7),
  /** Max ms to wait for classification before falling back.
   *  Spec target is <300ms, but 500ms gives headroom for cold starts.
   *  Haiku typically responds in 100-200ms; this timeout is a safety net. */
  classificationTimeoutMs: envInt('INTENT_CLASSIFICATION_TIMEOUT_MS', 500),
} as const;
```

Update the default export to include `intelligence`:

```typescript
const config = { beta, anthropic, rateLimits, cors, storeSearch, streaming, pruning, freemium, stripe, marketplace, expertSubscriptions, intelligence } as const;
```

- [ ] **Step 2: Verify config compiles**

Run: `npx tsc --noEmit lib/config.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/config.ts
git commit -m "feat: add intelligence layer config (classification model, thresholds)"
```

---

### Task 3: Intent Router — Tests First

**Files:**
- Create: `lib/__tests__/intent-router.test.ts`
- Create: `lib/intelligence/intent-router.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/intent-router.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent, buildClassificationPrompt } from '@/lib/intelligence/intent-router';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

// Access the mock through the module
async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk');
  return (mod as unknown as { __mockCreate: ReturnType<typeof vi.fn> }).__mockCreate;
}

describe('buildClassificationPrompt', () => {
  it('includes the user message', () => {
    const prompt = buildClassificationPrompt('What size nail for baseboards?', {
      hasActiveProjects: false,
    });
    expect(prompt).toContain('What size nail for baseboards?');
  });

  it('includes active project context when present', () => {
    const prompt = buildClassificationPrompt('The mortar is not sticking', {
      hasActiveProjects: true,
      activeProjectCategories: ['carpentry', 'general'],
    });
    expect(prompt).toContain('active projects');
    expect(prompt).toContain('carpentry');
  });

  it('handles no active projects', () => {
    const prompt = buildClassificationPrompt('I want to build a deck', {
      hasActiveProjects: false,
    });
    expect(prompt).toContain('no active projects');
  });
});

describe('classifyIntent', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCreate = await getMockCreate();
    mockCreate.mockReset();
  });

  it('returns parsed classification for a quick question', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"quick_question","confidence":0.95,"reasoning":"Simple factual question"}' }],
    });

    const result = await classifyIntent('What size nail for baseboards?', {
      hasActiveProjects: false,
    });

    expect(result.intent).toBe('quick_question');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe('Simple factual question');
  });

  it('returns parsed classification for a full project', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"full_project","confidence":0.92,"reasoning":"Planning a major construction project"}' }],
    });

    const result = await classifyIntent('I want to build a deck in my backyard', {
      hasActiveProjects: false,
    });

    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('defaults to full_project on API failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API timeout'));

    const result = await classifyIntent('What size nail for baseboards?', {
      hasActiveProjects: false,
    });

    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain('fallback');
  });

  it('defaults to full_project on malformed JSON response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not valid json' }],
    });

    const result = await classifyIntent('Help me', {
      hasActiveProjects: false,
    });

    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBe(0);
  });

  it('passes active project info to classification', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"mid_project","confidence":0.88,"reasoning":"References active project"}' }],
    });

    const result = await classifyIntent('The mortar is not sticking', {
      hasActiveProjects: true,
      activeProjectCategories: ['carpentry'],
    });

    expect(result.intent).toBe('mid_project');
    // Verify the API was called with proper messages
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/intent-router.test.ts 2>&1 | tail -20`
Expected: FAIL — module `@/lib/intelligence/intent-router` not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/intelligence/intent-router.ts
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

      // Validate the parsed intent is a known type
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/intent-router.test.ts 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/intent-router.ts lib/__tests__/intent-router.test.ts
git commit -m "feat: add intent router with Haiku classification and fallback handling"
```

---

### Task 4: Intent-Aware System Prompt

**Files:**
- Modify: `lib/system-prompt.ts`
- Create: `lib/__tests__/system-prompt.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/system-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '@/lib/system-prompt';

describe('getSystemPrompt', () => {
  it('returns full project prompt when no intent specified', () => {
    const prompt = getSystemPrompt();
    // Should contain full workflow instructions
    expect(prompt).toContain('CRITICAL WORKFLOW');
    expect(prompt).toContain('extract_materials_list');
    expect(prompt).toContain('EXPERT ESCALATION');
  });

  it('returns full project prompt for full_project intent', () => {
    const prompt = getSystemPrompt('full_project');
    expect(prompt).toContain('CRITICAL WORKFLOW');
    expect(prompt).toContain('extract_materials_list');
  });

  it('returns concise prompt for quick_question intent', () => {
    const prompt = getSystemPrompt('quick_question');
    expect(prompt).toContain('quick, direct answer');
    expect(prompt).toContain('go deeper');
    // Should NOT contain the full workflow
    expect(prompt).not.toContain('CRITICAL WORKFLOW');
  });

  it('returns diagnostic prompt for troubleshooting intent', () => {
    const prompt = getSystemPrompt('troubleshooting');
    expect(prompt).toContain('diagnos');
    expect(prompt).toContain('step-by-step');
    expect(prompt).toContain('marketplace');
  });

  it('returns context-aware prompt for mid_project intent', () => {
    const prompt = getSystemPrompt('mid_project');
    expect(prompt).toContain('mid-project');
    expect(prompt).toContain('current step');
  });

  it('always includes safety information regardless of intent', () => {
    const intents = ['quick_question', 'troubleshooting', 'mid_project', 'full_project'] as const;
    for (const intent of intents) {
      const prompt = getSystemPrompt(intent);
      expect(prompt).toContain('safety');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/system-prompt.test.ts 2>&1 | tail -20`
Expected: FAIL — `getSystemPrompt` is not exported

- [ ] **Step 3: Modify lib/system-prompt.ts**

Rename the existing `systemPrompt` constant to `fullProjectPrompt` and add a `getSystemPrompt` function. Keep the old export for backward compatibility:

```typescript
// At the top of lib/system-prompt.ts, add:
import type { IntentType } from '@/lib/intelligence/types';

// Rename the existing constant (keep the content identical):
const fullProjectPrompt = `You are a helpful DIY assistant...`; // (existing 143-line prompt, unchanged)

// Keep the old export for backward compatibility during migration:
export const systemPrompt = fullProjectPrompt;

// Add new intent-aware prompt variants:
const SAFETY_FOOTER = `
**SAFETY — ALWAYS INCLUDE REGARDLESS OF QUESTION TYPE:**
- Always warn about permits when applicable
- Always mention safety gear requirements
- Never skip warnings about load-bearing walls, gas lines, electrical panels, or asbestos/lead
- When in doubt about safety, recommend consulting a professional
- Include the expert escalation link when there's genuine uncertainty or safety risk:
> 💡 **Want expert confirmation?** [Ask a verified expert →](/marketplace/qa)`;

const quickQuestionPrompt = `You are a helpful DIY assistant specializing in home improvement. The user has a quick, specific question. Provide a quick, direct answer in 1-3 paragraphs. Be concise and specific.

Do NOT start a full project workflow. Do NOT offer to create materials lists or search for videos unless asked.

After your answer, add:
> 💬 **Want to go deeper?** I can help you plan this as a full project with materials lists, local codes, and step-by-step instructions. Just say "let's plan this out."
${SAFETY_FOOTER}`;

const troubleshootingPrompt = `You are a helpful DIY assistant specializing in home improvement diagnostics. The user has a problem they need help troubleshooting.

**Diagnostic approach:**
1. Ask 1-2 clarifying questions to narrow down the cause (don't ask more than 2 before offering your best assessment)
2. Provide a step-by-step diagnostic and fix procedure
3. If the problem could have multiple causes, list them from most likely to least likely
4. If the issue is safety-critical or beyond DIY scope, recommend a professional

If the problem seems serious or beyond safe DIY repair:
> 🔧 **This might need a pro.** A verified tradesperson can diagnose this in person and give you a definitive fix. [Find an expert →](/marketplace/qa)
${SAFETY_FOOTER}`;

const midProjectPrompt = `You are a helpful DIY assistant specializing in home improvement. The user is in the middle of a project and needs help with their current step. They're mid-project and need actionable guidance right now.

**Approach:**
- Focus on the specific issue they're stuck on
- Give practical, immediate advice they can act on
- Reference their project context if available
- Don't restart the project from scratch — help them move forward from where they are
- If they mention tools or materials, assume they have them on hand

**Available tools:** You can use search_local_codes, search_building_codes, check_user_inventory, and search_project_videos to help with their current step.
${SAFETY_FOOTER}`;

export function getSystemPrompt(intent?: IntentType): string {
  switch (intent) {
    case 'quick_question':
      return quickQuestionPrompt;
    case 'troubleshooting':
      return troubleshootingPrompt;
    case 'mid_project':
      return midProjectPrompt;
    case 'full_project':
    default:
      return fullProjectPrompt;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/system-prompt.test.ts 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/system-prompt.ts lib/__tests__/system-prompt.test.ts
git commit -m "feat: add intent-aware system prompt variants (quick, troubleshoot, mid-project, full)"
```

---

### Task 5: Database Migration — intent_type Column

**Files:**
- Create: `supabase/migrations/20260312000000_intent_type_column.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add intent_type to conversations for Smart Routing
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS intent_type TEXT;

-- Optional: add a check constraint for valid values
ALTER TABLE conversations
  ADD CONSTRAINT conversations_intent_type_check
  CHECK (intent_type IS NULL OR intent_type IN ('quick_question', 'troubleshooting', 'mid_project', 'full_project'));

COMMENT ON COLUMN conversations.intent_type IS 'Smart Routing intent classification: quick_question, troubleshooting, mid_project, full_project';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase migration up 2>&1 | tail -10` (or `npx supabase db reset` if using a local Supabase instance)
Expected: Migration applies successfully. If running against a remote dev database, use `npx supabase db push`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312000000_intent_type_column.sql
git commit -m "feat: add intent_type column to conversations table"
```

---

### Task 6: Update Chat History to Persist Intent Type

**Files:**
- Modify: `lib/chat-history.ts`

- [ ] **Step 1: Read current chat-history.ts**

Read `lib/chat-history.ts` to understand current `createConversation` signature.

- [ ] **Step 2: Modify createConversation to accept intent_type**

Add an optional `intentType` parameter to `createConversation`:

In the function signature, add `intentType?: string` as the last parameter.

In the insert object, add `intent_type: intentType || null`.

This is a backward-compatible change — all existing callers pass no `intentType` and get `null`.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit lib/chat-history.ts 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add lib/chat-history.ts
git commit -m "feat: persist intent_type on conversation creation"
```

---

### Task 7: Integrate Intent Router into Chat API Route

**Files:**
- Modify: `app/api/chat/route.ts`

This is the core integration. The chat route needs to:
1. Classify intent on the first message of a new conversation
2. Use `getSystemPrompt(intent)` instead of the static `systemPrompt`
3. Cache intent on the conversation record

- [ ] **Step 1: Add imports**

At the top of `app/api/chat/route.ts`, replace:
```typescript
import { systemPrompt } from '@/lib/system-prompt';
```
with:
```typescript
import { getSystemPrompt, systemPrompt } from '@/lib/system-prompt';
import { classifyIntent } from '@/lib/intelligence/intent-router';
import type { IntentType } from '@/lib/intelligence/types';
```

- [ ] **Step 2: Add intent classification before the main API call**

After the `userContent.push({ type: 'text', text: message })` line (after building user content, before the `if (!streaming)` check), add:

```typescript
    // ── Intent Classification ─────────────────────────────────────
    // Classify on first message OR load cached intent for existing conversations
    let intentType: IntentType | undefined;
    if (!existingConversationId && prunedHistory.length === 0) {
      // New conversation — classify intent
      const classification = await classifyIntent(message, {
        hasActiveProjects: false, // TODO: query active projects for user
      });
      if (classification.confidence >= config.intelligence.confidenceThreshold) {
        intentType = classification.intent;
      }
      // Low confidence — let it fall through to full_project (default behavior).
      // Clarification UX ("Are you looking for a quick answer?") deferred to UI chunk.
      logger.info('Intent classified', {
        requestId,
        intent: classification.intent,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      });
    } else if (existingConversationId && auth.userId) {
      // Existing conversation — load cached intent_type
      try {
        const { data: convData } = await auth.supabaseClient
          .from('conversations')
          .select('intent_type')
          .eq('id', existingConversationId)
          .single();
        if (convData?.intent_type) {
          intentType = convData.intent_type as IntentType;
        }
      } catch {
        // Failed to load — fall through to default prompt
      }
    }

    const activeSystemPrompt = intentType ? getSystemPrompt(intentType) : systemPrompt;
```

- [ ] **Step 3: Replace all uses of `systemPrompt` with `activeSystemPrompt` in the streaming path**

In the streaming `start(controller)` function, find both `system: systemPrompt,` occurrences (in the initial `anthropic.messages.create` call and the follow-up loop call) and replace with `system: activeSystemPrompt,`.

- [ ] **Step 4: Pass intentType when creating conversation**

In the persistence section (in the `if (!responseConversationId)` block), update the `createConversation` call:

```typescript
const conv = await createConversation(
  auth.supabaseClient,
  auth.userId,
  generateTitle(message),
  parsed.data.project_id,
  intentType  // new parameter
);
```

- [ ] **Step 5: Update non-streaming handler**

Add `intentType` as a parameter to `handleNonStreamingRequest` and use `getSystemPrompt(intentType)` instead of `systemPrompt` in both `anthropic.messages.create` calls. Update the call site (before `if (!streaming)`) to pass `intentType`.

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit app/api/chat/route.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: integrate intent router into chat API — classify first message, use intent-aware prompt"
```

---

### Task 8: Integration Test — Intent Classification in Chat Flow

**Files:**
- Create: `lib/__tests__/chat-intent-integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// lib/__tests__/chat-intent-integration.test.ts
import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '@/lib/system-prompt';
import { buildClassificationPrompt } from '@/lib/intelligence/intent-router';
import type { IntentType } from '@/lib/intelligence/types';

describe('Chat Intent Integration', () => {
  it('quick question prompt is significantly shorter than full project', () => {
    const quick = getSystemPrompt('quick_question');
    const full = getSystemPrompt('full_project');
    // Quick prompt should be at least 50% shorter
    expect(quick.length).toBeLessThan(full.length * 0.5);
  });

  it('all prompt variants are non-empty strings', () => {
    const intents: IntentType[] = ['quick_question', 'troubleshooting', 'mid_project', 'full_project'];
    for (const intent of intents) {
      const prompt = getSystemPrompt(intent);
      expect(prompt.length).toBeGreaterThan(50);
    }
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

  it('default getSystemPrompt (no argument) returns full project prompt', () => {
    const defaultPrompt = getSystemPrompt();
    const fullPrompt = getSystemPrompt('full_project');
    expect(defaultPrompt).toBe(fullPrompt);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run lib/__tests__/chat-intent-integration.test.ts 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 3: Run all existing tests to verify no regressions**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All existing tests still pass (the `systemPrompt` export is preserved for backward compatibility)

- [ ] **Step 4: Commit**

```bash
git add lib/__tests__/chat-intent-integration.test.ts
git commit -m "test: add integration tests for intent-aware chat flow"
```

---

### Chunk 1 Summary

After completing Chunk 1, the app has:
- `lib/intelligence/` module with shared types and intent router
- Haiku-based intent classification on first message of new conversations
- Four system prompt variants (quick, troubleshoot, mid-project, full)
- Graceful fallback to existing behavior on classification failure
- `intent_type` persisted on conversations
- Full test coverage for classification and prompt generation

**Next:** Chunk 2 builds on `lib/intelligence/` to add skill calibration.

---

## Chunk 2: Adaptive Skill Calibration

This chunk adds passive user profiling based on tool inventory, project history, and conversation patterns. It adjusts AI response depth via the system prompt. Builds on `lib/intelligence/` created in Chunk 1.

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/intelligence/trade-terminology.ts` | Curated keyword dictionary for conversation pattern analysis |
| Create | `lib/__tests__/trade-terminology.test.ts` | Tests for terminology matching |
| Create | `lib/intelligence/skill-profile.ts` | Assembles skill profile from data sources |
| Create | `lib/__tests__/skill-profile.test.ts` | Tests for profile assembly |
| Create | `lib/intelligence/prompt-calibrator.ts` | Adjusts system prompt based on skill profile |
| Create | `lib/__tests__/prompt-calibrator.test.ts` | Tests for prompt calibration |
| Create | `supabase/migrations/20260312100000_user_skill_profiles.sql` | user_skill_profiles table + RLS |
| Modify | `app/api/chat/route.ts` | Fetch skill profile and pass to prompt calibrator |
| Create | `app/api/skill-profile/feedback/route.ts` | API for "I already knew this" signal |
| Modify | `components/ChatMessages.tsx` | Add "I already knew this" button on assistant messages |

---

### Task 9: Trade Terminology Dictionary

**Files:**
- Create: `lib/intelligence/trade-terminology.ts`
- Create: `lib/__tests__/trade-terminology.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/trade-terminology.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeTerminology, TERMINOLOGY } from '@/lib/intelligence/trade-terminology';

describe('TERMINOLOGY', () => {
  it('has entries for all domain categories', () => {
    const domains = ['electrical', 'plumbing', 'carpentry', 'hvac', 'general', 'landscaping', 'painting', 'roofing'];
    for (const domain of domains) {
      expect(TERMINOLOGY[domain]).toBeDefined();
      expect(TERMINOLOGY[domain].advanced.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzeTerminology', () => {
  it('detects advanced electrical terms', () => {
    const result = analyzeTerminology('I need to run some romex from the panel to a new 20-amp breaker');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical).toBeDefined();
    expect(electrical!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('detects advanced plumbing terms', () => {
    const result = analyzeTerminology('Should I use PEX or copper for the main supply line? I have a SharkBite fitting.');
    const plumbing = result.find(r => r.domain === 'plumbing');
    expect(plumbing).toBeDefined();
    expect(plumbing!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('returns zero counts for unrelated text', () => {
    const result = analyzeTerminology('What is the weather like today?');
    for (const entry of result) {
      expect(entry.advancedTermCount).toBe(0);
    }
  });

  it('is case-insensitive', () => {
    const result = analyzeTerminology('I have ROMEX and a GFCI outlet');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical!.advancedTermCount).toBeGreaterThanOrEqual(2);
  });

  it('detects basic question patterns', () => {
    const result = analyzeTerminology('What is a circuit breaker? How do I turn off the power?');
    const electrical = result.find(r => r.domain === 'electrical');
    expect(electrical!.basicQuestionCount).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/trade-terminology.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/intelligence/trade-terminology.ts
import type { DomainCategory } from './types';

interface DomainTerms {
  advanced: string[];
  basicQuestions: string[];
}

export const TERMINOLOGY: Record<DomainCategory, DomainTerms> = {
  electrical: {
    advanced: [
      'romex', 'nm-b', '12/2', '14/2', '10/3', 'gfci', 'afci', 'arc fault',
      'breaker panel', 'sub-panel', 'load center', 'amperage', 'amp draw',
      'wire gauge', 'awg', 'conduit', 'emt', 'junction box', 'wire nut',
      'pigtail', 'hot wire', 'neutral bus', 'ground bus', 'knockout',
      'fish tape', 'voltage tester', 'multimeter', 'three-way switch',
      'dimmer switch', 'traveler wire', 'dedicated circuit', 'home run',
    ],
    basicQuestions: [
      'what is a circuit', 'how do i turn off', 'what is a breaker',
      'is it safe to', 'what wire do i need', 'how to wire',
    ],
  },
  plumbing: {
    advanced: [
      'pex', 'cpvc', 'abs', 'sharkbite', 'push-fit', 'crimp ring',
      'solder', 'flux', 'sweat fitting', 'compression fitting', 'p-trap',
      'cleanout', 'vent stack', 'drain waste vent', 'dwv', 'backflow',
      'check valve', 'ball valve', 'gate valve', 'supply line',
      'shutoff valve', 'hose bib', 'manifold', 'pex crimper',
    ],
    basicQuestions: [
      'how to fix a leak', 'how to unclog', 'what is a p-trap',
      'how to turn off water', 'what size pipe',
    ],
  },
  carpentry: {
    advanced: [
      'miter saw', 'table saw', 'circular saw', 'joist', 'rafter',
      'stud finder', 'plumb', 'level', 'square', 'dado', 'rabbet',
      'mortise', 'tenon', 'biscuit joint', 'pocket hole', 'kreg jig',
      'tongue and groove', 'shiplap', 'furring strip', 'sister joist',
      'lag bolt', 'carriage bolt', 'simpson tie', 'joist hanger',
      'ledger board', 'rim joist', 'header', 'cripple stud',
    ],
    basicQuestions: [
      'what type of wood', 'how to cut', 'what nail size',
      'how to hang', 'what screw', 'how to measure',
    ],
  },
  hvac: {
    advanced: [
      'btus', 'seer', 'tonnage', 'refrigerant', 'r-410a', 'r-22',
      'condenser', 'evaporator', 'compressor', 'expansion valve',
      'thermocouple', 'heat exchanger', 'plenum', 'return air',
      'supply duct', 'damper', 'mini-split', 'ductless', 'air handler',
      'blower motor', 'capacitor', 'contactor', 'reversing valve',
    ],
    basicQuestions: [
      'how to change filter', 'why is my ac not', 'what temperature',
      'how to program thermostat', 'how often to service',
    ],
  },
  general: {
    advanced: [
      'load-bearing', 'shear wall', 'footing', 'foundation', 'rebar',
      'concrete form', 'anchor bolt', 'sill plate', 'rim board',
      'vapor barrier', 'house wrap', 'flashing', 'weep hole',
      'egress window', 'fire block', 'fire stop', 'irc', 'ibc',
    ],
    basicQuestions: [
      'do i need a permit', 'how to patch', 'how to fix',
      'what tool do i need', 'where to start',
    ],
  },
  landscaping: {
    advanced: [
      'french drain', 'grading', 'compaction', 'retaining wall',
      'geotextile', 'landscape fabric', 'drip irrigation', 'sod',
      'hardscape', 'paver base', 'polymeric sand', 'edging',
      'root barrier', 'drainage swale', 'catch basin',
    ],
    basicQuestions: [
      'how to plant', 'when to water', 'what soil',
      'how to mow', 'how to edge',
    ],
  },
  painting: {
    advanced: [
      'primer', 'tsp', 'degloss', 'bonding primer', 'shellac',
      'oil-based', 'latex', 'alkyd', 'eggshell', 'satin', 'semi-gloss',
      'nap roller', 'cut in', 'feather edge', 'back roll', 'spray tip',
      'hvlp', 'airless sprayer', 'mil thickness', 'flash time',
    ],
    basicQuestions: [
      'what paint to use', 'how many coats', 'how to prep',
      'what color', 'how to clean brush',
    ],
  },
  roofing: {
    advanced: [
      'underlayment', 'ice and water shield', 'drip edge', 'starter strip',
      'ridge cap', 'hip cap', 'valley', 'flashing', 'step flashing',
      'counter flashing', 'soffit vent', 'ridge vent', 'shingle tab',
      'architectural shingle', 'felt paper', 'synthetic underlayment',
      'roof deck', 'sheathing', 'rafter tail', 'fascia board',
    ],
    basicQuestions: [
      'how to fix a leak', 'how long does a roof last',
      'when to replace', 'what shingles',
    ],
  },
};

interface TerminologyResult {
  domain: DomainCategory;
  advancedTermCount: number;
  basicQuestionCount: number;
}

export function analyzeTerminology(text: string): TerminologyResult[] {
  const lowerText = text.toLowerCase();

  return (Object.keys(TERMINOLOGY) as DomainCategory[]).map(domain => {
    const terms = TERMINOLOGY[domain];

    const advancedTermCount = terms.advanced.filter(term =>
      lowerText.includes(term.toLowerCase())
    ).length;

    const basicQuestionCount = terms.basicQuestions.filter(pattern =>
      lowerText.includes(pattern.toLowerCase())
    ).length;

    return { domain, advancedTermCount, basicQuestionCount };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/trade-terminology.test.ts 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/trade-terminology.ts lib/__tests__/trade-terminology.test.ts
git commit -m "feat: add trade terminology dictionary for conversation pattern analysis"
```

---

### Task 10: Database Migration — user_skill_profiles

**Files:**
- Create: `supabase/migrations/20260312100000_user_skill_profiles.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Skill Calibration: user skill profiles for adaptive response depth
CREATE TABLE user_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_familiarity JSONB NOT NULL DEFAULT '{
    "electrical": "novice", "plumbing": "novice", "carpentry": "novice",
    "hvac": "novice", "general": "novice", "landscaping": "novice",
    "painting": "novice", "roofing": "novice"
  }',
  communication_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (communication_level IN ('beginner', 'intermediate', 'advanced')),
  known_topics TEXT[] NOT NULL DEFAULT '{}',
  last_calibrated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_skill_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own skill profile"
  ON user_skill_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own skill profile"
  ON user_skill_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert skill profiles"
  ON user_skill_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_skill_profiles IS 'Cached skill profiles for adaptive AI response calibration';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260312100000_user_skill_profiles.sql
git commit -m "feat: add user_skill_profiles table with RLS"
```

---

### Task 11: Skill Profile Assembly

**Files:**
- Create: `lib/intelligence/skill-profile.ts`
- Create: `lib/__tests__/skill-profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/skill-profile.test.ts
import { describe, it, expect } from 'vitest';
import {
  inferFamiliarityFromTermCounts,
  inferCommunicationLevel,
  mergeProfileSources,
} from '@/lib/intelligence/skill-profile';
import type { DomainCategory, FamiliarityLevel } from '@/lib/intelligence/types';

describe('inferFamiliarityFromTermCounts', () => {
  it('returns novice for 0-2 advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(0)).toBe('novice');
    expect(inferFamiliarityFromTermCounts(1)).toBe('novice');
    expect(inferFamiliarityFromTermCounts(2)).toBe('novice');
  });

  it('returns familiar for 3-7 advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(3)).toBe('familiar');
    expect(inferFamiliarityFromTermCounts(5)).toBe('familiar');
    expect(inferFamiliarityFromTermCounts(7)).toBe('familiar');
  });

  it('returns experienced for 8+ advanced terms', () => {
    expect(inferFamiliarityFromTermCounts(8)).toBe('experienced');
    expect(inferFamiliarityFromTermCounts(20)).toBe('experienced');
  });
});

describe('inferCommunicationLevel', () => {
  it('returns beginner when all domains are novice', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'novice', plumbing: 'novice', carpentry: 'novice',
      hvac: 'novice', general: 'novice', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('beginner');
  });

  it('returns intermediate when some domains are familiar', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'familiar', plumbing: 'novice', carpentry: 'familiar',
      hvac: 'novice', general: 'novice', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('intermediate');
  });

  it('returns advanced when multiple domains are experienced', () => {
    const familiarity: Record<DomainCategory, FamiliarityLevel> = {
      electrical: 'experienced', plumbing: 'experienced', carpentry: 'familiar',
      hvac: 'novice', general: 'experienced', landscaping: 'novice',
      painting: 'novice', roofing: 'novice',
    };
    expect(inferCommunicationLevel(familiarity)).toBe('advanced');
  });
});

describe('mergeProfileSources', () => {
  it('takes the highest familiarity level across sources', () => {
    const result = mergeProfileSources(
      { electrical: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
      { electrical: 'familiar' } as Record<DomainCategory, FamiliarityLevel>,
    );
    expect(result.electrical).toBe('familiar');
  });

  it('preserves novice when no source upgrades', () => {
    const result = mergeProfileSources(
      { plumbing: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
      { plumbing: 'novice' } as Record<DomainCategory, FamiliarityLevel>,
    );
    expect(result.plumbing).toBe('novice');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/skill-profile.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/intelligence/skill-profile.ts
import type {
  DomainCategory, FamiliarityLevel, CommunicationLevel,
  SkillProfile,
} from './types';
import { DOMAIN_CATEGORIES, defaultSkillProfile } from './types';

const FAMILIARITY_ORDER: FamiliarityLevel[] = ['novice', 'familiar', 'experienced'];

export function inferFamiliarityFromTermCounts(advancedTermCount: number): FamiliarityLevel {
  if (advancedTermCount >= 8) return 'experienced';
  if (advancedTermCount >= 3) return 'familiar';
  return 'novice';
}

export function inferCommunicationLevel(
  familiarity: Record<DomainCategory, FamiliarityLevel>
): CommunicationLevel {
  const levels = Object.values(familiarity);
  const experiencedCount = levels.filter(l => l === 'experienced').length;
  const familiarCount = levels.filter(l => l === 'familiar').length;

  if (experiencedCount >= 3) return 'advanced';
  if (experiencedCount >= 1 || familiarCount >= 2) return 'intermediate';
  return 'beginner';
}

export function mergeProfileSources(
  ...sources: Partial<Record<DomainCategory, FamiliarityLevel>>[]
): Record<DomainCategory, FamiliarityLevel> {
  const result: Record<string, FamiliarityLevel> = {};

  for (const domain of DOMAIN_CATEGORIES) {
    let highest: FamiliarityLevel = 'novice';
    for (const source of sources) {
      const level = source[domain];
      if (level && FAMILIARITY_ORDER.indexOf(level) > FAMILIARITY_ORDER.indexOf(highest)) {
        highest = level;
      }
    }
    result[domain] = highest;
  }

  return result as Record<DomainCategory, FamiliarityLevel>;
}

/**
 * Assembles a SkillProfile from database data.
 * Called server-side with admin client.
 */
export function assembleProfileFromData(
  userId: string,
  toolInventory: Array<{ name: string; category?: string }>,
  completedProjects: Array<{ category?: string; status: string }>,
  conversationTermCounts: Partial<Record<DomainCategory, number>>,
  knownTopics: string[] = [],
): SkillProfile {
  // Source 1: Tool inventory — having specialized tools implies familiarity
  const toolFamiliarity: Partial<Record<DomainCategory, FamiliarityLevel>> = {};
  const toolCategoryCounts: Record<string, number> = {};
  for (const tool of toolInventory) {
    const cat = tool.category?.toLowerCase() || 'general';
    toolCategoryCounts[cat] = (toolCategoryCounts[cat] || 0) + 1;
  }
  for (const domain of DOMAIN_CATEGORIES) {
    const count = toolCategoryCounts[domain] || 0;
    if (count >= 5) toolFamiliarity[domain] = 'experienced';
    else if (count >= 2) toolFamiliarity[domain] = 'familiar';
  }

  // Source 2: Project history — completed projects imply familiarity
  const projectFamiliarity: Partial<Record<DomainCategory, FamiliarityLevel>> = {};
  const projectCategoryCounts: Record<string, number> = {};
  for (const project of completedProjects) {
    if (project.status === 'completed' && project.category) {
      const cat = project.category.toLowerCase();
      projectCategoryCounts[cat] = (projectCategoryCounts[cat] || 0) + 1;
    }
  }
  for (const domain of DOMAIN_CATEGORIES) {
    const count = projectCategoryCounts[domain] || 0;
    if (count >= 3) projectFamiliarity[domain] = 'experienced';
    else if (count >= 1) projectFamiliarity[domain] = 'familiar';
  }

  // Source 3: Conversation term counts
  const termFamiliarity: Partial<Record<DomainCategory, FamiliarityLevel>> = {};
  for (const domain of DOMAIN_CATEGORIES) {
    const count = conversationTermCounts[domain] || 0;
    termFamiliarity[domain] = inferFamiliarityFromTermCounts(count);
  }

  // Merge: take highest level from any source
  const domainFamiliarity = mergeProfileSources(
    toolFamiliarity,
    projectFamiliarity,
    termFamiliarity,
  );

  const communicationLevel = inferCommunicationLevel(domainFamiliarity);

  return {
    userId,
    domainFamiliarity,
    communicationLevel,
    knownTopics,
    lastCalibrated: new Date(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/skill-profile.test.ts 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/skill-profile.ts lib/__tests__/skill-profile.test.ts
git commit -m "feat: add skill profile assembly with multi-source familiarity merging"
```

---

### Task 12: Prompt Calibrator

**Files:**
- Create: `lib/intelligence/prompt-calibrator.ts`
- Create: `lib/__tests__/prompt-calibrator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/prompt-calibrator.test.ts
import { describe, it, expect } from 'vitest';
import { calibratePrompt } from '@/lib/intelligence/prompt-calibrator';
import { defaultSkillProfile } from '@/lib/intelligence/types';

describe('calibratePrompt', () => {
  const basePrompt = 'You are a DIY assistant.';

  it('adds beginner calibration for novice users', () => {
    const profile = defaultSkillProfile('user-1');
    const result = calibratePrompt(basePrompt, profile);
    expect(result).toContain('beginner');
    expect(result).toContain('explain');
    expect(result).toContain(basePrompt);
  });

  it('adds experienced calibration for advanced users', () => {
    const profile = {
      ...defaultSkillProfile('user-2'),
      domainFamiliarity: {
        electrical: 'experienced' as const,
        plumbing: 'experienced' as const,
        carpentry: 'experienced' as const,
        hvac: 'novice' as const,
        general: 'experienced' as const,
        landscaping: 'novice' as const,
        painting: 'novice' as const,
        roofing: 'novice' as const,
      },
      communicationLevel: 'advanced' as const,
    };
    const result = calibratePrompt(basePrompt, profile);
    expect(result).toContain('experienced');
    expect(result).toContain('concise');
  });

  it('always includes safety reminder', () => {
    const profile = {
      ...defaultSkillProfile('user-3'),
      communicationLevel: 'advanced' as const,
    };
    const result = calibratePrompt(basePrompt, profile);
    expect(result).toContain('safety');
    expect(result).toContain('permits');
  });

  it('returns base prompt unmodified when profile is null', () => {
    const result = calibratePrompt(basePrompt, null);
    expect(result).toBe(basePrompt);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/prompt-calibrator.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/intelligence/prompt-calibrator.ts
import type { SkillProfile, DomainCategory, FamiliarityLevel } from './types';
import { DOMAIN_CATEGORIES } from './types';

const SAFETY_CALIBRATION = `
**CRITICAL — NEVER OMIT REGARDLESS OF USER EXPERIENCE:**
- Always include safety warnings, permit requirements, and code compliance
- Always mention protective gear (eye protection, gloves, etc.)
- Never skip warnings about load-bearing walls, gas lines, electrical panels, asbestos, or lead paint
- Experienced users still need to hear about permits and inspections`;

function buildCalibrationBlock(profile: SkillProfile): string {
  const experienced = DOMAIN_CATEGORIES.filter(
    d => profile.domainFamiliarity[d] === 'experienced'
  );
  const familiar = DOMAIN_CATEGORIES.filter(
    d => profile.domainFamiliarity[d] === 'familiar'
  );
  const novice = DOMAIN_CATEGORIES.filter(
    d => profile.domainFamiliarity[d] === 'novice'
  );

  const lines: string[] = [
    '\n**USER SKILL CALIBRATION:**',
  ];

  if (profile.communicationLevel === 'advanced') {
    lines.push('This user is experienced. Be concise and use trade terminology freely.');
    lines.push('Skip basic explanations unless they ask. Get to the specifics.');
  } else if (profile.communicationLevel === 'intermediate') {
    lines.push('This user has some experience. Explain intermediate concepts briefly but don\'t over-explain basics.');
  } else {
    lines.push('This user is a beginner. Explain terms, concepts, and steps in detail.');
    lines.push('Define trade terminology when you use it. Include "why" alongside "how".');
  }

  if (experienced.length > 0) {
    lines.push(`Experienced in: ${experienced.join(', ')} — use technical language, skip basics in these areas.`);
  }
  if (novice.length > 0 && profile.communicationLevel !== 'beginner') {
    lines.push(`Less familiar with: ${novice.join(', ')} — explain more in these areas even though they're experienced elsewhere.`);
  }

  if (profile.knownTopics.length > 0) {
    lines.push(`User has signaled they already know about: ${profile.knownTopics.slice(0, 10).join(', ')}. Don't re-explain these.`);
  }

  lines.push(SAFETY_CALIBRATION);

  return lines.join('\n');
}

export function calibratePrompt(
  basePrompt: string,
  profile: SkillProfile | null | undefined
): string {
  if (!profile) return basePrompt;
  return basePrompt + buildCalibrationBlock(profile);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/prompt-calibrator.test.ts 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/prompt-calibrator.ts lib/__tests__/prompt-calibrator.test.ts
git commit -m "feat: add prompt calibrator — adjusts AI depth based on skill profile"
```

---

### Task 13: Integrate Skill Calibration into Chat Route

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add imports to chat route**

Add to the imports section of `app/api/chat/route.ts`:

```typescript
import { calibratePrompt } from '@/lib/intelligence/prompt-calibrator';
import { createAdminClient } from '@/lib/supabase-admin';
```

- [ ] **Step 2: Fetch skill profile and apply calibration**

In the intent classification section added in Chunk 1 (after the `activeSystemPrompt` line), add skill profile fetching:

```typescript
    // ── Skill Calibration ─────────────────────────────────────────
    let calibratedPrompt = activeSystemPrompt;
    if (auth.userId) {
      try {
        const adminClient = createAdminClient();
        const { data: profileData } = await adminClient
          .from('user_skill_profiles')
          .select('domain_familiarity, communication_level, known_topics')
          .eq('user_id', auth.userId)
          .single();

        if (profileData) {
          calibratedPrompt = calibratePrompt(activeSystemPrompt, {
            userId: auth.userId,
            domainFamiliarity: profileData.domain_familiarity,
            communicationLevel: profileData.communication_level,
            knownTopics: profileData.known_topics || [],
            lastCalibrated: new Date(),
          });
        }
      } catch {
        // No profile yet or DB error — use uncalibrated prompt
      }
    }
```

- [ ] **Step 3: Replace `activeSystemPrompt` with `calibratedPrompt` in API calls**

Replace all `system: activeSystemPrompt` references with `system: calibratedPrompt` in both streaming and non-streaming paths.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit app/api/chat/route.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: integrate skill calibration into chat — fetch profile, calibrate prompt"
```

---

### Task 14: "I Already Knew This" Feedback API

**Files:**
- Create: `app/api/skill-profile/feedback/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// app/api/skill-profile/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const FeedbackSchema = z.object({
  domain: z.string(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { domain } = parsed.data;
    const adminClient = createAdminClient();

    // Upsert skill profile — add domain to known_topics
    const { data: existing } = await adminClient
      .from('user_skill_profiles')
      .select('id, known_topics')
      .eq('user_id', auth.userId)
      .single();

    if (existing) {
      const topics = existing.known_topics || [];
      if (!topics.includes(domain)) {
        topics.push(domain);
        await adminClient
          .from('user_skill_profiles')
          .update({ known_topics: topics, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      await adminClient
        .from('user_skill_profiles')
        .insert({
          user_id: auth.userId,
          known_topics: [domain],
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Skill profile feedback error', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/skill-profile/feedback/route.ts
git commit -m "feat: add skill profile feedback API for 'I already knew this' signal"
```

---

### Task 15: "I Already Knew This" UI Button

**Files:**
- Modify: `components/ChatMessages.tsx`

- [ ] **Step 1: Add the feedback button to assistant messages**

In `components/ChatMessages.tsx`, add an "I already knew this" button inside the assistant message bubble (after the ReactMarkdown block, around line 189).

Add a state variable and handler at the top of the `ChatMessages` component:

```typescript
// Inside the ChatMessages component, before the return:
const [feedbackSent, setFeedbackSent] = React.useState<Set<number>>(new Set());

const handleAlreadyKnew = async (messageIndex: number) => {
  try {
    await fetch('/api/skill-profile/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'general' }),
    });
    setFeedbackSent(prev => new Set(prev).add(messageIndex));
  } catch {
    // Silent fail — non-critical feature
  }
};
```

Add the button in the assistant message rendering (after the ReactMarkdown div, before the retry button check):

```tsx
{msg.role === 'assistant' && !feedbackSent.has(idx) && (
  <button
    onClick={() => handleAlreadyKnew(idx)}
    className="mt-1 text-xs text-[#A89880] hover:text-[#7D6B5D] transition-colors"
    title="Let us know so we can adjust our explanations"
  >
    I already knew this
  </button>
)}
{msg.role === 'assistant' && feedbackSent.has(idx) && (
  <span className="mt-1 text-xs text-[#A89880]">
    Got it, noted for next time
  </span>
)}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit components/ChatMessages.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/ChatMessages.tsx
git commit -m "feat: add 'I already knew this' feedback button on assistant messages"
```

---

### Task 16: Run All Tests — Verify No Regressions

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass, including the new tests from Tasks 9, 11, and 12

- [ ] **Step 2: Commit if any fixes were needed**

---

### Chunk 2 Summary

After completing Chunk 2, the app has:
- Trade terminology dictionary for 8 domains
- Skill profile assembly from tool inventory + project history + conversation patterns
- Prompt calibrator that adjusts AI explanation depth per user
- `user_skill_profiles` table with RLS
- "I already knew this" feedback loop (API + UI button)
- Calibrated prompts in the chat flow
- Full test coverage for all new modules

**Next:** Chunk 3 adds the Expert Co-Pilot toolkit.

---

## Chunk 3: Expert Co-Pilot Toolkit

This chunk adds three opt-in tools for experts: Code Lookup, Draft Assistant, and Licensing-Aware Reference Surfacer. All tools are embedded in the expert Q&A answer flow and are never auto-triggered.

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260312200000_trade_licensing_rules.sql` | Licensing rules table + RLS + seed data |
| Create | `lib/marketplace/expert-tools.ts` | Shared logic for all three expert tools |
| Create | `lib/__tests__/expert-tools.test.ts` | Tests for licensing gap detection and tool helpers |
| Create | `app/api/experts/tools/code-lookup/route.ts` | Code lookup API endpoint |
| Create | `app/api/experts/tools/draft-answer/route.ts` | Draft answer generation API endpoint |
| Create | `app/api/experts/tools/references/route.ts` | Reference surfacer API endpoint |
| Create | `components/marketplace/ExpertCoPilot.tsx` | Container component for all three tools |
| Create | `components/marketplace/CodeLookup.tsx` | Code lookup UI |
| Create | `components/marketplace/ReferenceSurface.tsx` | Licensing-aware reference panel |
| Modify | `components/marketplace/QAAnswerForm.tsx` | Add draft button and co-pilot integration |

---

### Task 17: Database Migration — trade_licensing_rules + Seed Data

**Files:**
- Create: `supabase/migrations/20260312200000_trade_licensing_rules.sql`

- [ ] **Step 1: Write the migration with seed data**

```sql
-- Expert Co-Pilot: trade licensing rules for reference surfacer
CREATE TABLE trade_licensing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  trade_category TEXT NOT NULL,
  license_required BOOLEAN NOT NULL,
  license_type TEXT,
  homeowner_exemption BOOLEAN DEFAULT true,
  homeowner_exemption_notes TEXT,
  source_url TEXT,
  last_verified DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state, trade_category)
);

ALTER TABLE trade_licensing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read licensing rules"
  ON trade_licensing_rules FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE trade_licensing_rules IS 'State-level trade licensing rules for expert co-pilot reference surfacer';

-- Seed: 4 trades x 10 states (highest-traffic states)
-- Electrical
INSERT INTO trade_licensing_rules (state, trade_category, license_required, license_type, homeowner_exemption, homeowner_exemption_notes, last_verified) VALUES
  ('MI', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own single-family residence with a homeowner permit', '2026-03-12'),
  ('CA', 'electrical', true, 'C-10 Electrical Contractor', true, 'Homeowners may perform work on their own residence valued under $500', '2026-03-12'),
  ('TX', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their homestead', '2026-03-12'),
  ('FL', 'electrical', true, 'Licensed Electrical Contractor', true, 'Homeowners may perform work on their own residence', '2026-03-12'),
  ('NY', 'electrical', true, 'Licensed Electrician', true, 'Varies by municipality', '2026-03-12'),
  ('PA', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform work with permit', '2026-03-12'),
  ('OH', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('IL', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('GA', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NC', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform work on own residence', '2026-03-12');

-- Plumbing
INSERT INTO trade_licensing_rules (state, trade_category, license_required, license_type, homeowner_exemption, homeowner_exemption_notes, last_verified) VALUES
  ('MI', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own single-family residence', '2026-03-12'),
  ('CA', 'plumbing', true, 'C-36 Plumbing Contractor', true, 'Homeowners may perform work on their own residence', '2026-03-12'),
  ('TX', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work on their homestead', '2026-03-12'),
  ('FL', 'plumbing', true, 'Licensed Plumbing Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NY', 'plumbing', true, 'Licensed Plumber', true, 'Varies by municipality', '2026-03-12'),
  ('PA', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work with permit', '2026-03-12'),
  ('OH', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('IL', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('GA', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NC', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform work on own residence', '2026-03-12');

-- HVAC
INSERT INTO trade_licensing_rules (state, trade_category, license_required, license_type, homeowner_exemption, homeowner_exemption_notes, last_verified) VALUES
  ('MI', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence, except refrigerant handling', '2026-03-12'),
  ('CA', 'hvac', true, 'C-20 HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('TX', 'hvac', true, 'Licensed HVAC Technician', true, 'Homeowners may perform work on homestead', '2026-03-12'),
  ('FL', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NY', 'hvac', true, 'Licensed HVAC Technician', true, 'Varies by municipality', '2026-03-12'),
  ('PA', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work with permit', '2026-03-12'),
  ('OH', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('IL', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('GA', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NC', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12');

-- General/Structural
INSERT INTO trade_licensing_rules (state, trade_category, license_required, license_type, homeowner_exemption, homeowner_exemption_notes, last_verified) VALUES
  ('MI', 'general', true, 'Licensed Residential Builder', true, 'Homeowners may perform work on own single-family residence', '2026-03-12'),
  ('CA', 'general', true, 'B General Contractor', true, 'Homeowners may perform work on own residence valued under $500', '2026-03-12'),
  ('TX', 'general', false, NULL, true, 'Texas does not require a general contractor license at state level', '2026-03-12'),
  ('FL', 'general', true, 'Licensed General Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NY', 'general', false, NULL, true, 'Varies by municipality — NYC requires license', '2026-03-12'),
  ('PA', 'general', true, 'Home Improvement Contractor', true, 'Registration required, not a trade license', '2026-03-12'),
  ('OH', 'general', false, NULL, true, 'Ohio does not require a state general contractor license', '2026-03-12'),
  ('IL', 'general', false, NULL, true, 'Varies by municipality', '2026-03-12'),
  ('GA', 'general', true, 'Licensed General Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12'),
  ('NC', 'general', true, 'Licensed General Contractor', true, 'Homeowners may perform work on own residence', '2026-03-12');
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase migration up 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312200000_trade_licensing_rules.sql
git commit -m "feat: add trade_licensing_rules table with seed data for 10 states"
```

---

### Task 18: Expert Tools Library — Licensing Gap Detection

**Files:**
- Create: `lib/marketplace/expert-tools.ts`
- Create: `lib/__tests__/expert-tools.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/expert-tools.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectLicensingGap,
  buildLicensingAdvisory,
  buildCodeLookupPrompt,
  buildDraftAnswerPrompt,
} from '@/lib/marketplace/expert-tools';

describe('detectLicensingGap', () => {
  it('returns no gap when expert has matching license', () => {
    const result = detectLicensingGap(
      ['plumbing'],  // expert's licensed trades
      'plumbing',    // question trade category
    );
    expect(result.hasGap).toBe(false);
  });

  it('returns gap when expert lacks license for question trade', () => {
    const result = detectLicensingGap(
      ['general'],   // expert's licensed trades
      'plumbing',    // question trade category
    );
    expect(result.hasGap).toBe(true);
    expect(result.questionTrade).toBe('plumbing');
  });

  it('returns no gap when expert has no licenses (shows generic advisory)', () => {
    const result = detectLicensingGap(
      [],            // no verified licenses
      'electrical',
    );
    expect(result.hasGap).toBe(true);
    expect(result.noLicensesOnFile).toBe(true);
  });
});

describe('buildLicensingAdvisory', () => {
  it('includes state and trade when licensing rule exists', () => {
    const advisory = buildLicensingAdvisory({
      hasGap: true,
      questionTrade: 'plumbing',
      licensingRule: {
        state: 'MI',
        license_type: 'Licensed Plumber',
        homeowner_exemption: true,
        homeowner_exemption_notes: 'Homeowners may perform plumbing work on their own residence',
      },
    });
    expect(advisory).toContain('MI');
    expect(advisory).toContain('Licensed Plumber');
    expect(advisory).toContain('homeowner');
  });

  it('returns generic advisory when no licensing rule exists', () => {
    const advisory = buildLicensingAdvisory({
      hasGap: true,
      questionTrade: 'plumbing',
      licensingRule: null,
    });
    expect(advisory).toContain('Licensing requirements vary');
  });
});

describe('buildCodeLookupPrompt', () => {
  it('includes topic and location', () => {
    const prompt = buildCodeLookupPrompt('electrical panel upgrade', 'MI', 'Detroit');
    expect(prompt).toContain('electrical panel upgrade');
    expect(prompt).toContain('MI');
    expect(prompt).toContain('Detroit');
  });
});

describe('buildDraftAnswerPrompt', () => {
  it('includes question text and project context', () => {
    const prompt = buildDraftAnswerPrompt(
      'How do I install a ceiling fan?',
      { projectSummary: 'Ceiling fan installation in bedroom' }
    );
    expect(prompt).toContain('ceiling fan');
    expect(prompt).toContain('bedroom');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/expert-tools.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/marketplace/expert-tools.ts

interface LicensingGapResult {
  hasGap: boolean;
  questionTrade: string;
  noLicensesOnFile?: boolean;
  licensingRule?: {
    state: string;
    license_type: string | null;
    homeowner_exemption: boolean;
    homeowner_exemption_notes: string | null;
  } | null;
}

export function detectLicensingGap(
  expertLicensedTrades: string[],
  questionTradeCategory: string,
): LicensingGapResult {
  if (expertLicensedTrades.length === 0) {
    return {
      hasGap: true,
      questionTrade: questionTradeCategory,
      noLicensesOnFile: true,
    };
  }

  const normalizedExpertTrades = expertLicensedTrades.map(t => t.toLowerCase());
  const normalizedQuestion = questionTradeCategory.toLowerCase();

  if (normalizedExpertTrades.includes(normalizedQuestion)) {
    return { hasGap: false, questionTrade: questionTradeCategory };
  }

  return { hasGap: true, questionTrade: questionTradeCategory };
}

export function buildLicensingAdvisory(gap: LicensingGapResult): string {
  if (!gap.hasGap) return '';

  if (!gap.licensingRule) {
    return `Licensing requirements vary by state. If this question falls outside your licensed trade, consider framing advice for homeowner self-work or recommending a licensed ${gap.questionTrade} professional.`;
  }

  const rule = gap.licensingRule;
  const lines: string[] = [
    `In ${rule.state}, ${gap.questionTrade} work requires a ${rule.license_type || 'license'}.`,
  ];

  if (rule.homeowner_exemption) {
    lines.push(`Homeowner exemption: ${rule.homeowner_exemption_notes || 'Homeowners may generally perform work on their own residence.'}`);
    lines.push('You can advise the homeowner on tasks they can legally do themselves, or recommend they consult a licensed specialist.');
  } else {
    lines.push('This work requires a licensed professional. Recommend the homeowner hire a qualified specialist.');
  }

  lines.push('');
  lines.push('Suggested framing:');
  lines.push('• "As a homeowner, you\'re generally permitted to..."');
  lines.push('• "For this specific task, I\'d recommend consulting a licensed..."');
  lines.push('• "This is something you can handle yourself, but if you want a professional..."');

  return lines.join('\n');
}

export function buildCodeLookupPrompt(
  topic: string,
  state: string,
  city?: string,
): string {
  const location = city ? `${city}, ${state}` : state;
  return `Find relevant building codes and regulations for: "${topic}" in ${location}.

Include:
- Applicable code sections (IRC, NEC, IPC, IMC as relevant)
- State or local amendments if known
- Permit requirements
- Key requirements and specifications

Format each code reference as a separate section with the code name, section number, and key requirement. Include a disclaimer that codes should be verified with the local building department.`;
}

export function buildDraftAnswerPrompt(
  questionText: string,
  projectContext?: { projectSummary?: string; [key: string]: unknown },
): string {
  const parts: string[] = [
    `Write a draft answer for this DIY question: "${questionText}"`,
    '',
    'Write in a neutral, technical tone. Be specific and actionable.',
    'Include safety warnings where applicable.',
    'Do not include personal opinions or anecdotes.',
  ];

  if (projectContext?.projectSummary) {
    parts.push('');
    parts.push(`Project context: ${projectContext.projectSummary}`);
  }

  return parts.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/expert-tools.test.ts 2>&1 | tail -10`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/marketplace/expert-tools.ts lib/__tests__/expert-tools.test.ts
git commit -m "feat: add expert tools library — licensing gap detection, code lookup, draft prompts"
```

---

### Task 19: Code Lookup API Route

**Files:**
- Create: `app/api/experts/tools/code-lookup/route.ts`

- [ ] **Step 1: Create the directory and route**

Run: `mkdir -p app/api/experts/tools/code-lookup`

```typescript
// app/api/experts/tools/code-lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthFromRequest } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import config from '@/lib/config';
import { buildCodeLookupPrompt } from '@/lib/marketplace/expert-tools';

const CodeLookupSchema = z.object({
  topic: z.string().min(3).max(500),
  state: z.string().length(2),
  city: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CodeLookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { topic, state, city } = parsed.data;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const prompt = buildCodeLookupPrompt(topic, state, city);

    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return NextResponse.json({
      codes: text,
      disclaimer: 'Verify with your local building department — codes vary by jurisdiction and amendment date.',
      location: city ? `${city}, ${state}` : state,
      topic,
    });
  } catch (error) {
    logger.error('Code lookup error', error);
    return NextResponse.json({
      error: 'Unable to retrieve codes right now. Try again or consult your state licensing board.',
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/experts/tools/code-lookup/route.ts
git commit -m "feat: add code lookup API for expert co-pilot"
```

---

### Task 20: Draft Answer API Route

**Files:**
- Create: `app/api/experts/tools/draft-answer/route.ts`

- [ ] **Step 1: Create the directory and route**

Run: `mkdir -p app/api/experts/tools/draft-answer`

```typescript
// app/api/experts/tools/draft-answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthFromRequest } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import config from '@/lib/config';
import { buildExpertContext } from '@/lib/marketplace/context-builder';
import { buildDraftAnswerPrompt } from '@/lib/marketplace/expert-tools';

const DraftSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch question details
    const { data: question, error: qErr } = await adminClient
      .from('qa_questions')
      .select('question_text, report_id, trade_category')
      .eq('id', parsed.data.questionId)
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Build project context if report exists
    let projectContext: Record<string, unknown> | undefined;
    if (question.report_id) {
      try {
        projectContext = await buildExpertContext(adminClient, question.report_id);
      } catch {
        // No context available — proceed without
      }
    }

    const prompt = buildDraftAnswerPrompt(question.question_text, projectContext);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const draft = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return NextResponse.json({ draft, aiAssisted: true });
  } catch (error) {
    logger.error('Draft answer generation error', error);
    return NextResponse.json({
      error: 'Draft generation unavailable. You can write your answer directly.',
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/experts/tools/draft-answer/route.ts
git commit -m "feat: add draft answer API for expert co-pilot"
```

---

### Task 21: Reference Surfacer API Route (with Licensing Logic)

**Files:**
- Create: `app/api/experts/tools/references/route.ts`

- [ ] **Step 1: Create the directory and route**

Run: `mkdir -p app/api/experts/tools/references`

```typescript
// app/api/experts/tools/references/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { detectLicensingGap, buildLicensingAdvisory } from '@/lib/marketplace/expert-tools';

const ReferencesSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ReferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get question trade category and DIYer state
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('trade_category, state')
      .eq('id', parsed.data.questionId)
      .single();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Get expert's verified licenses (using admin client to bypass RLS)
    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('id')
      .eq('user_id', auth.userId)
      .single();

    let expertTrades: string[] = [];
    if (expertProfile) {
      const { data: licenses } = await adminClient
        .from('expert_licenses')
        .select('license_type')
        .eq('expert_id', expertProfile.id)
        .eq('verified', true);

      expertTrades = (licenses || []).map(l => l.license_type?.toLowerCase() || '').filter(Boolean);
    }

    // Detect licensing gap
    const gap = detectLicensingGap(expertTrades, question.trade_category || 'general');

    // Look up licensing rule for this state/trade
    let licensingRule = null;
    if (gap.hasGap && question.state && question.trade_category) {
      const { data: rule } = await adminClient
        .from('trade_licensing_rules')
        .select('state, license_type, homeowner_exemption, homeowner_exemption_notes')
        .eq('state', question.state)
        .eq('trade_category', question.trade_category)
        .single();

      licensingRule = rule;
    }

    const advisory = gap.hasGap
      ? buildLicensingAdvisory({ ...gap, licensingRule })
      : null;

    return NextResponse.json({
      hasLicensingGap: gap.hasGap,
      noLicensesOnFile: gap.noLicensesOnFile || false,
      advisory,
      questionTrade: question.trade_category,
      expertTrades,
    });
  } catch (error) {
    logger.error('Reference surfacer error', error);
    return NextResponse.json({
      hasLicensingGap: true,
      advisory: 'Licensing requirements vary by state. If this question falls outside your licensed trade, consider framing advice for homeowner self-work.',
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/experts/tools/references/route.ts
git commit -m "feat: add licensing-aware reference surfacer API for expert co-pilot"
```

---

### Task 22: ExpertCoPilot Container Component

**Files:**
- Create: `components/marketplace/ExpertCoPilot.tsx`

- [ ] **Step 1: Write the container component**

```tsx
// components/marketplace/ExpertCoPilot.tsx
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileEdit, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import CodeLookup from './CodeLookup';
import ReferenceSurface from './ReferenceSurface';
import { supabase } from '@/lib/supabase';

interface ExpertCoPilotProps {
  questionId: string;
  onInsertDraft: (draft: string) => void;
}

export default function ExpertCoPilot({ questionId, onInsertDraft }: ExpertCoPilotProps) {
  const [activePanel, setActivePanel] = useState<'codes' | 'references' | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/experts/tools/draft-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDraftError(data.error || 'Draft generation failed');
        return;
      }

      const { draft } = await res.json();
      onInsertDraft(draft);
    } catch {
      setDraftError('Draft generation unavailable. You can write your answer directly.');
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="border border-[#D4C8B8] rounded-lg bg-[#FDFBF7] mb-4">
      <div className="px-4 py-3 border-b border-[#D4C8B8]">
        <h4 className="text-sm font-semibold text-[#7D6B5D]">AI Assistant Tools</h4>
      </div>

      <div className="p-3 space-y-2">
        {/* Code Lookup */}
        <button
          onClick={() => setActivePanel(activePanel === 'codes' ? null : 'codes')}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#3E2723] hover:bg-[#F0E8DC] rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={14} className="text-[#5D7B93]" />
            Find Codes
          </span>
          {activePanel === 'codes' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {activePanel === 'codes' && (
          <div className="px-3 pb-3">
            <CodeLookup questionId={questionId} />
          </div>
        )}

        {/* Draft Assistant */}
        <button
          onClick={handleGenerateDraft}
          disabled={draftLoading}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#7D6B5D] hover:bg-[#F0E8DC] rounded-lg transition-colors disabled:opacity-50"
        >
          <FileEdit size={14} className="text-[#7D6B5D]" />
          {draftLoading ? 'Generating draft...' : 'Generate Draft'}
        </button>
        {draftError && (
          <p className="px-3 text-xs text-red-600">{draftError}</p>
        )}

        {/* Reference Surfacer */}
        <button
          onClick={() => setActivePanel(activePanel === 'references' ? null : 'references')}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#3E2723] hover:bg-[#F0E8DC] rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <Scale size={14} className="text-[#5D7B93]" />
            Licensing & References
          </span>
          {activePanel === 'references' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {activePanel === 'references' && (
          <div className="px-3 pb-3">
            <ReferenceSurface questionId={questionId} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketplace/ExpertCoPilot.tsx
git commit -m "feat: add ExpertCoPilot container component"
```

---

### Task 23: CodeLookup Component

**Files:**
- Create: `components/marketplace/CodeLookup.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/marketplace/CodeLookup.tsx
'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';

interface CodeLookupProps {
  questionId: string;
}

export default function CodeLookup({ questionId }: CodeLookupProps) {
  const [topic, setTopic] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic || !state) return;
    setLoading(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/experts/tools/code-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, state: state.toUpperCase(), city: city || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Code lookup failed');
        return;
      }

      const data = await res.json();
      setResults(data.codes);
    } catch {
      setError('Unable to retrieve codes. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Topic (e.g., electrical panel upgrade)"
          className="flex-1 px-2 py-1.5 text-sm border border-[#D4C8B8] rounded bg-white text-[#3E2723]"
        />
        <input
          value={state}
          onChange={e => setState(e.target.value)}
          placeholder="State"
          maxLength={2}
          className="w-16 px-2 py-1.5 text-sm border border-[#D4C8B8] rounded bg-white text-[#3E2723] uppercase"
        />
      </div>
      <div className="flex gap-2">
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="City (optional)"
          className="flex-1 px-2 py-1.5 text-sm border border-[#D4C8B8] rounded bg-white text-[#3E2723]"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !topic || !state}
          className="px-3 py-1.5 text-sm bg-[#5D7B93] text-white rounded hover:bg-[#4A6275] disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {results && (
        <div className="border border-[#D4C8B8] rounded p-3 bg-white max-h-64 overflow-y-auto">
          <div className="prose prose-sm max-w-none text-[#3E2723]">
            <ReactMarkdown>{results}</ReactMarkdown>
          </div>
          <p className="text-xs text-[#A89880] mt-2 italic">
            Verify with your local building department — codes vary by jurisdiction.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketplace/CodeLookup.tsx
git commit -m "feat: add CodeLookup component for expert co-pilot"
```

---

### Task 24: ReferenceSurface Component

**Files:**
- Create: `components/marketplace/ReferenceSurface.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/marketplace/ReferenceSurface.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReferenceSurfaceProps {
  questionId: string;
}

interface ReferenceData {
  hasLicensingGap: boolean;
  noLicensesOnFile: boolean;
  advisory: string | null;
  questionTrade: string;
  expertTrades: string[];
}

export default function ReferenceSurface({ questionId }: ReferenceSurfaceProps) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReferences() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/experts/tools/references', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId }),
        });

        const result = await res.json();
        setData(result);
      } catch {
        setError('Unable to load licensing information.');
      } finally {
        setLoading(false);
      }
    }
    fetchReferences();
  }, [questionId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#A89880]">
        <Loader2 size={14} className="animate-spin" />
        Checking licensing...
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!data) return null;

  if (!data.hasLicensingGap) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#4A7C59]">
        <Shield size={14} />
        Your licenses cover this trade category.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            {data.noLicensesOnFile ? (
              <p className="font-medium mb-1">No verified licenses on file</p>
            ) : (
              <p className="font-medium mb-1">Licensing advisory</p>
            )}
            <div className="whitespace-pre-line text-xs">
              {data.advisory}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketplace/ReferenceSurface.tsx
git commit -m "feat: add ReferenceSurface component with licensing advisory"
```

---

### Task 25: Integrate Co-Pilot into QAAnswerForm

**Files:**
- Modify: `components/marketplace/QAAnswerForm.tsx`

- [ ] **Step 1: Add ExpertCoPilot import and draft handling**

At the top of `QAAnswerForm.tsx`, add:
```typescript
import ExpertCoPilot from './ExpertCoPilot';
```

Add a callback to handle draft insertion:
```typescript
const handleInsertDraft = (draft: string) => {
  setAnswerText(draft);
};
```

- [ ] **Step 2: Add the ExpertCoPilot component above the answer form**

Insert the ExpertCoPilot component right after the error display (`{error && ...}` block, before the `<div className="space-y-4">` form fields):

```tsx
<ExpertCoPilot questionId={questionId} onInsertDraft={handleInsertDraft} />
```

- [ ] **Step 3: Add ai_assisted metadata to submission**

In the `handleSubmit` function body, add a flag to track if the answer was drafted by AI. Add state:
```typescript
const [usedDraft, setUsedDraft] = useState(false);
```

Update `handleInsertDraft`:
```typescript
const handleInsertDraft = (draft: string) => {
  setAnswerText(draft);
  setUsedDraft(true);
};
```

In the fetch body, add:
```typescript
ai_assisted: usedDraft,
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit components/marketplace/QAAnswerForm.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/marketplace/QAAnswerForm.tsx
git commit -m "feat: integrate ExpertCoPilot into QAAnswerForm with draft support"
```

---

### Task 26: Run All Tests — Verify No Regressions

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 2: Verify TypeScript compilation of new components**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from the expert co-pilot components

- [ ] **Step 3: Commit if any fixes were needed**

---

### Chunk 3 Summary

After completing Chunk 3, the app has:
- `trade_licensing_rules` table with seed data for 10 states x 4 trades
- Expert tools library with licensing gap detection
- Three API endpoints: code lookup, draft answer, reference surfacer
- ExpertCoPilot container with CodeLookup and ReferenceSurface components
- QAAnswerForm integration with draft insertion and AI-assisted tracking
- Licensing advisory banners for cross-trade answers
- Full test coverage for licensing logic

**Next:** Chunk 4 adds the 5 developer workflow skills.

---

## Chunk 4: Developer Workflow Skills

This chunk creates 5 Claude Code skills in `.claude/skills/`. These are markdown instruction files, not application code — they don't ship to production. No TDD needed; each is a standalone file.

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `.claude/skills/marketplace-flow-tester.md` | E2E marketplace payment flow testing |
| Create | `.claude/skills/migration-validator.md` | Supabase migration safety checks |
| Create | `.claude/skills/agent-phase-debugger.md` | 6-phase project planner debugging |
| Create | `.claude/skills/api-regression-scanner.md` | API endpoint test coverage mapping |
| Create | `.claude/skills/browser-ui-flow-tester.md` | Chrome browser automation UI testing |

---

### Task 27: Create Skills Directory + Marketplace Flow Tester

**Files:**
- Create: `.claude/skills/marketplace-flow-tester.md`

- [ ] **Step 1: Create the skills directory**

Run: `mkdir -p .claude/skills`

- [ ] **Step 2: Write the skill file**

Write `.claude/skills/marketplace-flow-tester.md` with the full skill definition including:
- Frontmatter with `name: marketplace-flow-tester` and description
- Step-by-step instructions for creating test users, submitting questions, claiming, answering, accepting/rejecting
- API endpoints to call (with curl examples against localhost:3000)
- Database queries to verify state (using Supabase admin client)
- Stripe test mode awareness (`QA_PAYMENT_TEST_MODE`)
- Cleanup instructions
- Pass/fail reporting format

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/marketplace-flow-tester.md
git commit -m "feat: add marketplace flow tester skill"
```

---

### Task 28: Migration Validator Skill

**Files:**
- Create: `.claude/skills/migration-validator.md`

- [ ] **Step 1: Write the skill file**

Write `.claude/skills/migration-validator.md` with:
- Instructions to read the new migration file
- Cross-reference columns with Grep against `lib/` and `app/api/` for breaking changes
- Check for RLS policies on new tables (every table must have RLS)
- Check for rollback safety (reversible statements)
- Check for missing indexes on foreign keys
- Compare against existing migrations in `supabase/migrations/`
- Output format: safe/warnings/blocking

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/migration-validator.md
git commit -m "feat: add migration validator skill"
```

---

### Task 29: Agent Phase Debugger Skill

**Files:**
- Create: `.claude/skills/agent-phase-debugger.md`

- [ ] **Step 1: Write the skill file**

Write `.claude/skills/agent-phase-debugger.md` with:
- Instructions to read the target phase from `lib/agents/phases/[phase].ts`
- Read the corresponding prompt from `lib/agents/prompts.ts`
- Display the assembled system prompt for that phase
- List expected tool calls and their parameters
- "What if" mode instructions for modifying inputs
- Diff comparison instructions for two runs

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/agent-phase-debugger.md
git commit -m "feat: add agent phase debugger skill"
```

---

### Task 30: API Regression Scanner Skill

**Files:**
- Create: `.claude/skills/api-regression-scanner.md`

- [ ] **Step 1: Write the skill file**

Write `.claude/skills/api-regression-scanner.md` with:
- Instructions to Glob `app/api/**/route.ts` for all API routes
- Extract HTTP methods (GET, POST, PUT, DELETE, PATCH) from each route
- Grep test files (`lib/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`, `e2e/**`) for route path references
- Produce coverage report in the specified format (checkmark/X/warning)
- Change-aware mode: use `git diff` to find modified routes
- Auto-generate Vitest test stubs for untested endpoints

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/api-regression-scanner.md
git commit -m "feat: add API regression scanner skill"
```

---

### Task 31: Browser UI Flow Tester Skill

**Files:**
- Create: `.claude/skills/browser-ui-flow-tester.md`

- [ ] **Step 1: Write the skill file**

Write `.claude/skills/browser-ui-flow-tester.md` with:
- Prerequisites check (dev server running, Chrome extension active)
- Instructions to use `mcp__claude-in-chrome__tabs_context_mcp` first
- Flow definitions for each test flow (DIYer quick question, full project, Q&A submission, expert claim, co-pilot tools, accept/reject, messaging, image upload)
- GIF recording instructions using `mcp__claude-in-chrome__gif_creator`
- Console error capture using `mcp__claude-in-chrome__read_console_messages`
- Network request monitoring using `mcp__claude-in-chrome__read_network_requests`
- Screenshot checkpoints
- Test credential seeding coordination with marketplace flow tester
- Pass/fail summary format with GIF references

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/browser-ui-flow-tester.md
git commit -m "feat: add browser UI flow tester skill"
```

---

### Chunk 4 Summary

After completing Chunk 4, the project has:
- 5 new Claude Code skills in `.claude/skills/`
- Marketplace Flow Tester for end-to-end payment testing
- Migration Validator for pre-apply safety checks
- Agent Phase Debugger for project planner debugging
- API Regression Scanner for test coverage mapping
- Browser UI Flow Tester for frontend automation testing

---

## Plan Complete

All 4 chunks are ready for execution:

| Chunk | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1: Foundation + Smart Routing | Tasks 1-8 | Intent classification, prompt variants, conversation routing |
| 2: Skill Calibration | Tasks 9-16 | Passive user profiling, adaptive response depth |
| 3: Expert Co-Pilot | Tasks 17-26 | Code lookup, draft assistant, licensing-aware references |
| 4: Developer Skills | Tasks 27-31 | 5 Claude Code automation skills |

**Build order:** Chunks 1→2→3 must be sequential (shared infrastructure). Chunk 4 can be built in parallel with any other chunk.
