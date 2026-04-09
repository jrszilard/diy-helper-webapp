# Advisor Strategy Integration — Design Spec

**Date:** 2026-04-09
**Status:** Draft
**Feature flag:** `ADVISOR_ENABLED` (default: `false`)

## Overview

Integrate Anthropic's `advisor_20260301` tool type into the DIY Helper chat to get
frontier-model (Opus) review of safety-critical and complex responses before they
reach users. The executor model and advisor model scale with intent complexity. A
feature flag allows A/B comparison against the current single-model setup.

## Goals

1. **Improve answer quality** on safety-critical and code-interpretation questions
   by having Opus review executor responses before delivery.
2. **Reduce cost** on simple questions by dropping the executor to Haiku where
   advisor oversight isn't needed.
3. **Measure impact** via structured logging of advisor usage, latency, and token
   costs per request.

## Non-goals

- Changing the frontend (advisor is invisible to the client).
- Modifying system prompts (advisor rules live in the tool description).
- Adding new database tables (metrics are log-only for the prototype).

---

## Architecture

### Tiered model configuration

Each intent type maps to an executor model, an optional advisor model, and max
advisor uses per response:

| Intent | Executor | Advisor | Max Uses |
|---|---|---|---|
| `quick_question` | Haiku 4.5 | none | 0 |
| `troubleshooting` | Sonnet 4.6 | Opus 4.6 | 2 |
| `mid_project` | Sonnet 4.6 | Opus 4.6 | 1 |
| `full_project` | Sonnet 4.6 | Opus 4.6 | 3 |

All values are env-var overridable. When `ADVISOR_ENABLED=false`, the system uses
`config.anthropic.model` (Sonnet 4.6) for everything — identical to current behavior.

### Feature flag behavior

```
ADVISOR_ENABLED=false  →  Current single-model behavior (no changes)
ADVISOR_ENABLED=true   →  Tiered executor + advisor per intent type
```

---

## Advisor triggering: two-layer safety net

A key risk is the executor failing to consult the advisor when it should. Two
complementary layers address this:

### Layer 1: Prompt-level mandatory consultation

The advisor tool's `description` field instructs the executor:

> You MUST consult the advisor before providing guidance on:
> - Electrical panel work, wiring, or circuit modifications
> - Gas line work or appliance hookups
> - Structural or load-bearing assessments
> - Asbestos, lead paint, or hazardous material concerns
> - Roof work at height
> - Any situation where you would include a ⚠️ Safety-critical callout
> - Building code interpretation where you're not fully certain
>
> When consulting, provide your draft reasoning and the specific question
> you want reviewed. The advisor will confirm, correct, or flag issues.

### Layer 2: Server-side keyword forcing

Before the API call, the chat route scans the user's message for safety-critical
keywords. If detected:

1. `max_uses` is incremented by `ADVISOR_SAFETY_BOOST_USES` (default: 1).
2. A system prompt nudge is appended: *"The user's question involves safety-critical
   work. You MUST consult the advisor before responding."*

**Default keyword list** (env-var overridable via `ADVISOR_SAFETY_KEYWORDS`):

```
electrical panel, breaker box, subpanel, gas line, gas pipe,
load-bearing, structural, asbestos, lead paint, roof work,
main disconnect, service entrance
```

### Why both layers

| Layer | Catches | Misses |
|---|---|---|
| Prompt-level rule | Most safety topics via instruction-following | Edge cases where executor misjudges severity |
| Keyword scan | Explicit mentions of dangerous topics | Indirect references ("can I move this wall?") |
| Combined | Both — deterministic keywords + model judgment | Only indirect references without keywords |

The existing confidence tiers and expert escalation callouts remain unchanged. The
advisor improves the *quality* of the advice above those callouts; it doesn't replace
the disclosure mechanism.

---

## Configuration

New `advisor` block in `lib/config.ts`:

```typescript
export const advisor = {
  enabled: envString('ADVISOR_ENABLED', 'false') === 'true',

  tiers: {
    quick_question: {
      executor: envString('ADVISOR_EXECUTOR_QUICK', 'claude-haiku-4-5-20251001'),
      advisor: null,
      maxUses: 0,
    },
    troubleshooting: {
      executor: envString('ADVISOR_EXECUTOR_TROUBLESHOOT', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_TROUBLESHOOT', 'claude-opus-4-6'),
      maxUses: envInt('ADVISOR_MAX_USES_TROUBLESHOOT', 2),
    },
    mid_project: {
      executor: envString('ADVISOR_EXECUTOR_MID', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_MID', 'claude-opus-4-6'),
      maxUses: envInt('ADVISOR_MAX_USES_MID', 1),
    },
    full_project: {
      executor: envString('ADVISOR_EXECUTOR_FULL', 'claude-sonnet-4-6'),
      advisor: envString('ADVISOR_MODEL_FULL', 'claude-opus-4-6'),
      maxUses: envInt('ADVISOR_MAX_USES_FULL', 3),
    },
  },

  safetyCriticalKeywords: envList('ADVISOR_SAFETY_KEYWORDS', [
    'electrical panel', 'breaker box', 'subpanel', 'gas line',
    'gas pipe', 'load-bearing', 'structural', 'asbestos',
    'lead paint', 'roof work', 'main disconnect', 'service entrance',
  ]),

  safetyBoostUses: envInt('ADVISOR_SAFETY_BOOST_USES', 1),
};
```

