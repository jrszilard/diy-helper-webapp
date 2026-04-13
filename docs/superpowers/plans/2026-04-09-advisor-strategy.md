# Advisor Strategy Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Anthropic's `advisor_20260301` tool type into the DIY Helper chat with tiered executor/advisor models per intent type, feature-flagged and metrics-logged.

**Architecture:** A new `advisor` config block maps each intent type to an executor model and optional advisor model. The chat route resolves the tier after intent classification, builds the tools array with the advisor tool when applicable, and logs structured metrics. A server-side keyword scan forces advisor consultation for safety-critical topics.

**Tech Stack:** TypeScript, Next.js API routes, Anthropic SDK (`@anthropic-ai/sdk`), Vitest

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | SDK version bump |
| `lib/config.ts` | Advisor tier configuration, feature flag, safety keywords |
| `lib/advisor-metrics.ts` | **New** — Metrics types, accumulator, cost estimator, log helper |
| `lib/advisor-resolver.ts` | **New** — Pure function: resolves tier config + keyword forcing (testable without HTTP) |
| `lib/tools/definitions.ts` | Advisor tool description constant |
| `app/api/chat/route.ts` | Imports resolver, builds tools array, swaps model, captures metrics |
| `lib/__tests__/advisor-config.test.ts` | **New** — Config tier resolution tests |
| `lib/__tests__/advisor-metrics.test.ts` | **New** — Metrics accumulator + cost calculation tests |
| `lib/__tests__/advisor-integration.test.ts` | **New** — Keyword forcing + tools array construction tests |

---

### Task 1: Create branch and upgrade SDK

**Files:**
- Modify: `package.json` (SDK version)

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b claude-advisor-strategy-feature
```

- [ ] **Step 2: Upgrade the Anthropic SDK**

```bash
npm install @anthropic-ai/sdk@^0.87.0
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors. If errors appear, they indicate breaking type changes that must be fixed before proceeding.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade @anthropic-ai/sdk from 0.68.0 to 0.87.0"
```

---

### Task 2: Add advisor config block

**Files:**
- Modify: `lib/config.ts`
- Create: `lib/__tests__/advisor-config.test.ts`

- [ ] **Step 1: Write failing tests for advisor config**

Create `lib/__tests__/advisor-config.test.ts`:

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

  it('defaults to disabled', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.enabled).toBe(false);
  });

  it('enables via ADVISOR_ENABLED env var', async () => {
    process.env.ADVISOR_ENABLED = 'true';
    const { advisor } = await import('@/lib/config');
    expect(advisor.enabled).toBe(true);
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/advisor-config.test.ts`
Expected: FAIL — `advisor` is not exported from `@/lib/config`

- [ ] **Step 3: Add advisor config block to lib/config.ts**

Add before the final `const config = ...` line in `lib/config.ts`:

```typescript
// ── Advisor Strategy ────────────────────────────────────────────────────────
export const advisor = {
  enabled: envString('ADVISOR_ENABLED', 'false') === 'true',

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

  safetyCriticalKeywords: envList('ADVISOR_SAFETY_KEYWORDS', [
    'electrical panel', 'breaker box', 'subpanel', 'gas line',
    'gas pipe', 'load-bearing', 'structural', 'asbestos',
    'lead paint', 'roof work', 'main disconnect', 'service entrance',
  ]),

  safetyBoostUses: envInt('ADVISOR_SAFETY_BOOST_USES', 1),
} as const;
```

Update the final config export to include `advisor`:

```typescript
const config = { beta, anthropic, rateLimits, cors, storeSearch, streaming, pruning, freemium, stripe, marketplace, expertSubscriptions, intelligence, advisor } as const;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/advisor-config.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/config.ts lib/__tests__/advisor-config.test.ts
git commit -m "feat: add advisor strategy config with tiered models per intent type"
```

---

### Task 3: Create advisor metrics module

**Files:**
- Create: `lib/advisor-metrics.ts`
- Create: `lib/__tests__/advisor-metrics.test.ts`

- [ ] **Step 1: Write failing tests for advisor metrics**

