# Skills & Intelligence Layer Design

**Date:** 2026-03-12
**Status:** Draft
**Scope:** Application-enhancing features (Smart Routing, Skill Calibration, Expert Co-Pilot) + Developer workflow skills (5 tools)

---

## Overview

This spec defines two categories of additions to the DIY Helper platform:

1. **Application-Enhancing Features** — A User Intelligence Layer that makes the app context-aware for both DIYers and experts
2. **Developer Workflow Skills** — Claude Code skills that automate testing, validation, and debugging during development

The application features share a common foundation — a User Intelligence Layer — that sits between the user and the AI. The developer skills are independent tools that run in Claude Code sessions.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   User Input                     │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Intent Router  │  ← Smart Routing
              │                 │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
   ┌─────▼─────┐ ┌────▼─────┐ ┌────▼──────┐
   │  Quick     │ │  Trouble │ │  Full     │
   │  Answer    │ │  -shoot  │ │  Project  │
   │  Mode      │ │  Mode    │ │  Planner  │
   └─────┬─────┘ └────┬─────┘ └────┬──────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
              ┌────────▼────────┐
              │  Skill Profile  │  ← Skill Calibration
              │  (Adjusts depth,│
              │   tone, detail) │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  AI Response    │
              │  Generation     │
              └─────────────────┘


┌─────────────────────────────────────────────────┐
│           Expert Co-Pilot (Separate)             │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │  Code    │ │  Draft   │ │  Licensing-Aware │  │
│  │  Lookup  │ │  Builder │ │  Ref. Surfacer   │  │
│  └──────────┘ └──────────┘ └─────────────────┘  │
│         (All opt-in, expert-controlled)          │
└─────────────────────────────────────────────────┘
```

The Intent Router and Skill Profile are middleware — they modify the system prompt and response behavior, not separate features with their own UI. They integrate into the existing chat flow. The Expert Co-Pilot is a separate toolset embedded in the expert dashboard.

All three share a `lib/intelligence/` module for user profiling and context assembly.

---

## Feature 1: Smart Routing (Intent Classification)

### Location

Intercepts at the beginning of the `app/api/chat/route.ts` flow, before the AI generates a response.

### Intent Categories

| Intent | Signal Examples | Behavior |
|--------|----------------|----------|
| **Quick Question** | "What size nail for baseboards?" / "Can I mix PEX and copper?" | Direct answer, 1-3 paragraphs max. No project creation. Offers "want to go deeper?" at the end |
| **Troubleshooting** | "My outlet isn't working" / "I'm getting water under my sink" | Diagnostic flow: asks clarifying questions, gives step-by-step fix. Optional: "This might need a pro" escalation to marketplace |
| **Mid-Project Help** | "I'm installing tile and the mortar isn't sticking" / references an existing project | Contextual help using their active project data, tool inventory, and where they are in the process |
| **Full Project** | "I want to build a deck" / "Planning a bathroom remodel" | Routes to existing guided bot → agent planner flow |

### Classification Approach

- Uses Claude Haiku for intent classification — fast, cheap, single-purpose call
- Model: `claude-haiku-4-5-20251001`, max tokens: 100, temperature: 0
- Inputs: the user's message, whether they have active projects, their skill profile (once calibration is in place)
- Returns: intent category + confidence score (0-1)
- If confidence < 0.7, defaults to asking: "Are you looking for a quick answer, or is this part of a bigger project?"
- Re-classification trigger: if a quick question user pivots (e.g., "actually, I need to plan this whole thing out"), the router detects and switches mode
- Classification is cached on the conversation record — subsequent messages in the same conversation skip classification unless a pivot is detected
- Target latency budget: < 300ms for classification (Haiku typically responds in 100-200ms)

### Function Signature

```typescript
interface IntentClassification {
  intent: 'quick_question' | 'troubleshooting' | 'mid_project' | 'full_project'
  confidence: number  // 0-1
  reasoning: string   // brief explanation for debugging
}