---

## Chat route integration

Changes to `app/api/chat/route.ts` in three spots:

### 1. Resolve tier config (after intent classification)

```typescript
let executorModel = config.anthropic.model;
let advisorTool = null;

if (config.advisor.enabled && intentType) {
  const tier = config.advisor.tiers[intentType];
  if (tier) {
    executorModel = tier.executor;

    if (tier.advisor && tier.maxUses > 0) {
      let effectiveMaxUses = tier.maxUses;

      const messageLower = message.toLowerCase();
      const hasSafetyKeywords = config.advisor.safetyCriticalKeywords
        .some(kw => messageLower.includes(kw));

      if (hasSafetyKeywords) {
        effectiveMaxUses += config.advisor.safetyBoostUses;
        calibratedPrompt += '\n\nIMPORTANT: The user\'s question involves '
          + 'safety-critical work. You MUST consult the advisor before responding.';
      }

      advisorTool = {
        type: "advisor_20260301",
        name: "advisor",
        model: tier.advisor,
        max_uses: effectiveMaxUses,
        description: ADVISOR_TOOL_DESCRIPTION,
      };
    }
  }
}
```

### 2. Build tools array

```typescript
const activeTools = [
  ...tools,
  ...(advisorTool ? [advisorTool] : []),
] as Anthropic.Tool[];
```

Replace `config.anthropic.model` with `executorModel` and `tools` with `activeTools`
in all three `anthropic.messages.create()` calls (initial, tool-loop follow-up,
non-streaming handler).

### 3. Non-streaming handler

Pass `executorModel` and `advisorTool` as parameters to `handleNonStreamingRequest`
instead of reading `config.anthropic.model` directly.

---

## Advisor tool description

Exported from `lib/tools/definitions.ts` as `ADVISOR_TOOL_DESCRIPTION`:

```
Consult this advisor for a second opinion before responding.
You MUST consult the advisor before providing guidance on:
- Electrical panel work, wiring, or circuit modifications
- Gas line work or appliance hookups
- Structural or load-bearing assessments
- Asbestos, lead paint, or hazardous material concerns
- Roof work at height
- Any situation where you would include a ⚠️ Safety-critical callout
- Building code interpretation where you're not fully certain

When consulting, provide your draft reasoning and the specific question
you want reviewed. The advisor will confirm, correct, or flag issues.
```

---

## Advisor usage metrics

New file: `lib/advisor-metrics.ts`

### Interface

```typescript
interface AdvisorMetrics {
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
```

### Capture method

- Token counts from `response.usage.input_tokens` / `output_tokens` on each API call.
- Advisor actual uses counted from response content blocks. The exact block type
  returned by the `advisor_20260301` tool will be determined during implementation
  by inspecting the API response shape. Fallback: count by diffing `max_uses` minus
  remaining uses reported in the response metadata.
- Latency tracked per API call within the tool loop.
- `calculateEstimatedCost()` helper computes per-request USD estimate based on
  known per-token rates for each model.

### Output

Single structured log line per request via existing `logger.info()`:

```typescript
logger.info('Advisor metrics', { requestId, ...metrics, estimatedCostUsd });
```

No new database tables. Log-only for the prototype phase.

---

## SDK upgrade

Upgrade `@anthropic-ai/sdk` from `^0.68.0` to `^0.87.0`.

**Risk assessment:**
- LOW: 5 of 7 import sites use basic patterns (create client, call messages.create,
  filter TextBlock) — stable across versions.
- MODERATE: `app/api/chat/route.ts` and `lib/agents/runner.ts` use tool loops,
  content block narrowing, and token usage tracking.
- The `advisor_20260301` tool type is not yet in SDK type definitions. Handled via
  type assertion (`as Anthropic.Tool[]`) until SDK catches up.

**Verification:** Run `tsc --noEmit` after upgrade, then test one end-to-end chat
conversation with tool use.

---

## Files changed

| File | Change |
|---|---|
| `package.json` | SDK upgrade `^0.68.0` → `^0.87.0` |
| `lib/config.ts` | Add `advisor` config block |
| `lib/advisor-metrics.ts` | **New** — metrics interface + logging helpers |
| `app/api/chat/route.ts` | Tier resolution, tools array, model swap, metrics logging |
| `lib/tools/definitions.ts` | Export `ADVISOR_TOOL_DESCRIPTION` constant |

**Not changed:** System prompts, frontend, intent router, tool executor.

---

## Testing plan

1. **SDK upgrade gate:** `tsc --noEmit` passes with zero errors.
2. **Feature flag off:** Verify identical behavior to current system (same model,
   same tools, no advisor in tools array).
3. **Feature flag on, quick_question:** Verify Haiku executor, no advisor tool
   in API call.
4. **Feature flag on, full_project:** Verify Sonnet executor, Opus advisor in
   tools array, advisor metrics logged.
5. **Safety keyword forcing:** Send message containing "electrical panel", verify
   `max_uses` incremented and system prompt nudge appended.
6. **Metrics logging:** Verify structured log output includes all AdvisorMetrics
   fields with plausible values.
