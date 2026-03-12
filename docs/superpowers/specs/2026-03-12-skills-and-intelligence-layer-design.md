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

Intercepts at the beginning of the `/api/chat` flow, before the AI generates a response.

### Intent Categories

| Intent | Signal Examples | Behavior |
|--------|----------------|----------|
| **Quick Question** | "What size nail for baseboards?" / "Can I mix PEX and copper?" | Direct answer, 1-3 paragraphs max. No project creation. Offers "want to go deeper?" at the end |
| **Troubleshooting** | "My outlet isn't working" / "I'm getting water under my sink" | Diagnostic flow: asks clarifying questions, gives step-by-step fix. Optional: "This might need a pro" escalation to marketplace |
| **Mid-Project Help** | "I'm installing tile and the mortar isn't sticking" / references an existing project | Contextual help using their active project data, tool inventory, and where they are in the process |
| **Full Project** | "I want to build a deck" / "Planning a bathroom remodel" | Routes to existing guided bot → agent planner flow |

### Classification Approach

- Uses a lightweight Claude call with a focused system prompt — intent classification only, not a full response
- Inputs: the user's message, whether they have active projects, their skill profile (once calibration is in place)
- Returns: intent category + confidence score
- If confidence < 0.7, defaults to asking: "Are you looking for a quick answer, or is this part of a bigger project?"
- Re-classification trigger: if a quick question user pivots (e.g., "actually, I need to plan this whole thing out"), the router detects and switches mode

### Codebase Changes

- `lib/intelligence/intent-router.ts` — new module: classification logic, prompt, confidence thresholds
- `lib/system-prompt.ts` — modified: adds intent-aware prompt variants (quick-answer prompt is shorter and more direct)
- `/api/chat/route.ts` — modified: adds intent classification step before main AI call
- `ChatInterface.tsx` — modified: subtle UI differences per mode (quick answers hide projects sidebar, troubleshooting shows diagnostic progress)
- `conversations` table — modified: new `intent_type` column (no new table)

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

### New Signal: Explicit Feedback Loop

- "I already knew this" button on AI responses (single icon click, not a form)
- Different from "bad answer" — signals topic familiarity, not response quality
- Each signal flags that topic area as known territory for the user

### Skill Profile Data Structure

```typescript
interface SkillProfile {
  userId: string

  // Inferred from tool inventory + project history
  domainFamiliarity: {
    electrical: 'novice' | 'familiar' | 'experienced'
    plumbing: 'novice' | 'familiar' | 'experienced'
    carpentry: 'novice' | 'familiar' | 'experienced'
    hvac: 'novice' | 'familiar' | 'experienced'
    general: 'novice' | 'familiar' | 'experienced'
    // extensible to other domains
  }

  // Inferred from conversation analysis
  communicationLevel: 'beginner' | 'intermediate' | 'advanced'

  // Tracks "I already knew this" signals by topic
  knownTopics: string[]

  // Auto-updated timestamp
  lastCalibrated: Date
}
```

### How It Adjusts the AI

Modifies the system prompt, not the UI. Examples:

- **Novice in plumbing:** "PEX is a flexible plastic tubing that's replaced copper in many homes. You'll need a PEX crimping tool and copper crimp rings to make connections..."
- **Experienced in plumbing:** "Use 3/4" PEX for the main line, 1/2" for branches. Crimp fittings at each junction."

**Critical rule:** Never omit safety information regardless of skill level. An experienced person still gets warnings about permits, load-bearing walls, or gas line proximity.

### Codebase Changes

- `lib/intelligence/skill-profile.ts` — new: assembles profile from existing data sources
- `lib/intelligence/prompt-calibrator.ts` — new: takes a skill profile and adjusts the system prompt's instruction set
- `lib/system-prompt.ts` — modified: calls the calibrator before building the final prompt
- `ChatMessages.tsx` — modified: adds "I already knew this" button on AI responses
- New table: `user_skill_profiles` — caches the computed profile (avoids recalculation every message)

### Unchanged

