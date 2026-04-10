# Custom Review Loop with DIY Safety Rubric — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third advisor mode ("custom") that implements our own multi-call review loop with domain-specific DIY safety rubrics, a Supabase-backed feedback collection pipeline, and a model-portable reviewer interface — sitting alongside the existing "off" (A) and "beta" (B) modes as a config-driven option.

**Architecture:** A new `ADVISOR_MODE` env var replaces the boolean `ADVISOR_ENABLED` with a three-way switch: `off | beta | custom`. The custom loop is a standalone module that takes Sonnet's draft response, sends it to a configurable reviewer model (default Haiku) with a structured DIY safety rubric, and returns the reviewed/corrected response. The rubric starts with Claude-generated seed data (cold-start) and evolves via weighted user/expert corrections stored in Supabase. A provider abstraction keeps the reviewer model-agnostic.

**Tech Stack:** TypeScript, Next.js API routes, Anthropic SDK (`@anthropic-ai/sdk`), Supabase (PostgreSQL + JS client), Vitest, React (Lucide icons, Tailwind)

**Research basis:** Asawa, P., Zhu, A., O'Neill, A., Zaharia, M., Dimakis, A.G., & Gonzalez, J.E. (2025). "How to Train Your Advisor: Steering Black-Box LLMs with Advisor Models." arXiv:2510.02453.

---

## File Structure

### Phase 1 — Core Review Loop (Tasks 1-10)

| File | Responsibility |
|---|---|
| `lib/config.ts:205-241` | Replace `advisor.enabled` boolean with `advisor.mode`, add `customReviewer` block |
| `lib/advisor-resolver.ts` | Expose `advisorMode` and `customReviewerModel` in resolution; add selective invocation |
| `lib/advisor-provider.ts` | **New** — Model-agnostic `ReviewModelProvider` interface |
| `lib/advisor-providers/anthropic.ts` | **New** — Anthropic implementation of `ReviewModelProvider` |
| `lib/advisor-rubric.ts` | **New** — Static DIY safety rubric + few-shot prompt builder |
| `lib/advisor-custom-loop.ts` | **New** — Iterative review loop with early stopping |
| `lib/advisor-metrics.ts` | Add `advisorMode`, `customReviewerModel`, custom loop fields |
| `supabase/migrations/20260410000000_advisor_review_tables.sql` | **New** — 5 tables: rubric_examples, review_log, canary_tests, canary_results, correction_queue |
| `lib/advisor-rubric-db.ts` | **New** — Weighted few-shot example retrieval from Supabase |
| `lib/advisor-audit.ts` | **New** — Write review verdicts to Supabase review_log |
| `scripts/seed-rubric-examples.ts` | **New** — Cold-start seed script using Opus |
| `app/api/chat/route.ts:218-276` | Branch on `advisorMode`: beta uses existing path, custom calls post-generation loop |

### Phase 2 — Correction Collection UI (Tasks 11-14)

| File | Responsibility |
|---|---|
| `components/ChatMessageFeedback.tsx` | **New** — Thumbs up + Flag button component for chat messages |
| `app/api/chat/flag/route.ts` | **New** — POST endpoint: write user flag to correction_queue |
| `components/marketplace/ActiveQuestionCard.tsx:125-131` | Add collapsible AI response + "Flag & Correct" button |
| `app/api/qa/[id]/ai-correction/route.ts` | **New** — POST endpoint: expert AI correction to correction_queue |
| `lib/advisor-promotion.ts` | **New** — Pipeline: classify → verify → structure → promote to rubric_examples |

### Phase 3 — Validation (Tasks 15-17)

| File | Responsibility |
|---|---|
| `.env.example` | Document all `ADVISOR_MODE` and `ADVISOR_CUSTOM_*` vars |
| All test files | Full validation pass |

### Test Files

| File | Tests |
|---|---|
| `lib/__tests__/advisor-config.test.ts` | Updated for three-way mode |
| `lib/__tests__/advisor-integration.test.ts` | Updated for custom mode resolution |
| `lib/__tests__/advisor-metrics.test.ts` | Updated for custom loop fields |
| `lib/__tests__/advisor-provider.test.ts` | **New** — Provider interface tests |
| `lib/__tests__/advisor-rubric.test.ts` | **New** — Rubric prompt construction |
| `lib/__tests__/advisor-custom-loop.test.ts` | **New** — Loop logic with mocked provider |
| `lib/__tests__/advisor-rubric-db.test.ts` | **New** — Weighted example selection |
| `lib/__tests__/advisor-audit.test.ts` | **New** — Audit trail writes |
| `lib/__tests__/advisor-promotion.test.ts` | **New** — Promotion pipeline |
| `app/api/chat/flag/__tests__/route.test.ts` | **New** — Flag endpoint |

---

## Phase 1 — Core Review Loop

### Task 1: Refactor config from boolean to three-way mode

**Files:**
- Modify: `lib/config.ts:205-241`
- Modify: `lib/__tests__/advisor-config.test.ts`

- [ ] **Step 1: Write the failing tests for mode parsing**

Replace the contents of `lib/__tests__/advisor-config.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('advisor config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to "off" when ADVISOR_MODE is unset', async () => {
    delete process.env.ADVISOR_MODE;
    const { advisor } = await import('@/lib/config');
    expect(advisor.mode).toBe('off');
  });

  it('parses "beta" mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { advisor } = await import('@/lib/config');
    expect(advisor.mode).toBe('beta');
  });

  it('parses "custom" mode', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { advisor } = await import('@/lib/config');
    expect(advisor.mode).toBe('custom');
  });

  it('falls back to "off" for invalid values', async () => {
    process.env.ADVISOR_MODE = 'garbage';
    const { advisor } = await import('@/lib/config');
    expect(advisor.mode).toBe('off');
  });

  it('has four intent tiers with correct defaults', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.tiers.quick_question.executor).toBe('claude-haiku-4-5-20251001');
    expect(advisor.tiers.quick_question.advisor).toBeNull();
    expect(advisor.tiers.quick_question.maxUses).toBe(0);

    expect(advisor.tiers.troubleshooting.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.troubleshooting.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.troubleshooting.maxUses).toBe(2);

    expect(advisor.tiers.mid_project.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.mid_project.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.mid_project.maxUses).toBe(1);

    expect(advisor.tiers.full_project.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.full_project.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.full_project.maxUses).toBe(3);
  });

  it('overrides executor model via env var', async () => {
    process.env.ADVISOR_EXECUTOR_QUICK = 'claude-sonnet-4-6';
    const { advisor } = await import('@/lib/config');
    expect(advisor.tiers.quick_question.executor).toBe('claude-sonnet-4-6');
  });

  it('has default safety keywords', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyCriticalKeywords).toContain('electrical panel');
    expect(advisor.safetyCriticalKeywords).toContain('gas line');
    expect(advisor.safetyCriticalKeywords).toContain('asbestos');
    expect(advisor.safetyCriticalKeywords.length).toBeGreaterThanOrEqual(10);
  });

  it('overrides safety keywords via env var', async () => {
    process.env.ADVISOR_SAFETY_KEYWORDS = 'custom keyword,another one';
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyCriticalKeywords).toEqual(['custom keyword', 'another one']);
  });

  it('defaults safetyBoostUses to 1', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyBoostUses).toBe(1);
  });

  it('provides custom reviewer config', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.customReviewer.model).toBe('claude-haiku-4-5-20251001');
    expect(advisor.customReviewer.maxIterations).toBe(2);
    expect(advisor.customReviewer.earlyStopOnApproval).toBe(true);
    expect(advisor.customReviewer.provider).toBe('anthropic');
  });

  it('overrides custom reviewer model via env var', async () => {
    process.env.ADVISOR_CUSTOM_MODEL = 'gpt-4o-mini';
    process.env.ADVISOR_CUSTOM_PROVIDER = 'openai';
    const { advisor } = await import('@/lib/config');
    expect(advisor.customReviewer.model).toBe('gpt-4o-mini');
    expect(advisor.customReviewer.provider).toBe('openai');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-config.test.ts`
Expected: FAIL — `advisor.mode` does not exist, `advisor.enabled` is a boolean.

- [ ] **Step 3: Update config.ts — replace boolean with mode, add custom reviewer block**

In `lib/config.ts`, replace lines 205-241 (the entire advisor block):

```typescript
// ── Advisor Strategy ────────────────────────────────────────────────────────
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// Mode A (off): no review. Mode B (beta): Anthropic advisor API. Mode C (custom): our own loop.
function parseAdvisorMode(val: string): 'off' | 'beta' | 'custom' {
  if (val === 'beta' || val === 'custom') return val;
  return 'off';
}

export const advisor = {
  mode: parseAdvisorMode(envString('ADVISOR_MODE', 'off')),

  tiers: {
    quick_question: {
      executor: envString('ADVISOR_EXECUTOR_QUICK', 'claude-haiku-4-5-20251001'),
      advisor: null as string | null,
      maxUses: 0,
    },
    troubleshooting: {
      executor: envString('ADVISOR_EXECUTOR_TROUBLESHOOT', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_TROUBLESHOOT', 'claude-opus-4-6') as string | null,
      maxUses: envInt('ADVISOR_MAX_USES_TROUBLESHOOT', 2),
    },
    mid_project: {
      executor: envString('ADVISOR_EXECUTOR_MID', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_MID', 'claude-opus-4-6') as string | null,
      maxUses: envInt('ADVISOR_MAX_USES_MID', 1),
    },
    full_project: {
      executor: envString('ADVISOR_EXECUTOR_FULL', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_FULL', 'claude-opus-4-6') as string | null,
      maxUses: envInt('ADVISOR_MAX_USES_FULL', 3),
    },
  },

  // Custom review loop config (used when mode === 'custom')
  customReviewer: {
    model: envString('ADVISOR_CUSTOM_MODEL', 'claude-haiku-4-5-20251001'),
    provider: envString('ADVISOR_CUSTOM_PROVIDER', 'anthropic'),
    maxIterations: envInt('ADVISOR_CUSTOM_MAX_ITERATIONS', 2),
    earlyStopOnApproval: envString('ADVISOR_CUSTOM_EARLY_STOP', 'true') === 'true',
  },

  safetyCriticalKeywords: envList('ADVISOR_SAFETY_KEYWORDS', [
    'electrical panel', 'breaker box', 'subpanel', 'gas line',
    'gas pipe', 'load-bearing', 'structural', 'asbestos',
    'lead paint', 'roof work', 'main disconnect', 'service entrance',
    'circuit breaker', 'wiring', 'rewire', '200 amp', '100 amp',
    'outlet install', 'junction box', 'ground wire', 'knob and tube',
  ]),

  safetyBoostUses: envInt('ADVISOR_SAFETY_BOOST_USES', 1),
} as const;
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-config.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/config.ts lib/__tests__/advisor-config.test.ts
git commit -m "refactor: replace ADVISOR_ENABLED boolean with ADVISOR_MODE three-way switch (off|beta|custom)"
```