async function classifyIntent(
  message: string,
  context: {
    hasActiveProjects: boolean
    activeProjectCategories?: string[]
    skillProfile?: SkillProfile | null
  }
): Promise<IntentClassification>
```

### Error Handling & Fallbacks

- **Classification call fails (timeout/API error):** Default to `full_project` intent with standard system prompt — this is the existing behavior, so the user experience degrades gracefully to what they have today
- **Classification returns low confidence (< 0.7):** Ask the user to clarify rather than guessing wrong
- **Classification call is slow (> 500ms):** Proceed with standard prompt and apply classification retroactively for subsequent messages in the conversation

### Codebase Changes

- `lib/intelligence/intent-router.ts` — new module: classification logic, prompt, confidence thresholds
- `lib/system-prompt.ts` — modified: adds intent-aware prompt variants (quick-answer prompt is shorter and more direct)
- `app/api/chat/route.ts` — modified: adds intent classification step before main AI call
- `components/ChatInterface.tsx` — modified: subtle UI differences per mode (quick answers hide projects sidebar, troubleshooting shows diagnostic progress)
- `conversations` table — modified: new `intent_type` column (VARCHAR, nullable, no new table)

### Unchanged

- Guided bot and agent planner untouched — full project intent routes there as today
- Chat history, auth, rate limiting all work identically

---

## Feature 2: Adaptive Skill Calibration

### Location

A skill profile assembled from existing data, feeding into the system prompt to adjust AI communication depth.

### Profile Data Sources (Passive — No Quiz)

| Source | What It Tells Us | Already Exists? |
|--------|------------------|-----------------|
| **Tool Inventory** | Owns a miter saw + oscillating multi-tool = not a beginner | Yes — `InventoryPanel` |
| **Project History** | Completed an electrical project = understands circuits | Yes — `projects` table |
| **Conversation Patterns** | Uses trade terminology? Asks basic safety questions? | Partially — `conversations` has data, needs analysis |

### Conversation Pattern Analysis

Skill calibration from conversations uses a **keyword/pattern approach**, not an additional Claude call:

- A curated dictionary of trade-specific terminology grouped by domain and complexity level
- Example: using "romex" instead of "wire" signals electrical familiarity; "PEX" vs "plastic pipe" signals plumbing familiarity
- Pattern matching runs on message text at save time (when conversation is persisted), not at query time
- Produces a simple count: `{ domain: string, advancedTermCount: number, basicQuestionCount: number }`
- Thresholds for level inference: 0-2 advanced terms = novice, 3-7 = familiar, 8+ = experienced (tunable)
- This is a heuristic — it doesn't need to be perfect. The "I already knew this" feedback loop corrects over time

### New Signal: Explicit Feedback Loop

- "I already knew this" button on AI responses (single icon click, not a form)
- Different from "bad answer" — signals topic familiarity, not response quality
- Each signal flags that topic area as known territory for the user
- Topic extraction: uses the conversation's `intent_type` and the AI response's detected domain category (a fixed taxonomy: electrical, plumbing, carpentry, hvac, general, landscaping, painting, roofing). No additional Claude call — the domain is tagged when the response is generated

### Skill Profile Data Structure

```typescript
interface SkillProfile {
  userId: string

  // Inferred from tool inventory + project history + conversation patterns
  domainFamiliarity: {
    electrical: 'novice' | 'familiar' | 'experienced'
    plumbing: 'novice' | 'familiar' | 'experienced'
    carpentry: 'novice' | 'familiar' | 'experienced'
    hvac: 'novice' | 'familiar' | 'experienced'
    general: 'novice' | 'familiar' | 'experienced'
    landscaping: 'novice' | 'familiar' | 'experienced'
    painting: 'novice' | 'familiar' | 'experienced'
    roofing: 'novice' | 'familiar' | 'experienced'
  }

  // Inferred from conversation analysis
  communicationLevel: 'beginner' | 'intermediate' | 'advanced'

  // Tracks "I already knew this" signals by domain
  knownTopics: string[]

  // Auto-updated timestamp
  lastCalibrated: Date
}
```

### Database Schema: `user_skill_profiles`

```sql
CREATE TABLE user_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_familiarity JSONB NOT NULL DEFAULT '{}',
  communication_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (communication_level IN ('beginner', 'intermediate', 'advanced')),
  known_topics TEXT[] NOT NULL DEFAULT '{}',
  last_calibrated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: users can only read/update their own profile
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