- No changes to onboarding or auth flow
- Tool inventory and project features work exactly as before — they become inputs to the profile
- AI knowledge and capabilities unchanged — only framing adjusts

---

## Feature 3: Expert Co-Pilot Toolkit

### Location

Embedded in the expert dashboard, specifically in the Q&A answer flow (`QAAnswerForm.tsx`) and the expert question detail view. All tools are opt-in — never auto-triggered.

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
```

**Data maintenance:** `last_verified` and `source_url` fields enable auditing. Initially populate common trades (electrical, plumbing, HVAC, structural) across highest-traffic states, then expand.

### Codebase Changes

| Change | File |
|--------|------|
| Code lookup API | New `/api/experts/tools/code-lookup/route.ts` |
| Draft generation API | New `/api/experts/tools/draft-answer/route.ts` |
| Reference surfacer API | New `/api/experts/tools/references/route.ts` |
| Co-pilot UI container | New `components/marketplace/ExpertCoPilot.tsx` |
| Code lookup UI | New `components/marketplace/CodeLookup.tsx` |
| Draft integration | Modified `QAAnswerForm.tsx` — adds draft button and editable preview |
| Reference panel | New `components/marketplace/ReferenceSurface.tsx` |
| Expert tools lib | New `lib/marketplace/expert-tools.ts` |
| Licensing rules migration | New migration: `trade_licensing_rules` table |

### Unchanged

- Answer submission flow identical — expert writes/edits and hits submit
- Q&A pricing, claiming, bidding untouched
- DIYer never sees these tools
- Expert reputation/rating system unchanged

---

## Developer Workflow Skills

All five skills live in `.claude/skills/` and are invokable from Claude Code sessions. They are development tools — they don't ship to production.

### Skill 1: Marketplace Flow Tester

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
- Can run individual steps in isolation
- Aware of `QA_PAYMENT_TEST_MODE` flag and escrow/claim timing windows

### Skill 2: Migration Validator

**Purpose:** Checks new Supabase migrations for problems before applying.

**Checks:**
- Breaking changes to columns referenced by existing code (cross-references `lib/` and API routes)
- Missing rollback path
- Index implications on large tables
- RLS policy gaps on new tables
- Foreign key cascade issues

**Output:** Safe to apply / warnings / blocking issues

### Skill 3: Agent Phase Debugger

**Purpose:** Replays individual phases of the 6-phase project planner without running the full pipeline.

**Capabilities:**
- Specify which phase to debug (design, plan, research, sourcing, report-builder, report)
- Runs phase with same prompts and tools from `lib/agents/phases/`
- Captures: assembled system prompt, tool calls + results, phase output, token usage, timing
- "What if" mode: modify input, see how output changes
- Diff two runs side-by-side

### Skill 4: API Regression Scanner

**Purpose:** Maps 70+ API endpoints against test coverage and flags gaps.

**Output Format:**
```
✓ /api/chat                    — unit + e2e
✓ /api/qa/[id]/claim           — unit
✗ /api/qa/[id]/second-opinion  — NO TESTS
✗ /api/experts/tools/draft     — NO TESTS (new endpoint)
⚠ /api/qa/[id]/bids           — unit only, no e2e
```

**Capabilities:**
- Auto-generates baseline test stubs for untested endpoints
- Pre-commit/pre-PR check: "you changed these 3 endpoints, here's their test status"

### Skill 5: Browser UI Flow Tester

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
- Records each flow as a GIF for visual review
- Captures console errors during each flow (React errors, failed API calls, unhandled rejections)
- Monitors network requests (verifies correct API calls and status codes)
- Takes screenshots at key checkpoints

**Requirements:**
- Local dev server running (`npm run dev`)
- Test user credentials seeded (coordinates with Skill 1's test data)
- Chrome with Claude-in-Chrome extension active

**Relationship to Skill 1:** Skill 1 tests backend plumbing (APIs, database, Stripe). Skill 5 tests frontend experience (clicks, renders, state). Run Skill 1 first (fast), then Skill 5 (slower).

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