Create `lib/__tests__/advisor-metrics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createAdvisorMetrics,
  recordApiCall,
  calculateEstimatedCost,
  type AdvisorMetrics,
} from '@/lib/advisor-metrics';

describe('createAdvisorMetrics', () => {
  it('initializes with zeroed counters', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(metrics.advisorActualUses).toBe(0);
    expect(metrics.executorInputTokens).toBe(0);
    expect(metrics.executorOutputTokens).toBe(0);
    expect(metrics.advisorInputTokens).toBe(0);
    expect(metrics.advisorOutputTokens).toBe(0);
    expect(metrics.advisorLatencyMs).toEqual([]);
    expect(metrics.totalLatencyMs).toBe(0);
  });
});

describe('recordApiCall', () => {
  it('accumulates executor tokens across calls', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    recordApiCall(metrics, {
      inputTokens: 500,
      outputTokens: 200,
      latencyMs: 1200,
    });

    recordApiCall(metrics, {
      inputTokens: 600,
      outputTokens: 150,
      latencyMs: 800,
    });

    expect(metrics.executorInputTokens).toBe(1100);
    expect(metrics.executorOutputTokens).toBe(350);
  });

  it('tracks per-call latency', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'troubleshooting',
      executorModel: 'claude-sonnet-4-6',
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 2,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['electrical panel'],
    });

    recordApiCall(metrics, { inputTokens: 100, outputTokens: 50, latencyMs: 500 });
    recordApiCall(metrics, { inputTokens: 200, outputTokens: 100, latencyMs: 700 });

    expect(metrics.advisorLatencyMs).toEqual([500, 700]);
  });
});

describe('calculateEstimatedCost', () => {
  it('calculates cost for executor-only request', () => {
    const metrics: AdvisorMetrics = {
      requestId: 'req-123',
      intentType: 'quick_question',
      executorModel: 'claude-haiku-4-5-20251001',
      advisorModel: null,
      advisorMaxUses: 0,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      advisorLatencyMs: [],
      totalLatencyMs: 500,
      executorInputTokens: 1000,
      executorOutputTokens: 500,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
    };

    const cost = calculateEstimatedCost(metrics);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01); // Haiku is cheap
  });

  it('includes advisor cost when advisor was used', () => {
    const withoutAdvisor: AdvisorMetrics = {
      requestId: 'req-1',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      advisorLatencyMs: [],
      totalLatencyMs: 2000,
      executorInputTokens: 2000,
      executorOutputTokens: 1000,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
    };

    const withAdvisor: AdvisorMetrics = {
      ...withoutAdvisor,
      requestId: 'req-2',
      advisorActualUses: 2,
      advisorInputTokens: 1500,
      advisorOutputTokens: 500,
    };

    const costWithout = calculateEstimatedCost(withoutAdvisor);
    const costWith = calculateEstimatedCost(withAdvisor);
    expect(costWith).toBeGreaterThan(costWithout);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/advisor-metrics.test.ts`
Expected: FAIL — module `@/lib/advisor-metrics` does not exist

- [ ] **Step 3: Implement advisor-metrics.ts**

Create `lib/advisor-metrics.ts`:

```typescript
import { logger } from '@/lib/logger';

export interface AdvisorMetrics {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorModel: string | null;
  advisorMaxUses: number;
  advisorActualUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  advisorLatencyMs: number[];
  totalLatencyMs: number;
  executorInputTokens: number;
  executorOutputTokens: number;
  advisorInputTokens: number;
  advisorOutputTokens: number;
}

interface CreateMetricsParams {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorModel: string | null;
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
    advisorLatencyMs: [],
    totalLatencyMs: 0,
    executorInputTokens: 0,
    executorOutputTokens: 0,
    advisorInputTokens: 0,
    advisorOutputTokens: 0,
  };
}

export function recordApiCall(metrics: AdvisorMetrics, result: ApiCallResult): void {
  metrics.executorInputTokens += result.inputTokens;
  metrics.executorOutputTokens += result.outputTokens;
  metrics.advisorLatencyMs.push(result.latencyMs);
}

export function recordAdvisorUsage(
  metrics: AdvisorMetrics,
  advisorInputTokens: number,
  advisorOutputTokens: number
): void {
  metrics.advisorActualUses += 1;
  metrics.advisorInputTokens += advisorInputTokens;
  metrics.advisorOutputTokens += advisorOutputTokens;
}

export function calculateEstimatedCost(metrics: AdvisorMetrics): number {
  const executorRate = TOKEN_RATES[metrics.executorModel] || DEFAULT_RATE;
  const executorCost =
    (metrics.executorInputTokens / 1_000_000) * executorRate.input +
    (metrics.executorOutputTokens / 1_000_000) * executorRate.output;

  let advisorCost = 0;
  if (metrics.advisorModel) {
    const advisorRate = TOKEN_RATES[metrics.advisorModel] || DEFAULT_RATE;
    advisorCost =
      (metrics.advisorInputTokens / 1_000_000) * advisorRate.input +
      (metrics.advisorOutputTokens / 1_000_000) * advisorRate.output;
  }

  return executorCost + advisorCost;
}

export function logAdvisorMetrics(metrics: AdvisorMetrics): void {
  metrics.totalLatencyMs = metrics.advisorLatencyMs.reduce((a, b) => a + b, 0);
  const estimatedCostUsd = calculateEstimatedCost(metrics);

  logger.info('Advisor metrics', {
    requestId: metrics.requestId,
    intentType: metrics.intentType,
    executorModel: metrics.executorModel,
    advisorModel: metrics.advisorModel,
    advisorEnabled: metrics.advisorMaxUses > 0,
    advisorMaxUses: metrics.advisorMaxUses,
    advisorActualUses: metrics.advisorActualUses,
    safetyKeywordsDetected: metrics.safetyKeywordsDetected,
    safetyKeywordsMatched: metrics.safetyKeywordsMatched,
    advisorLatencyMs: metrics.advisorLatencyMs,
    totalLatencyMs: metrics.totalLatencyMs,
    executorInputTokens: metrics.executorInputTokens,
    executorOutputTokens: metrics.executorOutputTokens,
    advisorInputTokens: metrics.advisorInputTokens,
    advisorOutputTokens: metrics.advisorOutputTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/advisor-metrics.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-metrics.ts lib/__tests__/advisor-metrics.test.ts
git commit -m "feat: add advisor metrics module with cost estimation and logging"
```

---

### Task 4: Add advisor tool description to definitions

**Files:**
- Modify: `lib/tools/definitions.ts`

- [ ] **Step 1: Export the advisor tool description constant**

Add at the bottom of `lib/tools/definitions.ts`:

```typescript
export const ADVISOR_TOOL_DESCRIPTION = `Consult this advisor for a second opinion before responding.
You MUST consult the advisor before providing guidance on:
- Electrical panel work, wiring, or circuit modifications
- Gas line work or appliance hookups
- Structural or load-bearing assessments
- Asbestos, lead paint, or hazardous material concerns
- Roof work at height
- Any situation where you would include a ⚠️ Safety-critical callout
- Building code interpretation where you're not fully certain

When consulting, provide your draft reasoning and the specific question
you want reviewed. The advisor will confirm, correct, or flag issues.`;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 3: Commit**

```bash
git add lib/tools/definitions.ts
git commit -m "feat: add advisor tool description constant"
```

---

### Task 5: Write integration tests for advisor resolution logic

**Files:**
- Create: `lib/__tests__/advisor-integration.test.ts`

- [ ] **Step 1: Write tests for tier resolution and keyword forcing**

Create `lib/__tests__/advisor-integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IntentType } from '@/lib/intelligence/types';

/**
 * Extract the advisor resolution logic into a pure function so we can test it
 * without spinning up an HTTP server. This function mirrors the logic that will
 * be added to the chat route.
 */
import { resolveAdvisorConfig, type AdvisorResolution } from '@/lib/advisor-resolver';