---

### Task 2: Update advisor-resolver for mode + selective invocation

**Files:**
- Modify: `lib/advisor-resolver.ts`
- Modify: `lib/__tests__/advisor-integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `lib/__tests__/advisor-integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resolveAdvisorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Mode "off" ---

  it('returns advisorMode "off" when mode is off', async () => {
    process.env.ADVISOR_MODE = 'off';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'fix my sink');
    expect(result.advisorMode).toBe('off');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
    expect(result.customReviewerModel).toBeNull();
  });

  it('returns default model when mode is off', async () => {
    process.env.ADVISOR_MODE = 'off';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('handles undefined intentType by returning mode off', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig(undefined, 'Hello');
    expect(result.advisorMode).toBe('off');
    expect(result.advisorTool).toBeNull();
  });

  // --- Mode "beta" ---

  it('returns Haiku executor with no advisor for quick_question in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What size nail for baseboards?');
    expect(result.executorModel).toBe('claude-haiku-4-5-20251001');
    expect(result.advisorTool).toBeNull();
    expect(result.advisorMode).toBe('off'); // downgrades: no advisor configured for quick_question
  });

  it('returns Sonnet+Opus for full_project in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.advisorMode).toBe('beta');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.model).toBe('claude-opus-4-6');
    expect(result.advisorTool!.max_uses).toBe(3);
    expect(result.useBetaApi).toBe(true);
  });

  it('boosts max_uses when safety keywords detected in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I need to upgrade my electrical panel');
    expect(result.advisorTool!.max_uses).toBe(4); // 3 + 1 boost
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('appends system prompt suffix in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My gas line is leaking');
    expect(result.systemPromptSuffix).toContain('MUST consult the advisor');
  });

  // --- Mode "custom" ---

  it('returns advisorMode "custom" without advisor tool or beta API', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'fix my sink');
    expect(result.advisorMode).toBe('custom');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
    expect(result.customReviewerModel).toBe('claude-haiku-4-5-20251001');
  });

  it('detects safety keywords in custom mode', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'help with my electrical panel');
    expect(result.advisorMode).toBe('custom');
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('skips custom review for quick_question intent (selective invocation)', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What color paint for my bedroom?');
    expect(result.advisorMode).toBe('off'); // custom mode skips quick_question
    expect(result.customReviewerModel).toBeNull();
  });

  it('does not skip custom review for quick_question with safety keywords', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What wire gauge for a circuit breaker?');
    expect(result.advisorMode).toBe('custom'); // safety overrides skip
    expect(result.safetyKeywordsDetected).toBe(true);
  });

  it('does not boost when no safety keywords match in custom mode', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to paint my bedroom');
    expect(result.safetyKeywordsDetected).toBe(false);
    expect(result.advisorMode).toBe('custom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-integration.test.ts`
Expected: FAIL — `advisorMode` does not exist on `AdvisorResolution`.

- [ ] **Step 3: Rewrite advisor-resolver.ts**

Replace the full contents of `lib/advisor-resolver.ts`:

```typescript
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
    // No advisor tool or beta API needed — custom loop handles review post-generation
    return result;
  }

  // ── Beta mode ────────────────────────────────────────────
  if (!tier.advisor || tier.maxUses <= 0) {
    return result; // advisorMode stays 'off' — this tier has no advisor
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
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-integration.test.ts lib/__tests__/advisor-config.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-resolver.ts lib/__tests__/advisor-integration.test.ts
git commit -m "feat: expose advisorMode in resolution, add selective invocation for custom mode"
```

---

### Task 3: Create the reviewer provider abstraction

**Files:**
- Create: `lib/advisor-provider.ts`
- Create: `lib/advisor-providers/anthropic.ts`
- Create: `lib/__tests__/advisor-provider.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/advisor-provider.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AnthropicReviewProvider } from '@/lib/advisor-providers/anthropic';
import type { ReviewModelProvider } from '@/lib/advisor-provider';

describe('AnthropicReviewProvider', () => {
  it('implements ReviewModelProvider interface', () => {
    const mockClient = { messages: { create: vi.fn() } };
    const provider: ReviewModelProvider = new AnthropicReviewProvider(
      'claude-haiku-4-5-20251001',
      mockClient as never,
    );
    expect(provider.name).toBe('anthropic');
    expect(provider.model).toBe('claude-haiku-4-5-20251001');
    expect(typeof provider.call).toBe('function');
  });

  it('returns text and token counts from Anthropic response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"verdict":"APPROVE"}' }],
      usage: { input_tokens: 500, output_tokens: 200 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    const result = await provider.call(undefined, 'Review this response');

    expect(result.text).toBe('{"verdict":"APPROVE"}');
    expect(result.inputTokens).toBe(500);
    expect(result.outputTokens).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'Review this response' }],
    });
  });

  it('includes system prompt when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'response' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    await provider.call('You are a reviewer', 'Review this');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are a reviewer',
      messages: [{ role: 'user', content: 'Review this' }],
    });
  });

  it('returns empty text when no text block in response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    const result = await provider.call(undefined, 'Review this');
    expect(result.text).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-provider.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Create the provider interface**

Create `lib/advisor-provider.ts`:

```typescript
// Model-agnostic provider interface for the custom review loop.
// Keeps the reviewer portable across model families (arXiv:2510.02453 §5).
// Add new providers in lib/advisor-providers/ as needed.

export interface ReviewModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ReviewModelProvider {
  readonly name: string;
  readonly model: string;
  call(systemPrompt: string | undefined, userMessage: string): Promise<ReviewModelResponse>;
}
```

- [ ] **Step 4: Create the Anthropic provider**

Create `lib/advisor-providers/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { ReviewModelProvider, ReviewModelResponse } from '@/lib/advisor-provider';

export class AnthropicReviewProvider implements ReviewModelProvider {
  readonly name = 'anthropic';

  constructor(
    readonly model: string,
    private client: Anthropic,
  ) {}

  async call(systemPrompt: string | undefined, userMessage: string): Promise<ReviewModelResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return {
      text: textBlock && textBlock.type === 'text' ? textBlock.text : '',
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-provider.test.ts`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/advisor-provider.ts lib/advisor-providers/anthropic.ts lib/__tests__/advisor-provider.test.ts
git commit -m "feat: add model-agnostic ReviewModelProvider interface with Anthropic implementation"
```

---

### Task 4: Create the DIY safety rubric

**Files:**
- Create: `lib/advisor-rubric.ts`
- Create: `lib/__tests__/advisor-rubric.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/advisor-rubric.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildReviewPrompt, RUBRIC_VERSION } from '@/lib/advisor-rubric';

describe('buildReviewPrompt', () => {
  it('returns a prompt containing the rubric checklist', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I replace a circuit breaker?',
      draftResponse: 'Here is how to replace a circuit breaker: First turn off the main...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['circuit breaker'],
    });

    expect(prompt).toContain('SAFETY REVIEW RUBRIC');
    expect(prompt).toContain('circuit breaker');
    expect(prompt).toContain('USER QUESTION');
    expect(prompt).toContain('DRAFT RESPONSE');
  });

  it('includes elevated safety flag when keywords detected', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'Can I move my gas line?',
      draftResponse: 'You can move a gas line by...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });

    expect(prompt).toContain('ELEVATED SAFETY CONCERN');
    expect(prompt).toContain('gas line');
  });

  it('does not include elevated safety flag when no keywords', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(prompt).not.toContain('ELEVATED SAFETY CONCERN');
  });

  it('includes professional referral check in rubric', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'Can I move my gas line?',
      draftResponse: 'You can move a gas line by...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });

    expect(prompt).toContain('licensed professional');
  });

  it('returns structured verdict format instructions', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(prompt).toContain('"verdict"');
    expect(prompt).toContain('APPROVE');
    expect(prompt).toContain('REVISE');
  });

  it('includes few-shot examples when provided', () => {
    const prompt = buildReviewPrompt({
      userQuestion: 'How to wire an outlet?',
      draftResponse: 'Use 14-gauge wire for the 20-amp circuit...',
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['outlet install'],
      fewShotExamples: [
        {
          userQuestion: 'Can I use 14-gauge wire on a 20-amp circuit?',
          badResponse: 'Yes, 14-gauge works fine for 20-amp.',
          goodResponse: 'No — 14-gauge is only rated for 15 amps. Use 12-gauge for 20-amp circuits.',
          rubricItemsFailed: [5],
          severity: 'critical' as const,
        },
      ],
    });

    expect(prompt).toContain('PAST MISTAKES');
    expect(prompt).toContain('14-gauge is only rated for 15 amps');
    expect(prompt).toContain('Material & Specification');
  });

  it('exports a RUBRIC_VERSION number', () => {
    expect(typeof RUBRIC_VERSION).toBe('number');
    expect(RUBRIC_VERSION).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-rubric.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the rubric module**

Create `lib/advisor-rubric.ts`:

```typescript
// DIY safety review rubric for the custom advisor loop.
// This is the domain-specific "moat" — as we collect real DIY corrections,
// they get injected as few-shot examples here.
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §7: Effective rubrics decompose into binary sub-criteria; concrete > abstract.
// §9: Version-control rubrics; older versions may have trained advisors.

export const RUBRIC_VERSION = 1;

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

export interface FewShotExample {
  userQuestion: string;
  badResponse: string;
  goodResponse: string;
  rubricItemsFailed: number[];
  severity: 'critical' | 'warning';
}

interface BuildReviewPromptParams {
  userQuestion: string;
  draftResponse: string;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  fewShotExamples?: FewShotExample[];
}

export function buildReviewPrompt(params: BuildReviewPromptParams): string {
  const {
    userQuestion,
    draftResponse,
    safetyKeywordsDetected,
    safetyKeywordsMatched,
    fewShotExamples,
  } = params;

  const safetyFlag = safetyKeywordsDetected
    ? `\n\n**ELEVATED SAFETY CONCERN:** The user's question involves safety-critical topics: ${safetyKeywordsMatched.join(', ')}. Apply extra scrutiny to the safety checklist items below.`
    : '';

  let fewShotSection = '';
  if (fewShotExamples && fewShotExamples.length > 0) {
    const examples = fewShotExamples.map((ex, i) => {
      const failedNames = ex.rubricItemsFailed
        .map(n => `${n}. ${RUBRIC_ITEM_NAMES[n] || 'Unknown'}`)
        .join(', ');
      return `**Example ${i + 1}** [${ex.severity}] — Failed: ${failedNames}
- Question: "${ex.userQuestion}"
- BAD: "${ex.badResponse}"
- GOOD: "${ex.goodResponse}"`;
    }).join('\n\n');

    fewShotSection = `\n\n## PAST MISTAKES IN THIS CATEGORY

The following are real examples of incorrect DIY advice. Watch for similar patterns:

${examples}`;
  }

  return `You are a DIY safety reviewer. Your job is to evaluate a draft response to a homeowner's question and ensure it is safe, accurate, and responsible.
${safetyFlag}

## USER QUESTION
${userQuestion}

## DRAFT RESPONSE
${draftResponse}
${fewShotSection}

## SAFETY REVIEW RUBRIC

Evaluate the draft against each checklist item. For each, note PASS or FAIL with a brief reason.

### 1. Professional Referral Check
- Does the response recommend consulting a licensed professional when the work requires permits, involves life-safety systems (electrical, gas, structural), or exceeds typical DIY skill level?
- FAIL if: The response encourages the user to do work that legally requires a licensed electrician, plumber, or structural engineer without mentioning this requirement.

### 2. Code Compliance
- Does the response reference relevant building codes (NEC, IRC, local amendments) when applicable?
- Does it avoid stating specific code requirements with false confidence?
- FAIL if: The response cites a specific code section incorrectly, or gives code-dependent advice without noting that local codes may differ.

### 3. Safety Warnings
- Are appropriate safety warnings included (PPE, power disconnection, gas shutoff, ventilation)?
- Are warnings placed BEFORE the dangerous step, not after?
- FAIL if: A step involves electrocution, gas exposure, fall, or chemical hazard risk without a preceding warning.

### 4. Sequence Accuracy
- Are the steps in the correct order? Would following them as written produce a safe, working result?
- FAIL if: Steps are out of order in a way that could cause damage or injury (e.g., reconnecting power before securing connections).

### 5. Material & Specification Accuracy
- Are wire gauges, pipe sizes, fastener types, and material specifications correct for the described application?
- FAIL if: The response recommends a material or specification that is wrong for the use case (e.g., 14-gauge wire on a 20-amp circuit).

### 6. Scope Honesty
- Does the response acknowledge uncertainty rather than guessing?
- Does it avoid hallucinating product names, model numbers, or specific prices?
- FAIL if: The response presents uncertain information as fact.

## VERDICT FORMAT

Respond with ONLY a JSON object in this exact format:
\`\`\`json
{
  "verdict": "APPROVE" | "REVISE",
  "confidence": 0.0-1.0,
  "issues": [
    {
      "rubricItem": 1-6,
      "severity": "critical" | "warning",
      "finding": "brief description of the issue",
      "suggestedFix": "how to fix it"
    }
  ],
  "revisedResponse": "full corrected response text (only if verdict is REVISE)"
}
\`\`\`

If all checklist items PASS, return verdict "APPROVE" with an empty issues array and no revisedResponse.
If any item FAILs, return verdict "REVISE" with the issues and a corrected response.`;
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-rubric.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-rubric.ts lib/__tests__/advisor-rubric.test.ts
git commit -m "feat: add DIY safety review rubric with 6-point checklist and few-shot support"
```

---

### Task 5: Build the custom review loop

**Files:**
- Create: `lib/advisor-custom-loop.ts`
- Create: `lib/__tests__/advisor-custom-loop.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/advisor-custom-loop.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCustomReviewLoop } from '@/lib/advisor-custom-loop';
import type { ReviewModelProvider } from '@/lib/advisor-provider';

function makeMockProvider(responses: string[]): ReviewModelProvider {
  let callIndex = 0;
  return {
    name: 'mock',
    model: 'mock-model',
    call: vi.fn(async () => {
      const text = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return { text, inputTokens: 500, outputTokens: 200 };
    }),
  };
}

function approveJson() {
  return '```json\n' + JSON.stringify({
    verdict: 'APPROVE',
    confidence: 0.95,
    issues: [],
  }) + '\n```';
}

function reviseJson(revisedResponse: string, issues?: unknown[]) {
  return '```json\n' + JSON.stringify({
    verdict: 'REVISE',
    confidence: 0.8,
    issues: issues ?? [{ rubricItem: 3, severity: 'critical', finding: 'Missing safety warning', suggestedFix: 'Add warning' }],
    revisedResponse,
  }) + '\n```';
}

describe('runCustomReviewLoop', () => {
  it('returns original response when reviewer approves on first pass', async () => {
    const provider = makeMockProvider([approveJson()]);

    const result = await runCustomReviewLoop({
      userMessage: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(result.finalResponse).toBe('To patch drywall, first cut a square...');
    expect(result.iterationsUsed).toBe(1);
    expect(result.wasRevised).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it('returns revised response when reviewer requests revision', async () => {
    const provider = makeMockProvider([
      reviseJson('Corrected: To patch drywall safely...'),
      approveJson(),
    ]);

    const result = await runCustomReviewLoop({
      userMessage: 'How do I replace an outlet?',
      draftResponse: 'Just pull the outlet out and...',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['outlet install'],
    });

    expect(result.finalResponse).toBe('Corrected: To patch drywall safely...');
    expect(result.iterationsUsed).toBe(2);
    expect(result.wasRevised).toBe(true);
    expect(result.issues).toHaveLength(1);
  });

  it('stops after maxIterations even with continued REVISE verdicts', async () => {
    const provider = makeMockProvider([
      reviseJson('Revision 1'),
      reviseJson('Revision 2'),
    ]);

    const result = await runCustomReviewLoop({
      userMessage: 'Gas line question',
      draftResponse: 'Original draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });

    expect(result.finalResponse).toBe('Revision 2');
    expect(result.iterationsUsed).toBe(2);
    expect(provider.call).toHaveBeenCalledTimes(2);
  });

  it('stops on first iteration with early stop and APPROVE', async () => {
    const provider = makeMockProvider([approveJson()]);

    const result = await runCustomReviewLoop({
      userMessage: 'Simple question',
      draftResponse: 'Simple answer',
      provider,
      maxIterations: 3,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(result.iterationsUsed).toBe(1);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it('tracks reviewer token usage across iterations', async () => {
    const provider = makeMockProvider([
      reviseJson('Revision 1'),
      approveJson(),
    ]);

    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(result.reviewerTokens.inputTokens).toBe(1000);  // 500 * 2
    expect(result.reviewerTokens.outputTokens).toBe(400);   // 200 * 2
  });

  it('handles malformed reviewer JSON gracefully', async () => {
    const provider = makeMockProvider(['This is not JSON at all']);

    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Original draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(result.finalResponse).toBe('Original draft');
    expect(result.parseErrors).toHaveLength(1);
  });

  it('includes rubric version in result', async () => {
    const provider = makeMockProvider([approveJson()]);

    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Draft',
      provider,
      maxIterations: 1,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(result.rubricVersion).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-custom-loop.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the custom loop module**

Create `lib/advisor-custom-loop.ts`:

```typescript
// Custom review loop — iterative safety review using a model-agnostic provider.
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §4: Prompt-only approach is phase 1; fine-tuning at ~200+ curated examples.
// §6: Fallback to original response on parse failure (graceful degradation).
// §8: Early stopping and max iteration cap (diminishing returns after 2-3 iterations).

import { buildReviewPrompt, RUBRIC_VERSION } from '@/lib/advisor-rubric';
import type { FewShotExample } from '@/lib/advisor-rubric';
import type { ReviewModelProvider } from '@/lib/advisor-provider';
import { logger } from '@/lib/logger';

export interface ReviewIssue {
  rubricItem: number;
  severity: 'critical' | 'warning';
  finding: string;
  suggestedFix: string;
}

export interface ReviewVerdict {
  verdict: 'APPROVE' | 'REVISE';
  confidence: number;
  issues: ReviewIssue[];
  revisedResponse?: string;
}

export interface ReviewLoopResult {
  finalResponse: string;
  wasRevised: boolean;
  iterationsUsed: number;
  issues: ReviewIssue[];
  reviewerTokens: { inputTokens: number; outputTokens: number };
  parseErrors: string[];
  latencyMs: number;
  rubricVersion: number;
}

interface ReviewLoopParams {
  userMessage: string;
  draftResponse: string;
  provider: ReviewModelProvider;
  maxIterations: number;
  earlyStopOnApproval: boolean;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  fewShotExamples?: FewShotExample[];
}

function parseVerdict(text: string): ReviewVerdict | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    if (parsed.verdict !== 'APPROVE' && parsed.verdict !== 'REVISE') return null;
    return parsed as ReviewVerdict;
  } catch {
    return null;
  }
}

export async function runCustomReviewLoop(params: ReviewLoopParams): Promise<ReviewLoopResult> {
  const {
    userMessage,
    draftResponse,
    provider,
    maxIterations,
    earlyStopOnApproval,
    safetyKeywordsDetected,
    safetyKeywordsMatched,
    fewShotExamples,
  } = params;

  const startTime = Date.now();

  const result: ReviewLoopResult = {
    finalResponse: draftResponse,
    wasRevised: false,
    iterationsUsed: 0,
    issues: [],
    reviewerTokens: { inputTokens: 0, outputTokens: 0 },
    parseErrors: [],
    latencyMs: 0,
    rubricVersion: RUBRIC_VERSION,
  };

  let currentDraft = draftResponse;

  for (let i = 0; i < maxIterations; i++) {
    result.iterationsUsed++;

    const reviewPrompt = buildReviewPrompt({
      userQuestion: userMessage,
      draftResponse: currentDraft,
      safetyKeywordsDetected,
      safetyKeywordsMatched,
      fewShotExamples,
    });

    let response;
    try {
      response = await provider.call(undefined, reviewPrompt);
    } catch (err) {
      logger.error('Custom review loop API call failed', { error: err, iteration: i + 1 });
      break;
    }

    result.reviewerTokens.inputTokens += response.inputTokens;
    result.reviewerTokens.outputTokens += response.outputTokens;

    if (!response.text) {
      result.parseErrors.push(`Iteration ${i + 1}: empty response from reviewer`);
      break;
    }

    const verdict = parseVerdict(response.text);
    if (!verdict) {
      result.parseErrors.push(`Iteration ${i + 1}: could not parse verdict JSON`);
      break;
    }

    if (verdict.verdict === 'APPROVE') {
      if (earlyStopOnApproval) break;
      continue;
    }

    // REVISE verdict
    result.issues.push(...verdict.issues);

    if (verdict.revisedResponse) {
      currentDraft = verdict.revisedResponse;
      result.finalResponse = currentDraft;
      result.wasRevised = true;
    }
  }

  result.latencyMs = Date.now() - startTime;
  return result;
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-custom-loop.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-custom-loop.ts lib/__tests__/advisor-custom-loop.test.ts
git commit -m "feat: add custom review loop with provider abstraction and early stopping"
```

---

### Task 6: Update advisor metrics for custom mode

**Files:**
- Modify: `lib/advisor-metrics.ts`
- Modify: `lib/__tests__/advisor-metrics.test.ts`

- [ ] **Step 1: Write the failing tests for custom loop metrics**

Append to the end of `lib/__tests__/advisor-metrics.test.ts` (before the final closing, if any — the file currently ends at line 145):

```typescript
describe('custom loop metrics', () => {
  it('tracks advisorMode field', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'test-1',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(metrics.advisorMode).toBe('custom');
    expect(metrics.customReviewerModel).toBe('claude-haiku-4-5-20251001');
    expect(metrics.customLoopIterations).toBe(0);
    expect(metrics.customLoopWasRevised).toBe(false);
  });

  it('records custom loop results', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'test-2',
      intentType: 'troubleshooting',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['electrical panel'],
    });

    recordCustomLoopResult(metrics, {
      iterationsUsed: 2,
      wasRevised: true,
      reviewerInputTokens: 1000,
      reviewerOutputTokens: 400,
      latencyMs: 850,
    });

    expect(metrics.customLoopIterations).toBe(2);
    expect(metrics.customLoopWasRevised).toBe(true);
    expect(metrics.advisorInputTokens).toBe(1000);
    expect(metrics.advisorOutputTokens).toBe(400);
    expect(metrics.customLoopLatencyMs).toBe(850);
  });

  it('calculates cost correctly for custom mode using Haiku rates', () => {
    const metrics: AdvisorMetrics = {
      requestId: 'test-3',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      apiCallLatencyMs: [],
      totalLatencyMs: 0,
      executorInputTokens: 1000,
      executorOutputTokens: 500,
      advisorInputTokens: 2000,
      advisorOutputTokens: 800,
      customLoopIterations: 2,
      customLoopWasRevised: true,
      customLoopLatencyMs: 850,
    };

    const cost = calculateEstimatedCost(metrics);
    // Sonnet: (1000/1M * 3.0) + (500/1M * 15.0) = 0.003 + 0.0075 = 0.0105
    // Haiku:  (2000/1M * 0.8) + (800/1M * 4.0)  = 0.0016 + 0.0032 = 0.0048
    // Total: 0.0153
    expect(cost).toBeCloseTo(0.0153, 4);
  });
});
```

Also update the import at the top to include the new exports:

```typescript
import {
  createAdvisorMetrics,
  recordApiCall,
  recordAdvisorUsage,
  recordCustomLoopResult,
  calculateEstimatedCost,
  type AdvisorMetrics,
} from '@/lib/advisor-metrics';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-metrics.test.ts`
Expected: FAIL — `advisorMode`, `customReviewerModel`, `recordCustomLoopResult` do not exist.

- [ ] **Step 3: Rewrite advisor-metrics.ts**

Replace the full contents of `lib/advisor-metrics.ts`:

```typescript
import { logger } from '@/lib/logger';

export interface AdvisorMetrics {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorMode: 'off' | 'beta' | 'custom';
  advisorModel: string | null;
  customReviewerModel: string | null;
  advisorMaxUses: number;
  advisorActualUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  apiCallLatencyMs: number[];
  totalLatencyMs: number;
  executorInputTokens: number;
  executorOutputTokens: number;
  advisorInputTokens: number;
  advisorOutputTokens: number;
  // Custom loop specific
  customLoopIterations: number;
  customLoopWasRevised: boolean;
  customLoopLatencyMs: number;
}

interface CreateMetricsParams {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorMode: 'off' | 'beta' | 'custom';
  advisorModel: string | null;
  customReviewerModel: string | null;
  advisorMaxUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
}

interface ApiCallResult {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

// Per-million-token pricing (USD). Update when Anthropic changes pricing.
const TOKEN_RATES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':            { input: 15.0,  output: 75.0  },
  'claude-sonnet-4-6':          { input: 3.0,   output: 15.0  },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.0   },
};

const DEFAULT_RATE = { input: 3.0, output: 15.0 };

export function createAdvisorMetrics(params: CreateMetricsParams): AdvisorMetrics {
  return {
    ...params,
    advisorActualUses: 0,
    apiCallLatencyMs: [],
    totalLatencyMs: 0,
    executorInputTokens: 0,
    executorOutputTokens: 0,
    advisorInputTokens: 0,
    advisorOutputTokens: 0,
    customLoopIterations: 0,
    customLoopWasRevised: false,
    customLoopLatencyMs: 0,
  };
}

export function recordApiCall(metrics: AdvisorMetrics, result: ApiCallResult): void {
  metrics.executorInputTokens += result.inputTokens;
  metrics.executorOutputTokens += result.outputTokens;
  metrics.apiCallLatencyMs.push(result.latencyMs);
}

export function recordAdvisorUsage(
  metrics: AdvisorMetrics,
  advisorInputTokens: number,
  advisorOutputTokens: number,
): void {
  metrics.advisorActualUses += 1;
  metrics.advisorInputTokens += advisorInputTokens;
  metrics.advisorOutputTokens += advisorOutputTokens;
}

interface CustomLoopResultParams {
  iterationsUsed: number;
  wasRevised: boolean;
  reviewerInputTokens: number;
  reviewerOutputTokens: number;
  latencyMs: number;
}

export function recordCustomLoopResult(
  metrics: AdvisorMetrics,
  result: CustomLoopResultParams,
): void {
  metrics.customLoopIterations = result.iterationsUsed;
  metrics.customLoopWasRevised = result.wasRevised;
  metrics.customLoopLatencyMs = result.latencyMs;
  metrics.advisorInputTokens += result.reviewerInputTokens;
  metrics.advisorOutputTokens += result.reviewerOutputTokens;
}

export function calculateEstimatedCost(metrics: AdvisorMetrics): number {
  const executorRate = TOKEN_RATES[metrics.executorModel] || DEFAULT_RATE;
  const executorCost =
    (metrics.executorInputTokens / 1_000_000) * executorRate.input +
    (metrics.executorOutputTokens / 1_000_000) * executorRate.output;

  let reviewerCost = 0;
  const reviewerModelId = metrics.advisorModel || metrics.customReviewerModel;
  if (reviewerModelId) {
    const reviewerRate = TOKEN_RATES[reviewerModelId] || DEFAULT_RATE;
    reviewerCost =
      (metrics.advisorInputTokens / 1_000_000) * reviewerRate.input +
      (metrics.advisorOutputTokens / 1_000_000) * reviewerRate.output;
  }

  return executorCost + reviewerCost;
}

export function logAdvisorMetrics(metrics: AdvisorMetrics): void {
  metrics.totalLatencyMs = metrics.apiCallLatencyMs.reduce((a, b) => a + b, 0);
  const estimatedCostUsd = calculateEstimatedCost(metrics);

  logger.info('Advisor metrics', {
    requestId: metrics.requestId,
    intentType: metrics.intentType,
    executorModel: metrics.executorModel,
    advisorMode: metrics.advisorMode,
    advisorModel: metrics.advisorModel,
    customReviewerModel: metrics.customReviewerModel,
    advisorEnabled: metrics.advisorMaxUses > 0 || metrics.advisorMode === 'custom',
    advisorMaxUses: metrics.advisorMaxUses,
    advisorActualUses: metrics.advisorActualUses,
    customLoopIterations: metrics.customLoopIterations,
    customLoopWasRevised: metrics.customLoopWasRevised,
    customLoopLatencyMs: metrics.customLoopLatencyMs,
    safetyKeywordsDetected: metrics.safetyKeywordsDetected,
    safetyKeywordsMatched: metrics.safetyKeywordsMatched,
    apiCallLatencyMs: metrics.apiCallLatencyMs,
    totalLatencyMs: metrics.totalLatencyMs,
    executorInputTokens: metrics.executorInputTokens,
    executorOutputTokens: metrics.executorOutputTokens,
    advisorInputTokens: metrics.advisorInputTokens,
    advisorOutputTokens: metrics.advisorOutputTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
  });
}
```

- [ ] **Step 4: Update existing test `createAdvisorMetrics` calls**

In `lib/__tests__/advisor-metrics.test.ts`, update ALL existing `createAdvisorMetrics` calls (in the `createAdvisorMetrics`, `recordApiCall`, and `recordAdvisorUsage` describe blocks) to include the new required fields. Add these two fields to each call:

```typescript
advisorMode: 'beta',
customReviewerModel: null,
```

For example, the first call (line 12) becomes:

```typescript
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      advisorModel: 'claude-opus-4-6',
      customReviewerModel: null,
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
```

Apply the same pattern to ALL four existing `createAdvisorMetrics` calls (lines 12, 34, 54, 72).

Also update the two inline `AdvisorMetrics` objects in `calculateEstimatedCost` tests (lines 92 and 115) to include:

```typescript
      advisorMode: 'beta',
      customReviewerModel: null,
      customLoopIterations: 0,
      customLoopWasRevised: false,
      customLoopLatencyMs: 0,
```

- [ ] **Step 5: Run all metrics tests**

Run: `npx vitest run lib/__tests__/advisor-metrics.test.ts`
Expected: All PASS (both old and new tests).

- [ ] **Step 6: Commit**

```bash
git add lib/advisor-metrics.ts lib/__tests__/advisor-metrics.test.ts
git commit -m "feat: extend advisor metrics for custom review loop tracking"
```

---

### Task 7: Supabase migration — 5 advisor review tables

**Files:**
- Create: `supabase/migrations/20260410000000_advisor_review_tables.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260410000000_advisor_review_tables.sql`:

```sql
-- Advisor review loop tables
-- Supports: rubric examples (cold-start + live), review audit log, canary tests, correction queue
-- Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453

-- ── Rubric Examples ─────────────────────────────────────────────────────────
-- Few-shot examples injected into the reviewer prompt. Grows over time.
-- Cold-start examples (source='synthetic_seed') are gradually outranked
-- by expert corrections (weight 0.9) and user reports (weight 0.5).
CREATE TABLE advisor_rubric_examples (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  category            text NOT NULL,
  user_question       text NOT NULL,
  bad_response        text NOT NULL,
  good_response       text NOT NULL,
  rubric_items_failed integer[] NOT NULL,
  severity            text NOT NULL DEFAULT 'critical'
                        CHECK (severity IN ('critical', 'warning')),
  source              text NOT NULL
                        CHECK (source IN ('synthetic_seed', 'user_report', 'community_verified', 'expert_correction', 'canary_failure')),
  weight              real NOT NULL DEFAULT 0.3,
  explanation         text,
  is_active           boolean NOT NULL DEFAULT true,
  rubric_version      integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_rubric_examples_weighted
  ON advisor_rubric_examples(category, weight DESC)
  WHERE is_active;

-- ── Review Audit Log ────────────────────────────────────────────────────────
-- Every review verdict (beta and custom) is logged here for audit trail.
-- Required for safety-critical domains (arXiv:2510.02453 §9).
CREATE TABLE advisor_review_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  request_id            text NOT NULL,
  intent_type           text NOT NULL,
  advisor_mode          text NOT NULL CHECK (advisor_mode IN ('beta', 'custom')),
  reviewer_model        text NOT NULL,
  user_question         text NOT NULL,
  draft_response        text NOT NULL,
  verdict               text NOT NULL CHECK (verdict IN ('APPROVE', 'REVISE')),
  confidence            real,
  issues                jsonb NOT NULL DEFAULT '[]',
  revised_response      text,
  iterations_used       integer NOT NULL,
  safety_keywords       text[] NOT NULL DEFAULT '{}',
  rubric_version        integer NOT NULL,
  reviewer_tokens_in    integer NOT NULL,
  reviewer_tokens_out   integer NOT NULL,
  latency_ms            integer NOT NULL
);

CREATE INDEX idx_review_log_created ON advisor_review_log(created_at DESC);
CREATE INDEX idx_review_log_verdict ON advisor_review_log(verdict, created_at DESC);

-- ── Canary Tests ────────────────────────────────────────────────────────────
-- Known-bad responses the reviewer MUST flag. Used to detect reviewer drift
-- (confirmation bias — arXiv:2510.02453 §6).
CREATE TABLE advisor_canary_tests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  category            text NOT NULL,
  user_question       text NOT NULL,
  bad_response        text NOT NULL,
  expected_rubric_items integer[] NOT NULL,
  is_active           boolean NOT NULL DEFAULT true
);

-- ── Canary Results ──────────────────────────────────────────────────────────
-- Track canary test results over time. If catch rate drops, reviewer is drifting.
CREATE TABLE advisor_canary_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at              timestamptz NOT NULL DEFAULT now(),
  canary_test_id      uuid NOT NULL REFERENCES advisor_canary_tests(id),
  reviewer_model      text NOT NULL,
  rubric_version      integer NOT NULL,
  caught              boolean NOT NULL,
  verdict             text NOT NULL,
  issues              jsonb NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_canary_results_run ON advisor_canary_results(run_at DESC);

-- ── Correction Queue ────────────────────────────────────────────────────────
-- Staging table for user/expert corrections before promotion to rubric_examples.
-- Prevents garbage-in-garbage-out (arXiv:2510.02453 §3).
CREATE TABLE advisor_correction_queue (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  source                text NOT NULL
                          CHECK (source IN ('user_flag', 'expert_correction', 'expert_review')),
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'promoted')),
  user_question         text NOT NULL,
  ai_response           text NOT NULL,
  flag_type             text,
  correction_text       text,
  corrected_response    text,
  conversation_id       text,
  message_id            text,
  reporter_id           uuid,
  reporter_role         text NOT NULL CHECK (reporter_role IN ('diy_user', 'expert')),
  expert_specialties    text[] DEFAULT '{}',
  category              text,
  rubric_items_failed   integer[],
  severity              text CHECK (severity IS NULL OR severity IN ('critical', 'warning')),
  promoted_at           timestamptz,
  promoted_to           uuid REFERENCES advisor_rubric_examples(id)
);

CREATE INDEX idx_correction_queue_status
  ON advisor_correction_queue(status, created_at DESC);
CREATE INDEX idx_correction_queue_pattern
  ON advisor_correction_queue(category, flag_type)
  WHERE status = 'pending';

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- These tables are written by server-side code (service role), not client-side.
-- Enable RLS but only grant service_role access.
ALTER TABLE advisor_rubric_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_review_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_canary_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_canary_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_correction_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (no policies needed for service role — it bypasses RLS).
-- Authenticated users can insert corrections (their own flags).
CREATE POLICY "Users can insert their own corrections"
  ON advisor_correction_queue FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` or `npx supabase migration up`
Expected: Migration applies successfully. Verify with: `npx supabase db reset --dry-run` (no errors).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260410000000_advisor_review_tables.sql
git commit -m "feat: add Supabase migration for advisor review loop tables (5 tables)"
```

---

### Task 8: Seed script — Claude-generated cold-start rubric data

**Files:**
- Create: `scripts/seed-rubric-examples.ts`

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-rubric-examples.ts`:

```typescript
#!/usr/bin/env npx tsx
// Cold-start seed script: generates DIY safety rubric examples using Opus.
// Run once to populate advisor_rubric_examples before launching custom review mode.
//
// Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/seed-rubric-examples.ts
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §3: Start with ~100-200 curated examples; fine-tuning threshold is ~200+.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SCENARIOS = [
  { category: 'electrical', scenarios: [
    'replacing a circuit breaker in a residential panel',
    'adding a new 20-amp outlet to a kitchen',
    'installing a GFCI outlet near a bathroom sink',
    'wiring a subpanel in a detached garage',
    'upgrading from 100-amp to 200-amp service',
    'replacing a light switch with a dimmer',
    'installing recessed lighting in a finished ceiling',
    'fixing a tripped AFCI breaker that keeps tripping',
    'adding an outlet in an unfinished basement',
    'replacing knob-and-tube wiring in an older home',
  ]},
  { category: 'plumbing', scenarios: [
    'replacing a water heater (gas)',
    'installing a gas line for a clothes dryer',
    'fixing a slab leak under a concrete foundation',
    'adding a bathroom in a finished basement',
    'replacing a main water shutoff valve',
    'installing a sump pump in a crawl space',
    'repiping a house from galvanized to PEX',
    'fixing a leaking toilet flange',
  ]},
  { category: 'structural', scenarios: [
    'removing a load-bearing wall and adding a beam',
    'sistering damaged floor joists',
    'repairing a cracked foundation wall',
    'adding a header for a new window opening',
    'building a deck attached to the house',
    'shoring up a sagging floor over a crawl space',
  ]},
  { category: 'gas', scenarios: [
    'connecting a gas range to an existing gas line',
    'relighting a pilot light on a gas water heater',
    'converting a gas appliance from natural gas to propane',
    'detecting and fixing a gas leak smell',
  ]},
  { category: 'roofing', scenarios: [
    'replacing damaged asphalt shingles after a storm',
    'installing flashing around a chimney',
    'repairing a leaking skylight',
    'adding attic ventilation (ridge vent or soffit vents)',
  ]},
  { category: 'hazmat', scenarios: [
    'testing for and encapsulating lead paint before renovation',
    'dealing with suspected asbestos floor tiles',
    'removing mold in a bathroom with poor ventilation',
    'working in a space with vermiculite insulation (potential asbestos)',
  ]},
];

const GENERATION_PROMPT = `You are generating training data for a DIY safety reviewer AI.

For the scenario: "{scenario}"

Generate a JSON object with these fields:
1. "user_question" — a realistic question a homeowner would ask (1-2 sentences)
2. "bad_response" — a plausible but UNSAFE or INCORRECT response that an AI assistant might give.
   Make the mistake SUBTLE and REALISTIC, not obviously wrong. Focus on ONE of:
   - Missing safety warnings before dangerous steps
   - Wrong material specifications (e.g., wrong wire gauge for amperage)
   - Omitting the need for permits or licensed professionals
   - Steps in wrong order that could cause injury
   - Incorrect code references or outdated code citations
   - Presenting uncertain info as fact
3. "good_response" — the corrected, safe version of the same response
4. "rubric_items_failed" — array of which rubric items (1-6) the bad response violates:
   1=Professional Referral, 2=Code Compliance, 3=Safety Warnings,
   4=Sequence Accuracy, 5=Material Specs, 6=Scope Honesty
5. "severity" — "critical" or "warning"
6. "explanation" — 1-2 sentences: why this mistake is dangerous (for human reviewers)

Return ONLY the JSON object, no markdown code block.`;

async function generateExample(category: string, scenario: string) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: GENERATION_PROMPT.replace('{scenario}', scenario),
    }],
  });

  const text = response.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text in response');

  const parsed = JSON.parse(text.text);
  return {
    category,
    user_question: parsed.user_question,
    bad_response: parsed.bad_response,
    good_response: parsed.good_response,
    rubric_items_failed: parsed.rubric_items_failed,
    severity: parsed.severity,
    explanation: parsed.explanation,
    source: 'synthetic_seed' as const,
    weight: 0.3,
    is_active: true,
    rubric_version: 1,
  };
}

async function main() {
  console.log('Seeding rubric examples...\n');

  let total = 0;
  let errors = 0;

  for (const { category, scenarios } of SCENARIOS) {
    console.log(`\n── ${category} (${scenarios.length} scenarios) ──`);

    for (const scenario of scenarios) {
      try {
        const example = await generateExample(category, scenario);
        const { error } = await supabase
          .from('advisor_rubric_examples')
          .insert(example);

        if (error) {
          console.error(`  FAIL: ${scenario} — ${error.message}`);
          errors++;
        } else {
          console.log(`  OK: ${scenario}`);
          total++;
        }
      } catch (err) {
        console.error(`  FAIL: ${scenario} — ${err}`);
        errors++;
      }

      // Rate limit: 1 request per second
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nDone. Inserted ${total} examples, ${errors} errors.`);
}

main().catch(console.error);
```

- [ ] **Step 2: Commit (do NOT run the script yet — it requires API keys and a running Supabase)**

```bash
git add scripts/seed-rubric-examples.ts
git commit -m "feat: add cold-start seed script for DIY safety rubric examples"
```

---

### Task 9: Dynamic rubric builder — weighted Supabase pull

**Files:**
- Create: `lib/advisor-rubric-db.ts`
- Create: `lib/__tests__/advisor-rubric-db.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/advisor-rubric-db.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getWeightedExamples } from '@/lib/advisor-rubric-db';

// Mock supabase-admin
vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function(this: unknown) { return this; }),
        or: vi.fn(function(this: unknown) { return this; }),
        order: vi.fn(function(this: unknown) { return this; }),
        limit: vi.fn(() => ({
          data: [
            { user_question: 'q1', bad_response: 'bad1', good_response: 'good1', rubric_items_failed: [3], severity: 'critical', weight: 0.9 },
            { user_question: 'q2', bad_response: 'bad2', good_response: 'good2', rubric_items_failed: [5], severity: 'warning', weight: 0.5 },
            { user_question: 'q3', bad_response: 'bad3', good_response: 'good3', rubric_items_failed: [1], severity: 'critical', weight: 0.3 },
          ],
          error: null,
        })),
      })),
    })),
  }),
}));

describe('getWeightedExamples', () => {
  it('returns examples as FewShotExample format', async () => {
    const examples = await getWeightedExamples('electrical', 2);

    expect(examples.length).toBeLessThanOrEqual(2);
    expect(examples[0]).toHaveProperty('userQuestion');
    expect(examples[0]).toHaveProperty('badResponse');
    expect(examples[0]).toHaveProperty('goodResponse');
    expect(examples[0]).toHaveProperty('rubricItemsFailed');
    expect(examples[0]).toHaveProperty('severity');
  });

  it('returns empty array when no data', async () => {
    // Override mock for this test
    const { getAdminClient } = await import('@/lib/supabase-admin');
    vi.mocked(getAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(function(this: unknown) { return this; }),
          or: vi.fn(function(this: unknown) { return this; }),
          order: vi.fn(function(this: unknown) { return this; }),
          limit: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    } as never);

    const examples = await getWeightedExamples('plumbing', 5);
    expect(examples).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-rubric-db.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the rubric DB module**

Create `lib/advisor-rubric-db.ts`:

```typescript
// Weighted few-shot example retrieval from Supabase.
// Higher-weight examples (expert corrections) are prioritized over
// lower-weight ones (synthetic seed data) via weighted random sampling.
//
// Research basis: Asawa et al. (2025) arXiv:2510.02453
// §7: Diversity sampling prevents confirmation bias.

import { getAdminClient } from '@/lib/supabase-admin';
import type { FewShotExample } from '@/lib/advisor-rubric';
import { logger } from '@/lib/logger';

interface RubricRow {
  user_question: string;
  bad_response: string;
  good_response: string;
  rubric_items_failed: number[];
  severity: 'critical' | 'warning';
  weight: number;
}

function weightedSample<T extends { weight: number }>(items: T[], n: number): T[] {
  if (items.length <= n) return items;

  const selected: T[] = [];
  const pool = [...items];

  for (let i = 0; i < n && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

export async function getWeightedExamples(
  category: string,
  limit: number = 5,
): Promise<FewShotExample[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('advisor_rubric_examples')
      .select('user_question, bad_response, good_response, rubric_items_failed, severity, weight')
      .eq('is_active', true)
      .or(`category.eq.${category},category.eq.general`)
      .order('weight', { ascending: false })
      .limit(limit * 3);

    if (error) {
      logger.error('Failed to fetch rubric examples', { error, category });
      return [];
    }

    if (!data || data.length === 0) return [];

    const sampled = weightedSample(data as RubricRow[], limit);

    return sampled.map(row => ({
      userQuestion: row.user_question,
      badResponse: row.bad_response,
      goodResponse: row.good_response,
      rubricItemsFailed: row.rubric_items_failed,
      severity: row.severity,
    }));
  } catch (err) {
    logger.error('Exception fetching rubric examples', { error: err, category });
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-rubric-db.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-rubric-db.ts lib/__tests__/advisor-rubric-db.test.ts
git commit -m "feat: add weighted few-shot example retrieval from Supabase"
```

---

### Task 10: Audit trail — log review verdicts to Supabase

**Files:**
- Create: `lib/advisor-audit.ts`
- Create: `lib/__tests__/advisor-audit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/advisor-audit.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { logReviewVerdict } from '@/lib/advisor-audit';

const mockInsert = vi.fn(() => ({ error: null }));
vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}));

describe('logReviewVerdict', () => {
  it('inserts a row into advisor_review_log', async () => {
    await logReviewVerdict({
      requestId: 'req-123',
      intentType: 'full_project',
      advisorMode: 'custom',
      reviewerModel: 'claude-haiku-4-5-20251001',
      userQuestion: 'How do I wire an outlet?',
      draftResponse: 'First, turn off the breaker...',
      verdict: 'APPROVE',
      confidence: 0.95,
      issues: [],
      revisedResponse: null,
      iterationsUsed: 1,
      safetyKeywords: ['outlet install'],
      rubricVersion: 1,
      reviewerTokensIn: 500,
      reviewerTokensOut: 200,
      latencyMs: 850,
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.request_id).toBe('req-123');
    expect(insertedRow.advisor_mode).toBe('custom');
    expect(insertedRow.verdict).toBe('APPROVE');
    expect(insertedRow.rubric_version).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-audit.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the audit module**

Create `lib/advisor-audit.ts`:

```typescript
// Audit trail: logs every review verdict to Supabase for compliance and drift detection.
// Required for safety-critical domains (arXiv:2510.02453 §9).

import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

interface ReviewVerdictLog {
  requestId: string;
  intentType: string;
  advisorMode: 'beta' | 'custom';
  reviewerModel: string;
  userQuestion: string;
  draftResponse: string;
  verdict: 'APPROVE' | 'REVISE';
  confidence: number | null;
  issues: unknown[];
  revisedResponse: string | null;
  iterationsUsed: number;
  safetyKeywords: string[];
  rubricVersion: number;
  reviewerTokensIn: number;
  reviewerTokensOut: number;
  latencyMs: number;
}

export async function logReviewVerdict(params: ReviewVerdictLog): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('advisor_review_log')
      .insert({
        request_id: params.requestId,
        intent_type: params.intentType,
        advisor_mode: params.advisorMode,
        reviewer_model: params.reviewerModel,
        user_question: params.userQuestion,
        draft_response: params.draftResponse,
        verdict: params.verdict,
        confidence: params.confidence,
        issues: params.issues,
        revised_response: params.revisedResponse,
        iterations_used: params.iterationsUsed,
        safety_keywords: params.safetyKeywords,
        rubric_version: params.rubricVersion,
        reviewer_tokens_in: params.reviewerTokensIn,
        reviewer_tokens_out: params.reviewerTokensOut,
        latency_ms: params.latencyMs,
      });

    if (error) {
      logger.error('Failed to log review verdict', { error, requestId: params.requestId });
    }
  } catch (err) {
    // Non-fatal: audit logging should never break the response flow
    logger.error('Exception logging review verdict', { error: err, requestId: params.requestId });
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-audit.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-audit.ts lib/__tests__/advisor-audit.test.ts
git commit -m "feat: add audit trail for review verdicts to Supabase"
```

---

## Phase 2 — Correction Collection UI

### Task 11: Chat message feedback component (thumbs up + flag)

**Files:**
- Create: `components/ChatMessageFeedback.tsx`
- Modify: `components/ChatMessages.tsx:236-260`

- [ ] **Step 1: Create the feedback component**

Create `components/ChatMessageFeedback.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { ThumbsUp, Flag, X, Send, Loader2 } from 'lucide-react';

interface ChatMessageFeedbackProps {
  messageIndex: number;
  conversationId: string | null;
  userMessage: string;
  aiResponse: string;
}

const FLAG_TYPES = [
  { value: 'safety', label: 'Safety concern' },
  { value: 'incorrect', label: 'Incorrect information' },
  { value: 'missing_steps', label: 'Missing important steps' },
  { value: 'wrong_for_situation', label: 'Wrong for my situation' },
] as const;

type FlagType = typeof FLAG_TYPES[number]['value'];

export default function ChatMessageFeedback({
  messageIndex,
  conversationId,
  userMessage,
  aiResponse,
}: ChatMessageFeedbackProps) {
  const [thumbsUpDone, setThumbsUpDone] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagType, setFlagType] = useState<FlagType | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flagDone, setFlagDone] = useState(false);

  const handleThumbsUp = async () => {
    setThumbsUpDone(true);
    try {
      await fetch('/api/chat/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageIndex,
          feedbackType: 'thumbs_up',
        }),
      });
    } catch { /* silent — non-critical */ }
  };

  const handleFlagSubmit = async () => {
    if (!flagType) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/chat/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageIndex,
          feedbackType: 'flag',
          flagType,
          details: details.trim() || undefined,
          userMessage,
          aiResponse,
        }),
      });
      if (res.ok) {
        setFlagDone(true);
        setShowFlagForm(false);
      }
    } catch { /* silent */ }
    setSubmitting(false);
  };

  if (flagDone) {
    return (
      <span className="text-xs text-forest-green flex items-center gap-1 mt-1">
        <Flag className="w-3.5 h-3.5" /> Thanks for the feedback
      </span>
    );
  }

  return (
    <div className="mt-1">
      {!showFlagForm && (
        <div className="flex items-center gap-2">
          {thumbsUpDone ? (
            <span className="text-xs text-forest-green flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" /> Helpful
            </span>
          ) : (
            <button
              onClick={handleThumbsUp}
              className="text-xs text-earth-brown-light hover:text-forest-green transition-colors flex items-center gap-1"
              title="This response was helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowFlagForm(true)}
            className="text-xs text-earth-brown-light hover:text-rust transition-colors flex items-center gap-1"
            title="Flag an issue with this response"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showFlagForm && (
        <div className="mt-2 bg-earth-tan/20 border border-earth-sand rounded-lg p-3 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">What&apos;s wrong?</span>
            <button onClick={() => setShowFlagForm(false)} className="text-earth-brown-light hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {FLAG_TYPES.map(ft => (
              <button
                key={ft.value}
                onClick={() => setFlagType(ft.value)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  flagType === ft.value
                    ? 'bg-rust text-white border-rust'
                    : 'bg-white border-earth-sand text-earth-brown hover:border-rust'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Tell us more (optional)..."
            rows={2}
            maxLength={500}
            className="w-full text-xs border border-earth-sand rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-rust"
          />

          <button
            onClick={handleFlagSubmit}
            disabled={!flagType || submitting}
            className="mt-1.5 flex items-center gap-1 px-3 py-1 text-xs bg-rust text-white rounded-lg disabled:opacity-50 hover:bg-rust/90 transition-colors"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into ChatMessages.tsx**

In `components/ChatMessages.tsx`, add the import at the top (after the existing imports around line 8):

```typescript
import ChatMessageFeedback from './ChatMessageFeedback';
```

Then replace the existing skill-profile feedback block (lines 236-260) with:

```tsx
                {msg.role === 'assistant' && (
                  <ChatMessageFeedback
                    messageIndex={idx}
                    conversationId={null}
                    userMessage={idx > 0 ? messages[idx - 1]?.content || '' : ''}
                    aiResponse={msg.content}
                  />
                )}
```

Note: `ChatMessages.tsx` does not currently receive `conversationId` as a prop. The parent component will need to pass it down. For now, passing `null` is safe — the flag API will accept it as optional.

- [ ] **Step 3: Commit**

```bash
git add components/ChatMessageFeedback.tsx components/ChatMessages.tsx
git commit -m "feat: add thumbs up + flag feedback buttons on chat AI responses"
```

---

### Task 12: Flag API route

**Files:**
- Create: `app/api/chat/flag/route.ts`
- Create: `app/api/chat/flag/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/chat/flag/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
const mockInsert = vi.fn(() => ({ error: null }));
vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('POST /api/chat/flag', () => {
  it('inserts a user flag into correction_queue', async () => {
    // Dynamic import to pick up mocks
    const { POST } = await import('@/app/api/chat/flag/route');

    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'flag',
        flagType: 'safety',
        userMessage: 'How do I replace a breaker?',
        aiResponse: 'Just pull the breaker out...',
        details: 'No mention of turning off the main',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const row = mockInsert.mock.calls[0][0];
    expect(row.source).toBe('user_flag');
    expect(row.flag_type).toBe('safety');
    expect(row.user_question).toBe('How do I replace a breaker?');
    expect(row.ai_response).toBe('Just pull the breaker out...');
    expect(row.correction_text).toBe('No mention of turning off the main');
  });

  it('accepts thumbs_up feedback without writing to correction queue', async () => {
    mockInsert.mockClear();
    const { POST } = await import('@/app/api/chat/flag/route');

    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'thumbs_up',
        messageIndex: 3,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // thumbs_up does NOT go to correction_queue
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects flag without flagType', async () => {
    const { POST } = await import('@/app/api/chat/flag/route');

    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'flag',
        // missing flagType
        userMessage: 'test',
        aiResponse: 'test',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/chat/flag/__tests__/route.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the flag API route**

Create `app/api/chat/flag/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const VALID_FLAG_TYPES = ['safety', 'incorrect', 'missing_steps', 'wrong_for_situation'];

export async function POST(req: NextRequest) {
  const rateLimitResult = checkRateLimit(
    req.headers.get('x-forwarded-for') || 'unknown',
    'marketplace',
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const feedbackType = body.feedbackType as string;

  // Thumbs up — log it but don't write to correction queue
  if (feedbackType === 'thumbs_up') {
    logger.info('Chat thumbs up', {
      conversationId: body.conversationId,
      messageIndex: body.messageIndex,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Flag — validate and write to correction queue
  if (feedbackType !== 'flag') {
    return NextResponse.json({ error: 'Invalid feedbackType' }, { status: 400 });
  }

  const flagType = body.flagType as string;
  if (!flagType || !VALID_FLAG_TYPES.includes(flagType)) {
    return NextResponse.json({ error: 'Invalid or missing flagType' }, { status: 400 });
  }

  const userMessage = body.userMessage as string;
  const aiResponse = body.aiResponse as string;
  if (!userMessage || !aiResponse) {
    return NextResponse.json({ error: 'userMessage and aiResponse are required' }, { status: 400 });
  }

  const details = typeof body.details === 'string' ? body.details.slice(0, 500) : null;

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('advisor_correction_queue')
      .insert({
        source: 'user_flag',
        status: 'pending',
        user_question: userMessage,
        ai_response: aiResponse,
        flag_type: flagType,
        correction_text: details,
        conversation_id: body.conversationId || null,
        message_id: body.messageIndex != null ? String(body.messageIndex) : null,
        reporter_id: null, // anonymous for now; add auth later
        reporter_role: 'diy_user',
      });

    if (error) {
      logger.error('Failed to insert flag', { error });
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    logger.info('Chat flag submitted', { flagType, conversationId: body.conversationId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logger.error('Exception in flag route', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run app/api/chat/flag/__tests__/route.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/flag/route.ts app/api/chat/flag/__tests__/route.test.ts
git commit -m "feat: add POST /api/chat/flag endpoint for user corrections"
```

---

### Task 13: Expert Q&A — surface AI response + correction form

**Files:**
- Modify: `components/marketplace/ActiveQuestionCard.tsx`
- Create: `app/api/qa/[id]/ai-correction/route.ts`

- [ ] **Step 1: Add AI response display and correction button to ActiveQuestionCard**

In `components/marketplace/ActiveQuestionCard.tsx`, find the existing AI Context section (around lines 125-131):

```tsx
{question.aiContext?.projectSummary && (
  <div className="mt-2 bg-earth-tan/30 rounded px-3 py-2">
    <p className="text-xs text-earth-brown">
      <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
    </p>
  </div>
)}
```

Replace it with an expanded block that shows the AI's original chat response (if available via `aiContext`) and adds a correction form:

```tsx
{question.aiContext && (
  <div className="mt-2">
    {question.aiContext.projectSummary && (
      <div className="bg-earth-tan/30 rounded px-3 py-2">
        <p className="text-xs text-earth-brown">
          <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
        </p>
      </div>
    )}
    {question.aiContext.aiChatResponse && (
      <details className="mt-2 border border-earth-sand rounded-lg">
        <summary className="px-3 py-2 text-xs font-medium text-earth-brown cursor-pointer hover:bg-earth-tan/20">
          View AI&apos;s Original Response
        </summary>
        <div className="px-3 py-2 border-t border-earth-sand">
          <p className="text-xs text-foreground whitespace-pre-wrap">{question.aiContext.aiChatResponse}</p>
          {!aiCorrectionDone && isClaimed && (
            <button
              onClick={() => setShowAiCorrection(true)}
              className="mt-2 text-xs text-rust hover:underline flex items-center gap-1"
            >
              <Flag size={12} /> Spot an error? Flag &amp; correct
            </button>
          )}
          {aiCorrectionDone && (
            <p className="mt-2 text-xs text-forest-green flex items-center gap-1">
              <CheckCircle2 size={12} /> Correction submitted — thank you!
            </p>
          )}
        </div>
      </details>
    )}
  </div>
)}
```

Add state variables near the top of the component (alongside existing state):

```typescript
const [showAiCorrection, setShowAiCorrection] = useState(false);
const [aiCorrectionDone, setAiCorrectionDone] = useState(false);
const [correctionText, setCorrectionText] = useState('');
const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
```

Add the correction form JSX right after the AI response details block:

```tsx
{showAiCorrection && (
  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
    <p className="text-xs font-semibold text-amber-800 mb-2">What&apos;s wrong with the AI&apos;s response?</p>
    <textarea
      value={correctionText}
      onChange={e => setCorrectionText(e.target.value)}
      placeholder="Describe the error and the correct information..."
      rows={3}
      maxLength={1000}
      className="w-full text-xs border border-amber-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
    />
    <div className="flex items-center gap-2 mt-1.5">
      <button
        onClick={handleAiCorrectionSubmit}
        disabled={correctionText.length < 10 || correctionSubmitting}
        className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-600 text-white rounded-lg disabled:opacity-50 hover:bg-amber-700 transition-colors"
      >
        {correctionSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        Submit Correction
      </button>
      <button
        onClick={() => { setShowAiCorrection(false); setCorrectionText(''); }}
        className="text-xs text-earth-brown hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

Add the submit handler (alongside existing handlers):

```typescript
const handleAiCorrectionSubmit = async () => {
  if (correctionText.length < 10) return;
  setCorrectionSubmitting(true);
  try {
    const res = await fetch(`/api/qa/${question.id}/ai-correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctionText,
        aiResponse: question.aiContext?.aiChatResponse,
      }),
    });
    if (res.ok) {
      setAiCorrectionDone(true);
      setShowAiCorrection(false);
    }
  } catch { /* silent */ }
  setCorrectionSubmitting(false);
};
```

Add the missing imports to the file's imports:

```typescript
import { Flag, CheckCircle2, Send, Loader2 } from 'lucide-react';
```

- [ ] **Step 2: Create the expert AI correction endpoint**

Create `app/api/qa/[id]/ai-correction/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: questionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const correctionText = body.correctionText as string;
  const aiResponse = body.aiResponse as string;
  if (!correctionText || correctionText.length < 10) {
    return NextResponse.json({ error: 'Correction must be at least 10 characters' }, { status: 400 });
  }
  if (!aiResponse) {
    return NextResponse.json({ error: 'aiResponse is required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Verify the user is an expert who claimed this question
  const { data: question } = await supabase
    .from('qa_questions')
    .select('question_text, claimed_by, ai_context')
    .eq('id', questionId)
    .single();

  if (!question || question.claimed_by !== auth.userId) {
    return NextResponse.json({ error: 'Not authorized for this question' }, { status: 403 });
  }

  // Get expert's specialties for weighting
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('specialties')
    .eq('user_id', auth.userId)
    .single();

  const { error } = await supabase
    .from('advisor_correction_queue')
    .insert({
      source: 'expert_correction',
      status: 'pending',
      user_question: question.question_text,
      ai_response: aiResponse,
      correction_text: correctionText.slice(0, 1000),
      reporter_id: auth.userId,
      reporter_role: 'expert',
      expert_specialties: expert?.specialties || [],
    });

  if (error) {
    logger.error('Failed to insert expert AI correction', { error, questionId });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  logger.info('Expert AI correction submitted', { questionId, expertId: auth.userId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 3: Commit**

```bash
git add components/marketplace/ActiveQuestionCard.tsx app/api/qa/[id]/ai-correction/route.ts
git commit -m "feat: surface AI response to experts in Q&A, add correction submission flow"
```

---

### Task 14: Promotion pipeline — corrections to rubric examples

**Files:**
- Create: `lib/advisor-promotion.ts`
- Create: `lib/__tests__/advisor-promotion.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/advisor-promotion.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { shouldAutoPromote, structureCorrection } from '@/lib/advisor-promotion';

describe('shouldAutoPromote', () => {
  it('auto-promotes expert corrections from verified specialty', () => {
    const result = shouldAutoPromote({
      source: 'expert_correction',
      reporterRole: 'expert',
      expertSpecialties: ['electrical', 'general_contractor'],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(0.9);
  });

  it('auto-promotes expert corrections outside specialty at lower weight', () => {
    const result = shouldAutoPromote({
      source: 'expert_correction',
      reporterRole: 'expert',
      expertSpecialties: ['plumbing'],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(true);
    expect(result.weight).toBe(0.7);
  });

  it('does not auto-promote single user flags', () => {
    const result = shouldAutoPromote({
      source: 'user_flag',
      reporterRole: 'diy_user',
      expertSpecialties: [],
      category: 'electrical',
    });
    expect(result.autoPromote).toBe(false);
    expect(result.weight).toBe(0.5);
  });
});

describe('structureCorrection', () => {
  it('structures a correction into rubric example format', () => {
    const result = structureCorrection({
      userQuestion: 'Can I use 14-gauge wire for a 20-amp circuit?',
      aiResponse: 'Yes, 14-gauge works fine for 20-amp.',
      correctionText: '14-gauge is only rated for 15 amps. Must use 12-gauge for 20-amp.',
      category: 'electrical',
      severity: 'critical',
      rubricItemsFailed: [5],
    });

    expect(result.user_question).toBe('Can I use 14-gauge wire for a 20-amp circuit?');
    expect(result.bad_response).toBe('Yes, 14-gauge works fine for 20-amp.');
    expect(result.good_response).toBe('14-gauge is only rated for 15 amps. Must use 12-gauge for 20-amp.');
    expect(result.rubric_items_failed).toEqual([5]);
    expect(result.severity).toBe('critical');
    expect(result.category).toBe('electrical');
    expect(result.rubric_version).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/advisor-promotion.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the promotion module**

Create `lib/advisor-promotion.ts`:

```typescript
// Promotion pipeline: correction_queue → rubric_examples.
// Expert corrections auto-promote; user flags require multiple reports or manual review.
//
// Research basis: Asawa et al. (2025) arXiv:2510.02453
// §3: Filter by correlation — retain only cases where feedback improved outputs.

import { RUBRIC_VERSION } from '@/lib/advisor-rubric';

interface AutoPromoteInput {
  source: string;
  reporterRole: string;
  expertSpecialties: string[];
  category: string;
}

interface AutoPromoteResult {
  autoPromote: boolean;
  weight: number;
}

export function shouldAutoPromote(input: AutoPromoteInput): AutoPromoteResult {
  // Expert corrections from verified specialty → auto-promote at highest weight
  if (input.source === 'expert_correction' && input.reporterRole === 'expert') {
    const inSpecialty = input.expertSpecialties.some(
      s => s === input.category || s === 'general_contractor',
    );
    return {
      autoPromote: true,
      weight: inSpecialty ? 0.9 : 0.7,
    };
  }

  // Canary failures → always auto-promote
  if (input.source === 'canary_failure') {
    return { autoPromote: true, weight: 1.0 };
  }

  // User flags → don't auto-promote (need multiple reports or manual review)
  return { autoPromote: false, weight: 0.5 };
}

interface StructureCorrectionInput {
  userQuestion: string;
  aiResponse: string;
  correctionText: string;
  category: string;
  severity: 'critical' | 'warning';
  rubricItemsFailed: number[];
}

interface RubricExampleRow {
  user_question: string;
  bad_response: string;
  good_response: string;
  rubric_items_failed: number[];
  severity: 'critical' | 'warning';
  category: string;
  rubric_version: number;
}

export function structureCorrection(input: StructureCorrectionInput): RubricExampleRow {
  return {
    user_question: input.userQuestion,
    bad_response: input.aiResponse,
    good_response: input.correctionText,
    rubric_items_failed: input.rubricItemsFailed,
    severity: input.severity,
    category: input.category,
    rubric_version: RUBRIC_VERSION,
  };
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run lib/__tests__/advisor-promotion.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-promotion.ts lib/__tests__/advisor-promotion.test.ts
git commit -m "feat: add promotion pipeline for corrections to rubric examples"
```

---

## Phase 3 — Integration & Validation

### Task 15: Wire custom loop into the chat route

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add imports**

At the top of `app/api/chat/route.ts`, add these imports alongside existing advisor imports (after line 27):

```typescript
import { runCustomReviewLoop } from '@/lib/advisor-custom-loop';
import { recordCustomLoopResult } from '@/lib/advisor-metrics';
import { AnthropicReviewProvider } from '@/lib/advisor-providers/anthropic';
import { getWeightedExamples } from '@/lib/advisor-rubric-db';
import { logReviewVerdict } from '@/lib/advisor-audit';
```

- [ ] **Step 2: Update metrics initialization (line 268)**

Replace the `createAdvisorMetrics` call (lines 268-276):

```typescript
        const advisorMetrics = createAdvisorMetrics({
          requestId,
          intentType: intentType || 'unknown',
          executorModel,
          advisorMode: advisorResolution.advisorMode,
          advisorModel: advisorResolution.advisorTool?.model || null,
          customReviewerModel: advisorResolution.customReviewerModel,
          advisorMaxUses: advisorResolution.advisorTool?.max_uses || 0,
          safetyKeywordsDetected: advisorResolution.safetyKeywordsDetected,
          safetyKeywordsMatched: advisorResolution.safetyKeywordsMatched,
        });
```

- [ ] **Step 3: Add custom review loop after tool loop, before streaming**

Find the section after the tool-use while loop ends and before text streaming begins (around line 422, after the warning event and before `// Stream final response in chunks`). Insert:

```typescript
          // ── Custom Review Loop (Mode C) ───────────────────────────
          if (advisorResolution.advisorMode === 'custom' && response.stop_reason === 'end_turn') {
            const draftText = response.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map(b => b.text)
              .join('');

            if (draftText.trim()) {
              sendEvent({
                type: 'progress',
                step: 'reviewing',
                message: 'Running safety review...',
                icon: '🔍',
              });

              // Fetch domain-specific few-shot examples
              const intentCategory = intentType === 'quick_question' ? 'general' : 'general';
              const fewShotExamples = await getWeightedExamples(intentCategory, 5);

              const reviewProvider = new AnthropicReviewProvider(
                advisorResolution.customReviewerModel!,
                anthropic,
              );

              const loopResult = await runCustomReviewLoop({
                userMessage: message,
                draftResponse: draftText,
                provider: reviewProvider,
                maxIterations: config.advisor.customReviewer.maxIterations,
                earlyStopOnApproval: config.advisor.customReviewer.earlyStopOnApproval,
                safetyKeywordsDetected: advisorResolution.safetyKeywordsDetected,
                safetyKeywordsMatched: advisorResolution.safetyKeywordsMatched,
                fewShotExamples,
              });

              recordCustomLoopResult(advisorMetrics, {
                iterationsUsed: loopResult.iterationsUsed,
                wasRevised: loopResult.wasRevised,
                reviewerInputTokens: loopResult.reviewerTokens.inputTokens,
                reviewerOutputTokens: loopResult.reviewerTokens.outputTokens,
                latencyMs: loopResult.latencyMs,
              });

              // Audit trail (non-blocking)
              logReviewVerdict({
                requestId,
                intentType: intentType || 'unknown',
                advisorMode: 'custom',
                reviewerModel: advisorResolution.customReviewerModel!,
                userQuestion: message,
                draftResponse: draftText,
                verdict: loopResult.wasRevised ? 'REVISE' : 'APPROVE',
                confidence: null,
                issues: loopResult.issues,
                revisedResponse: loopResult.wasRevised ? loopResult.finalResponse : null,
                iterationsUsed: loopResult.iterationsUsed,
                safetyKeywords: advisorResolution.safetyKeywordsMatched,
                rubricVersion: loopResult.rubricVersion,
                reviewerTokensIn: loopResult.reviewerTokens.inputTokens,
                reviewerTokensOut: loopResult.reviewerTokens.outputTokens,
                latencyMs: loopResult.latencyMs,
              }).catch(() => {}); // fire-and-forget

              if (loopResult.wasRevised) {
                logger.info('Custom review loop revised response', {
                  requestId,
                  iterationsUsed: loopResult.iterationsUsed,
                  issueCount: loopResult.issues.length,
                });
                // Replace text content with reviewed version
                let replaced = false;
                response = {
                  ...response,
                  content: response.content
                    .map(block => {
                      if (block.type === 'text' && !replaced) {
                        replaced = true;
                        return { ...block, text: loopResult.finalResponse };
                      }
                      return block;
                    })
                    .filter(block => {
                      if (block.type === 'text' && replaced) {
                        replaced = false; // keep only the first text block
                        return true;
                      }
                      return block.type !== 'text' || !replaced;
                    }),
                };
              }
            }
          }
```

- [ ] **Step 4: Run TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: wire custom review loop into chat route with audit trail and few-shot examples"
```

---

### Task 16: Document env vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append advisor env vars to .env.example**

Add to the end of `.env.example`:

```bash
# ── Advisor Strategy ───────────────────────────────────────────────────────
# Mode: "off" (no review), "beta" (Anthropic advisor API), "custom" (our review loop)
# ADVISOR_MODE=off

# Beta mode config (used when ADVISOR_MODE=beta)
# ADVISOR_EXECUTOR_QUICK=claude-haiku-4-5-20251001
# ADVISOR_EXECUTOR_TROUBLESHOOT=claude-sonnet-4-6
# ADVISOR_EXECUTOR_MID=claude-sonnet-4-6
# ADVISOR_EXECUTOR_FULL=claude-sonnet-4-6
# ADVISOR_MODEL_TROUBLESHOOT=claude-opus-4-6
# ADVISOR_MODEL_MID=claude-opus-4-6
# ADVISOR_MODEL_FULL=claude-opus-4-6
# ADVISOR_MAX_USES_TROUBLESHOOT=2
# ADVISOR_MAX_USES_MID=1
# ADVISOR_MAX_USES_FULL=3

# Custom mode config (used when ADVISOR_MODE=custom)
# ADVISOR_CUSTOM_MODEL=claude-haiku-4-5-20251001
# ADVISOR_CUSTOM_PROVIDER=anthropic
# ADVISOR_CUSTOM_MAX_ITERATIONS=2
# ADVISOR_CUSTOM_EARLY_STOP=true

# Safety keywords (shared by both beta and custom modes)
# ADVISOR_SAFETY_KEYWORDS=electrical panel,breaker box,gas line,...
# ADVISOR_SAFETY_BOOST_USES=1
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document ADVISOR_MODE env vars in .env.example"
```

---

### Task 17: Full validation

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All PASS.

- [ ] **Step 2: TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Manual smoke test — mode "off"**

```bash
ADVISOR_MODE=off npm run dev
```
Send a chat message. Verify no advisor or custom loop activity in server logs. Verify the flag button appears on AI responses.

- [ ] **Step 4: Manual smoke test — mode "custom"**

```bash
ADVISOR_MODE=custom npm run dev
```
Send a safety-critical message (e.g., "How do I replace a circuit breaker?"). Check server logs for:
- `advisorMode: 'custom'`
- `customLoopIterations: 1` or `2`
- `customLoopWasRevised: true` or `false`
- Haiku token usage in `advisorInputTokens`/`advisorOutputTokens`
- Verify the "Running safety review..." progress indicator appears briefly

- [ ] **Step 5: Manual smoke test — mode "beta"**

```bash
ADVISOR_MODE=beta npm run dev
```
Send the same safety-critical message. Verify the beta advisor path still works identically to before.

- [ ] **Step 6: Test the flag button**

Click the flag button on an AI response. Select "Safety concern", add optional details, submit. Check Supabase `advisor_correction_queue` table for the new row.

- [ ] **Step 7: Verify selective invocation**

```bash
ADVISOR_MODE=custom npm run dev
```
Send a non-safety message like "What color should I paint my bedroom?". Verify the custom loop does NOT run (no "Running safety review..." progress, no custom loop log entries for quick_question without safety keywords).

- [ ] **Step 8: Run seed script (if Supabase is running)**

```bash
npx tsx scripts/seed-rubric-examples.ts
```
Verify rows appear in `advisor_rubric_examples` table. Verify subsequent custom loop reviews now include few-shot examples.

- [ ] **Step 9: Fix any issues found**

```bash
git add -A
git commit -m "fix: address issues found in manual smoke testing"
```