-- Service role bypasses RLS for server-side profile assembly
```

### How It Adjusts the AI

Modifies the system prompt, not the UI. Examples:

- **Novice in plumbing:** "PEX is a flexible plastic tubing that's replaced copper in many homes. You'll need a PEX crimping tool and copper crimp rings to make connections..."
- **Experienced in plumbing:** "Use 3/4" PEX for the main line, 1/2" for branches. Crimp fittings at each junction."

**Critical rule:** Never omit safety information regardless of skill level. An experienced person still gets warnings about permits, load-bearing walls, or gas line proximity.

### Error Handling & Fallbacks

- **No profile data available (new user, no tools, no projects):** Default to `beginner` communication level and `novice` across all domains. The AI gives full explanations — better to over-explain for a new user than under-explain
- **Profile assembly fails (database error):** Proceed without calibration — standard system prompt, no personalization. Log the error for monitoring
- **Stale profile (lastCalibrated > 30 days):** Trigger background recalculation on next chat message. Use the stale profile in the meantime rather than blocking

### Codebase Changes

- `lib/intelligence/skill-profile.ts` — new: assembles profile from existing data sources
- `lib/intelligence/prompt-calibrator.ts` — new: takes a skill profile and adjusts the system prompt's instruction set
- `lib/intelligence/trade-terminology.ts` — new: curated keyword dictionary for conversation pattern analysis
- `lib/system-prompt.ts` — modified: calls the calibrator before building the final prompt
- `components/ChatMessages.tsx` — modified: adds "I already knew this" button on AI responses
- New migration: `user_skill_profiles` table (schema above)

### Unchanged

- No changes to onboarding or auth flow
- Tool inventory and project features work exactly as before — they become inputs to the profile
- AI knowledge and capabilities unchanged — only framing adjusts

---

## Feature 3: Expert Co-Pilot Toolkit

### Location

Embedded in the expert dashboard, specifically in the Q&A answer flow (`components/marketplace/QAAnswerForm.tsx`) and the expert question detail view. All tools are opt-in — never auto-triggered.

### Tool 1: Code Lookup

**Purpose:** Expert clicks "Find Codes" and enters a topic + the DIYer's location. Returns relevant building/electrical/plumbing codes as reference cards.

**Behavior:**
- Pulls DIYer's location from question context (already captured in Q&A submission)
- Uses Claude to search and summarize relevant codes by topic and jurisdiction
- Presents results as collapsible reference cards with source citations
- Expert can pin useful codes to their answer draft
- Every code reference includes disclaimer: "Verify with your local building department — codes vary by jurisdiction and amendment date."

### Tool 2: Draft Assistant

**Purpose:** Expert clicks "Generate Draft" and gets an AI-written answer based on the question, project context, and report data. Expert edits freely before submitting.

**Behavior:**
- Uses existing `lib/marketplace/context-builder.ts` to assemble project context
- Generates draft in neutral, technical tone — not mimicking the expert's voice
- Draft appears in editable text area alongside normal answer form — not replacing it
- If expert submits a draft-based answer, tagged `ai_assisted: true` in metadata (not shown to DIYer, available for internal quality analysis)
- Expert can discard draft entirely with one click

**UX principle:** The draft button is a secondary action, not prominent. We don't signal that experts should rely on AI.

### Tool 3: Licensing-Aware Reference Surfacer

**Purpose:** Surfaces relevant technical references when an expert opens a question, with licensing awareness that respects trade boundaries.

**Licensing Logic:**

| Scenario | Expert CAN do | Surfacer flags |
|----------|--------------|----------------|
| Licensed plumber answering plumbing question | Full technical guidance | No restrictions |
| General contractor answering plumbing question | Explain concepts, suggest DIYer do it themselves, recommend licensed plumber | "Plumbing work in [state] requires a licensed plumber. Frame advice for homeowner self-work or recommend a licensed specialist." |
| Electrician answering HVAC question | Share general knowledge, recommend licensed HVAC tech | "HVAC installation/repair in [state] requires [license type]. Scope your answer to homeowner-safe tasks or recommend a specialist." |

**Behavior:**
- Cross-references expert's verified licenses (`expert_licenses` table) against question's trade category
- Checks state-level licensing requirements from `trade_licensing_rules` reference table
- When licensing gap detected, shows prominent but non-blocking advisory banner
- Suggests framing language:
  - "As a homeowner, you're generally permitted to..."
  - "For this specific task, I'd recommend consulting a licensed..."
  - "This is something you can handle yourself, but if you want a professional..."
- References filtered to homeowner-safe scope when licensing gap exists
- Panel always available (collapsed by default), pre-loads content only when gap detected
- Expert can manually search within the panel for any topic

**Trade Licensing Rules Table:**

```sql
CREATE TABLE trade_licensing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,              -- e.g., "MI", "CA"
  trade_category TEXT NOT NULL,     -- e.g., "plumbing", "electrical", "hvac"
  license_required BOOLEAN NOT NULL,
  license_type TEXT,                -- e.g., "Master Plumber", "Journeyman Electrician"
  homeowner_exemption BOOLEAN DEFAULT true,
  homeowner_exemption_notes TEXT,   -- e.g., "single-family residence only"
  source_url TEXT,                  -- link to state licensing board
  last_verified DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state, trade_category)
);