describe('resolveAdvisorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, ADVISOR_ENABLED: 'true' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default model when advisor is disabled', async () => {
    process.env.ADVISOR_ENABLED = 'false';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.advisorTool).toBeNull();
    expect(result.executorModel).toBe('claude-sonnet-4-6'); // falls back to config.anthropic.model
  });

  it('returns Haiku executor with no advisor for quick_question', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What size nail for baseboards?');
    expect(result.executorModel).toBe('claude-haiku-4-5-20251001');
    expect(result.advisorTool).toBeNull();
  });

  it('returns Sonnet executor with Opus advisor for full_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.model).toBe('claude-opus-4-6');
    expect(result.advisorTool!.max_uses).toBe(3);
  });

  it('returns Opus advisor with max_uses=2 for troubleshooting', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My outlet keeps sparking');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.max_uses).toBe(2);
  });

  it('returns Opus advisor with max_uses=1 for mid_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('mid_project', 'The mortar is not sticking');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.max_uses).toBe(1);
  });

  it('boosts max_uses when safety keywords detected', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I need to upgrade my electrical panel');
    expect(result.advisorTool!.max_uses).toBe(4); // 3 default + 1 boost
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('appends system prompt nudge when safety keywords detected', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My gas line is leaking');
    expect(result.systemPromptSuffix).toContain('MUST consult the advisor');
  });

  it('does not boost when no safety keywords match', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to paint my bedroom');
    expect(result.advisorTool!.max_uses).toBe(3); // no boost
    expect(result.safetyKeywordsDetected).toBe(false);
  });

  it('handles undefined intentType by using default model', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig(undefined, 'Hello');
    expect(result.advisorTool).toBeNull();
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/advisor-integration.test.ts`
Expected: FAIL — `@/lib/advisor-resolver` does not exist

- [ ] **Step 3: Implement advisor-resolver.ts**

Create `lib/advisor-resolver.ts`:

```typescript
import config from '@/lib/config';
import { ADVISOR_TOOL_DESCRIPTION } from '@/lib/tools/definitions';
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
    type: 'advisor_20260301',
    name: 'advisor',
    model: tier.advisor,
    max_uses: effectiveMaxUses,
    description: ADVISOR_TOOL_DESCRIPTION,
  };

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/advisor-integration.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/advisor-resolver.ts lib/__tests__/advisor-integration.test.ts
git commit -m "feat: add advisor resolver with tier resolution and keyword forcing"
```

---

### Task 6: Integrate advisor into the streaming chat route

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add imports**

Add these imports at the top of `app/api/chat/route.ts`:

```typescript
import { resolveAdvisorConfig } from '@/lib/advisor-resolver';
import {
  createAdvisorMetrics,
  recordApiCall,
  logAdvisorMetrics,
} from '@/lib/advisor-metrics';
```

- [ ] **Step 2: Add advisor resolution after skill calibration**

Insert after the skill calibration block (after line 188, the closing `}` of the `if (auth.userId)` calibration block), before the `if (!streaming)` check:

```typescript
    // ── Advisor Strategy ──────────────────────────────────────────
    const advisorResolution = resolveAdvisorConfig(intentType, message);
    const executorModel = advisorResolution.executorModel;
    if (advisorResolution.systemPromptSuffix) {
      calibratedPrompt += advisorResolution.systemPromptSuffix;
    }

    const activeTools = [
      ...tools,
      ...(advisorResolution.advisorTool ? [advisorResolution.advisorTool] : []),
    ] as Anthropic.Tool[];
```

- [ ] **Step 3: Initialize metrics in the streaming handler**

Inside the `start(controller)` function, after the `sendEvent` helper definition, add:

```typescript
          const advisorMetrics = createAdvisorMetrics({
            requestId,
            intentType: intentType || 'unknown',
            executorModel,
            advisorModel: advisorResolution.advisorTool?.model || null,
            advisorMaxUses: advisorResolution.advisorTool?.max_uses || 0,
            safetyKeywordsDetected: advisorResolution.safetyKeywordsDetected,
            safetyKeywordsMatched: advisorResolution.safetyKeywordsMatched,
          });
```

- [ ] **Step 4: Replace model and tools in the initial API call**

Change the initial `anthropic.messages.create` call (around line 224) from:

```typescript
              model: config.anthropic.model,
              max_tokens: config.anthropic.maxTokens,
              system: calibratedPrompt,
              tools: tools as Anthropic.Tool[],
              messages
```

To:

```typescript
              model: executorModel,
              max_tokens: config.anthropic.maxTokens,
              system: calibratedPrompt,
              tools: activeTools,
              messages
```

- [ ] **Step 5: Record metrics after the initial API call**

After the initial API call's logger.info line (around line 233), add:

```typescript
          recordApiCall(advisorMetrics, {
            inputTokens: response.usage?.input_tokens || 0,
            outputTokens: response.usage?.output_tokens || 0,
            latencyMs: Date.now() - apiStart,
          });
```

- [ ] **Step 6: Replace model and tools in the tool-loop follow-up call**

Change the follow-up `anthropic.messages.create` call inside the while loop (around line 317) from:

```typescript
                model: config.anthropic.model,
                max_tokens: config.anthropic.maxTokens,
                system: calibratedPrompt,
                tools: tools as Anthropic.Tool[],
                messages
```

To:

```typescript
                model: executorModel,
                max_tokens: config.anthropic.maxTokens,
                system: calibratedPrompt,
                tools: activeTools,
                messages
