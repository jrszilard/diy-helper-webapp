---
name: agent-phase-debugger
description: Debug individual phases of the 6-phase AI project planner without running the full pipeline
---

# Agent Phase Debugger

Replays and inspects individual phases of the 6-phase project planner to understand behavior and diagnose issues.

## Valid Phases

| Phase | File | Purpose |
|-------|------|---------|
| design | `lib/agents/phases/design.ts` | Generate project design options |
| plan | `lib/agents/phases/plan.ts` | Create step-by-step project plan |
| research | `lib/agents/phases/research.ts` | Research codes, regulations, best practices |
| sourcing | `lib/agents/phases/sourcing.ts` | Find materials and pricing |
| report-builder | `lib/agents/phases/report-builder.ts` | Assemble report sections |
| report | `lib/agents/phases/report.ts` | Generate final report |

## How to Use

Specify a phase to debug: "Debug the research phase" or "What happens if the sourcing phase gets no materials?"

## Debug Process

### Step 1: Read Phase Implementation

Read `lib/agents/phases/<phase>.ts` to understand:
- Input parameters and expected types
- System prompt used (cross-reference with `lib/agents/prompts.ts`)
- Tool calls the phase makes
- Output structure and format
- Error handling behavior

### Step 2: Read Phase Prompt

Read `lib/agents/prompts.ts` and find the prompt for the target phase. Display the full prompt text.

### Step 3: Read Types

Read `lib/agents/types.ts` for:
- `AgentPhase` enum/type
- Phase input/output interfaces
- `AgentRun` structure

### Step 4: Read Runner Context

Read `lib/agents/runner.ts` to understand:
- How the phase is called in the pipeline
- What data from previous phases feeds into this one
- What happens when this phase succeeds or fails

### Step 5: Display Analysis

Present:
1. **System prompt** (full text from prompts.ts)
2. **Expected inputs** (what the phase receives from previous phases or the runner)
3. **Tool calls** (which tools this phase uses and their expected parameters)
4. **Output structure** (what the phase returns)
5. **Error paths** (what happens on failure, timeout, or empty results)

## "What If" Mode

When asked "what if [scenario]":

1. Identify what input or condition changes in the scenario
2. Trace through the phase logic to determine what would happen
3. Check for edge cases, null checks, empty array handling
4. Report the expected output or error

Examples:
- "What if research phase finds no codes?" → Trace the empty result path
- "What if sourcing phase gets duplicate materials?" → Check dedup logic
- "What if design phase times out?" → Check timeout handling in runner.ts

## Diff Mode

When asked to compare two configurations:

1. Read both phase files or prompt variations
2. Display side-by-side differences
3. Explain how the differences affect behavior

## Reference Files

- `lib/agents/runner.ts` — orchestration logic
- `lib/agents/prompts.ts` — all phase prompts
- `lib/agents/types.ts` — TypeScript interfaces
- `lib/agents/phases/*.ts` — individual phase implementations
- `lib/agents/db-helpers.ts` — database queries for agent context
- `lib/agents/inventory-prefetch.ts` — tool inventory integration