-- RLS: readable by all authenticated users, writable only by service role
ALTER TABLE trade_licensing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read licensing rules"
  ON trade_licensing_rules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserts/updates handled via service role (admin seeding)
```

**V1 Data Seeding Strategy:** Initially populate the 4 most common licensed trades (electrical, plumbing, HVAC, structural/general contracting) for the 10 highest-traffic states. This covers ~80% of marketplace questions. Track which state/trade combinations get queried but have no data — use this to prioritize expansion. Seeding is a one-time admin task using the service role, with `last_verified` set to the seeding date. Quarterly review cadence for verifying existing data.

### Error Handling & Fallbacks

- **Code Lookup fails (Claude API error):** Show error message in the code lookup panel: "Unable to retrieve codes right now. Try again or consult [state licensing board URL]." Expert can still answer without codes
- **Draft generation fails:** Show error in draft area: "Draft generation unavailable. You can write your answer directly." Answer form is always available regardless of draft status
- **Licensing rules lookup fails or no data for state/trade:** Show generic advisory: "Licensing requirements vary by state. If this question falls outside your licensed trade, consider framing advice for homeowner self-work." This is the safe default — better to show a generic advisory than nothing
- **Expert has no verified licenses on file:** Treat as if no licenses match any trade — show generic advisory on all questions. This incentivizes license verification

### Codebase Changes

| Change | File |
|--------|------|
| Code lookup API | New `app/api/experts/tools/code-lookup/route.ts` |
| Draft generation API | New `app/api/experts/tools/draft-answer/route.ts` |
| Reference surfacer API | New `app/api/experts/tools/references/route.ts` |
| Co-pilot UI container | New `components/marketplace/ExpertCoPilot.tsx` |
| Code lookup UI | New `components/marketplace/CodeLookup.tsx` |
| Draft integration | Modified `components/marketplace/QAAnswerForm.tsx` — adds draft button and editable preview |
| Reference panel | New `components/marketplace/ReferenceSurface.tsx` |
| Expert tools lib | New `lib/marketplace/expert-tools.ts` |
| Licensing rules migration | New migration: `trade_licensing_rules` table + RLS |

### Unchanged

- Answer submission flow identical — expert writes/edits and hits submit
- Q&A pricing, claiming, bidding untouched
- DIYer never sees these tools
- Expert reputation/rating system unchanged

---

## Developer Workflow Skills

All five skills live in `.claude/skills/` as markdown files. They are Claude Code skills — development tools that run in your Claude Code sessions, not application code.

### Skill File Structure

Each skill is a markdown file in `.claude/skills/` with frontmatter:

```markdown
---
name: skill-name
description: One-line description used for skill matching
---