```

- [ ] **Step 7: Record metrics after each follow-up call**

After the follow-up call's logger.info line (around line 326), add:

```typescript
            recordApiCall(advisorMetrics, {
              inputTokens: response.usage?.input_tokens || 0,
              outputTokens: response.usage?.output_tokens || 0,
              latencyMs: Date.now() - followUpStart,
            });
```

- [ ] **Step 8: Log advisor metrics before the done event**

Before the `sendEvent({ type: 'done' ...})` line (around line 379), add:

```typescript
          logAdvisorMetrics(advisorMetrics);
```

- [ ] **Step 9: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 10: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: integrate advisor strategy into streaming chat route"
```

---

### Task 7: Integrate advisor into the non-streaming handler

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Update handleNonStreamingRequest signature**

Change the function signature from:

```typescript
async function handleNonStreamingRequest(
  auth: Awaited<ReturnType<typeof getAuthFromRequest>>,
  message: string,
  history: Array<{ role: string; content: string | Array<Record<string, unknown>> }>,
  multiModalContent?: Anthropic.ContentBlockParam[],
  intentType?: IntentType,
  calibratedSystemPrompt?: string
)
```

To:

```typescript
async function handleNonStreamingRequest(
  auth: Awaited<ReturnType<typeof getAuthFromRequest>>,
  message: string,
  history: Array<{ role: string; content: string | Array<Record<string, unknown>> }>,
  multiModalContent?: Anthropic.ContentBlockParam[],
  intentType?: IntentType,
  calibratedSystemPrompt?: string,
  executorModel?: string,
  activeTools?: Anthropic.Tool[],
)
```

- [ ] **Step 2: Use the new parameters in the non-streaming handler**

Inside `handleNonStreamingRequest`, replace the two `anthropic.messages.create` calls. Change:

```typescript
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      system: effectivePrompt,
      tools: tools as Anthropic.Tool[],
      messages
```

To (in both the initial call and the follow-up call inside the while loop):

```typescript
      model: executorModel || config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      system: effectivePrompt,
      tools: activeTools || tools as Anthropic.Tool[],
      messages
```

- [ ] **Step 3: Update the call site to pass new parameters**

Change the call to `handleNonStreamingRequest` (around line 191) from:

```typescript
      return handleNonStreamingRequest(auth, message, prunedHistory, image ? userContent : undefined, intentType, calibratedPrompt);
```

To:

```typescript
      return handleNonStreamingRequest(auth, message, prunedHistory, image ? userContent : undefined, intentType, calibratedPrompt, executorModel, activeTools);
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: integrate advisor strategy into non-streaming chat handler"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (advisor-config, advisor-metrics, advisor-integration)

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 3: Test feature flag OFF (dev server)**

Start dev server with `npm run dev`. Send a chat message. Verify in terminal logs:
- No "Advisor metrics" log line appears (advisor is disabled by default)
- Model in the API call log shows `claude-sonnet-4-6` (unchanged behavior)

- [ ] **Step 4: Test feature flag ON (dev server)**

Restart dev server with `ADVISOR_ENABLED=true npm run dev`. Send a `full_project` message like "I want to install a ceiling fan". Verify in terminal logs:
- "Advisor metrics" log line appears with:
  - `executorModel: "claude-sonnet-4-6"`
  - `advisorModel: "claude-opus-4-6"`
  - `advisorMaxUses: 3`
  - `estimatedCostUsd` populated

- [ ] **Step 5: Test safety keyword forcing**

With `ADVISOR_ENABLED=true`, send: "I need to upgrade my electrical panel to 200 amp". Verify in logs:
- `safetyKeywordsDetected: true`
- `safetyKeywordsMatched` contains `"electrical panel"`
- `advisorMaxUses: 4` (3 default + 1 boost)

- [ ] **Step 6: Test quick_question tier**

With `ADVISOR_ENABLED=true`, send: "What size nail for baseboards?". Verify in logs:
- `executorModel: "claude-haiku-4-5-20251001"`
- `advisorModel: null`
- `advisorMaxUses: 0`

- [ ] **Step 7: Final commit (if any fixes needed)**

If any fixes were applied during verification:

```bash
git add -A
git commit -m "fix: address issues found during advisor integration verification"
```

- [ ] **Step 8: Push branch**

```bash
git push -u origin claude-advisor-strategy-feature
```