[Skill instructions — what the skill does, how to invoke it, step-by-step behavior]
```

Skills are invoked via Claude Code by asking for the skill by name or describing the task. Example: "run the marketplace flow tester" or "test the Q&A payment flow."

### Skill 1: Marketplace Flow Tester (`marketplace-flow-tester.md`)

**Purpose:** Automates end-to-end testing of the Q&A payment lifecycle against local dev environment + Stripe test mode.

**Test Sequence:**
1. Create test DIYer (Supabase auth)
2. Create test expert (with Stripe Connect test account)
3. Submit a question (verify credit deduction / first-free logic)
4. Expert claims question (verify escrow hold)
5. Expert submits answer (verify claim state transition)
6. DIYer accepts (verify payout, escrow release, credit transaction ledger)
7. Alternative path: DIYer marks "not helpful" (verify refund + 50% payout)
8. Verify all notification records created
9. Cleanup test data

**Capabilities:**
- Reports pass/fail summary with specific failure points
- Can run individual steps in isolation (e.g., "just test the escrow flow")
- Aware of `QA_PAYMENT_TEST_MODE` flag and escrow/claim timing windows
- Uses Bash tool to run API calls via `curl` against local dev server
- Uses Supabase admin client queries to verify database state
- Uses Stripe CLI (`stripe trigger`) or test API calls for payment verification

**Invocation:** "Run marketplace flow test" or "Test the Q&A payment flow"

### Skill 2: Migration Validator (`migration-validator.md`)

**Purpose:** Checks new Supabase migrations for problems before applying.

**Checks:**
- Breaking changes to columns referenced by existing code (cross-references `lib/` and `app/api/` routes via Grep)
- Missing rollback path (checks for corresponding down migration or reversible structure)
- Index implications on large tables
- RLS policy gaps on new tables (every table must have RLS enabled)
- Foreign key cascade issues
- Compares new migration against the latest schema state from `supabase/migrations/`

**Output:** Safe to apply / warnings / blocking issues, with specific line references

**Invocation:** "Validate migration [filename]" or "Check my new migration"

### Skill 3: Agent Phase Debugger (`agent-phase-debugger.md`)

**Purpose:** Replays individual phases of the 6-phase project planner without running the full pipeline.

**Capabilities:**
- Specify which phase to debug (design, plan, research, sourcing, report-builder, report)
- Reads the phase implementation from `lib/agents/phases/[phase].ts` and the prompts from `lib/agents/prompts.ts`
- Captures: assembled system prompt, expected tool calls, phase output structure
- "What if" mode: modify input context and trace how the phase logic would behave
- Can diff two phase configurations side-by-side

**Invocation:** "Debug the research phase" or "What happens if the sourcing phase gets no materials?"

### Skill 4: API Regression Scanner (`api-regression-scanner.md`)

**Purpose:** Maps 70+ API endpoints against test coverage and flags gaps.

**How it works:**
- Scans `app/api/` for all `route.ts` files using Glob
- Extracts exported HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Cross-references against test files in `__tests__/`, `*.test.ts`, `*.spec.ts`, and Playwright `e2e/` via Grep
- Matches by route path pattern and HTTP method

**Output Format:**
```
✓ /api/chat                    — unit + e2e
✓ /api/qa/[id]/claim           — unit
✗ /api/qa/[id]/second-opinion  — NO TESTS
✗ /api/experts/tools/draft     — NO TESTS (new endpoint)
⚠ /api/qa/[id]/bids           — unit only, no e2e
```

**Capabilities:**
- Auto-generates baseline Vitest test stubs for untested endpoints
- Change-aware mode: "you changed these 3 endpoints, here's their test status" (uses `git diff` to detect changed routes)

**Invocation:** "Scan API test coverage" or "What endpoints are untested?"

### Skill 5: Browser UI Flow Tester (`browser-ui-flow-tester.md`)

**Purpose:** Uses Claude-in-Chrome browser automation to walk through critical user flows in the running app, verifying frontend works end-to-end from a user's perspective.

**Flows Covered:**

| Flow | What It Tests |
|------|--------------|
| DIYer Quick Question | Type question → get direct answer → verify "go deeper" option |
| DIYer Full Project | Guided bot → agent planner → phases progress → report renders with all tabs |
| Q&A Submission | Navigate marketplace → fill question form → verify difficulty scoring → submit → confirm in queue |
| Expert Claim & Answer | Log in as expert → browse queue → claim → write answer → submit → verify state transitions |
| Expert Co-Pilot Tools | Open claimed question → "Find Codes" → verify results → "Generate Draft" → verify editable draft → discard |
| DIYer Accept/Reject | Open answered question → accept → verify review form → submit review |
| Messaging | DIYer sends message → switch to expert view → verify received → reply → verify thread updates |
| Chat Image Upload | Attach image → send → verify AI response references image |

**Capabilities:**
- Records each flow as a GIF using `mcp__claude-in-chrome__gif_creator` for visual review
- Captures console errors via `mcp__claude-in-chrome__read_console_messages` with pattern filtering for errors
- Monitors network requests via `mcp__claude-in-chrome__read_network_requests` to verify API calls and status codes
- Takes screenshots at key checkpoints via `mcp__claude-in-chrome__computer` (screenshot action)
- Uses `mcp__claude-in-chrome__form_input` for filling forms and `mcp__claude-in-chrome__find` for locating elements

**Requirements:**
- Local dev server running (`npm run dev`)
- Test user credentials seeded (coordinates with Skill 1's test data setup)
- Chrome with Claude-in-Chrome extension active

**Relationship to Skill 1:** Skill 1 tests backend plumbing (APIs, database, Stripe). Skill 5 tests frontend experience (clicks, renders, state). Run Skill 1 first (fast), then Skill 5 (slower).

**Invocation:** "Run UI flow tests" or "Test the Q&A submission flow in the browser"

---

## Testing Strategy for Application Features

### Feature 1: Smart Routing

- **Unit tests:** `classifyIntent()` function with fixture messages for each intent category. Test confidence thresholds, fallback behavior, and edge cases (ambiguous messages)
- **Integration test:** Full chat API call verifying that `intent_type` is stored on the conversation and the correct system prompt variant is used
- **E2E (Browser UI Flow Tester):** Quick question flow and full project flow verify routing works from the user's perspective

### Feature 2: Skill Calibration

- **Unit tests:** Profile assembly from mock tool inventory + project history data. Keyword matching against trade terminology dictionary. Prompt calibrator output for each skill level
- **Integration test:** Chat API call with a user who has tool inventory data, verify the system prompt includes calibration instructions
- **Manual QA:** Compare AI responses for the same question with novice vs. experienced profiles — verify explanation depth differs but safety info is always present

### Feature 3: Expert Co-Pilot

- **Unit tests:** Licensing gap detection logic (expert licenses vs. trade category vs. state rules). Draft generation prompt assembly. Code lookup prompt assembly
- **Integration test:** Expert tools API endpoints return expected data formats, handle missing data gracefully
- **E2E (Browser UI Flow Tester):** Expert Co-Pilot Tools flow verifies all three tools render and function correctly
- **Edge case tests:** Expert with no licenses, state with no licensing data, question in unrecognized trade category

---

## Implementation Priority (Recommended)

1. **Smart Routing** — highest immediate impact, changes every user's first interaction
2. **Skill Calibration** — data collection starts passively from day one, progressively improves
3. **Expert Co-Pilot** — critical for expert retention but serves smaller user base
4. **Developer Skills** — build alongside application features to accelerate development

Within developer skills:
1. Marketplace Flow Tester (most time saved)
2. Browser UI Flow Tester (catches frontend issues the backend tester misses)
3. API Regression Scanner (prevents regressions as feature count grows)
4. Migration Validator (important but less frequent need)
5. Agent Phase Debugger (valuable but narrower scope)

---

## Out of Scope

- Changes to the guided bot onboarding flow
- Changes to Q&A pricing, bidding, or payment flow
- New user-facing pages (these features integrate into existing pages)
- Mobile app considerations
- Expert voice/style matching in draft assistant
