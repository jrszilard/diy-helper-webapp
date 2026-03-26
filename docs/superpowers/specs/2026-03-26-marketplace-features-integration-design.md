# Marketplace Features Integration into Main

**Date:** 2026-03-26
**Branch:** Feature branch off `main`
**Source:** `marketplace-build` branch (36 commits, 57 files, ~8,255 lines)
**Approach:** All-at-once on a single feature branch — port backend, integrate shared logic, rebuild UI with main's design system

## Context

The `marketplace-build` branch developed intelligence layer features, expert tools, and UI components before `main` received a full UI design system overhaul (component library, CSS tokens, consistent earthy theme). This spec defines how to reintegrate the functional features from `marketplace-build` while using main's design system for all UI.

## Section 1: Backend Port (Intelligence Layer + Expert Tools + Migrations)

### New Files (Direct Port)

**Intelligence layer** (`lib/intelligence/`):
- `types.ts` — `IntentType` ('quick_question' | 'troubleshooting' | 'mid_project' | 'full_project'), `SkillProfile`, `FamiliarityLevel`, `CommunicationLevel`, `DomainCategory`, `IntentClassificationContext`
- `intent-router.ts` — Uses Haiku to classify user's first message into one of 4 intent types. 500ms timeout, falls back to 'full_project' with 0 confidence on error. Returns intent, confidence score, and reasoning.
- `prompt-calibrator.ts` — Takes base system prompt + skill profile, outputs calibrated prompt adjusted for communication level, domain familiarity, and known topics. Always includes safety reminder regardless of skill level.
- `skill-profile.ts` — Assembles profiles from tool inventory, completed projects, and term usage. `inferFamiliarityFromTermCounts()`: 0-2=novice, 3-7=familiar, 8+=experienced. `mergeProfileSources()` keeps highest familiarity across sources.
- `trade-terminology.ts` — 380+ trade-specific terms across 8 domains (electrical, plumbing, carpentry, hvac, general, landscaping, painting, roofing). `analyzeTerminology()` counts advanced term usage and basic question patterns per domain.

**Expert tools** (`lib/marketplace/`):
- `expert-tools.ts` — `detectLicensingGap()` checks expert's licensed trades against question category. `buildLicensingAdvisory()` generates state-specific licensing message. `buildCodeLookupPrompt()` for IRC/IBC/NEC/UPC research. `buildDraftAnswerPrompt()` scaffolds step-by-step expert answers.

**API routes:**
- `app/api/experts/tools/code-lookup/route.ts` — POST with Zod validation (topic, state 2-char, optional city). Calls Anthropic with `buildCodeLookupPrompt()`. Returns codes, disclaimer, location, topic.
- `app/api/experts/tools/draft-answer/route.ts` — POST with Zod validation (questionId UUID). Queries `qa_questions`, optionally loads project context via `buildExpertContext()`. Returns draft + aiAssisted flag.
- `app/api/experts/tools/references/route.ts` — POST with Zod validation (questionId UUID). Queries `qa_questions`, `expert_profiles`, `expert_licenses`. Detects licensing gap, looks up state trade rules. Returns advisory + gap info.
- `app/api/skill-profile/feedback/route.ts` — POST with Zod validation (domain, optional conversationId). Upserts `user_skill_profiles`, appends domain to known_topics array.

**Test files** (`lib/__tests__/`):
- `chat-intent-integration.test.ts` — Prompt variant lengths, classification prompt content, intent routing logic (high/low confidence, cached intent, fallback)
- `expert-tools.test.ts` — Licensing gap detection, advisory generation, code lookup/draft prompts
- `intent-router.test.ts` — Classification prompt building, intent classification, API failure fallback
- `prompt-calibrator.test.ts` — Beginner/advanced calibration, safety reminder inclusion, null profile passthrough
- `skill-profile.test.ts` — Familiarity inference, communication level derivation, profile merging
- `system-prompt.test.ts` — Prompt variant content validation per intent type
- `trade-terminology.test.ts` — Domain coverage, term detection, case insensitivity, basic pattern detection
- `chat-history.test.ts` — intent_type parameter passing and null handling

### Existing File Modifications

**`lib/config.ts`** — Add `intelligence` block:
```typescript
intelligence: {
  classificationModel: 'claude-haiku-4-5-20251001',
  confidenceThreshold: 0.7,
  timeout: 500,
}
```

**`lib/system-prompt.ts`** — Add `getSystemPrompt(intentType: IntentType): string` function returning intent-specific prompt variants:
- `full_project` — Existing comprehensive workflow prompt (default)
- `quick_question` — Concise 1-3 paragraph answers, no materials list, offer to go deeper
- `troubleshooting` — Diagnostic approach, 2 clarifying questions max, likely-to-unlikely causes
- `mid_project` — Focused on current step, actionable guidance

All variants include safety warnings and expert escalation link. Existing `systemPrompt` export unchanged.

**`lib/chat-history.ts`** — Add optional `intentType?: string` parameter to `createConversation()`, passed through to the database insert.

**`app/api/chat/route.ts`** — Wire intelligence layer into the request flow:
1. Import `classifyIntent`, `calibratePrompt`, `IntentType`, `getSystemPrompt`, `getAdminClient`
2. After message parsing, add intent classification block:
   - New conversation (no existing ID, empty history): classify via `classifyIntent()`, use if confidence >= threshold
   - Existing conversation: load cached `intent_type` from conversations table
   - Select system prompt via `getSystemPrompt(intentType)` or fall back to default
3. Add skill calibration block:
   - If authenticated: query `user_skill_profiles` via admin client
   - If profile exists: run `calibratePrompt()` on the active system prompt
4. Pass `calibratedPrompt` to all `anthropic.messages.create()` calls (streaming and non-streaming)
5. Pass `intentType` to `createConversation()` on new conversation creation

### New Migrations

- `20260312000000_intent_type_column.sql` — Adds `intent_type` VARCHAR column to `conversations` table with CHECK constraint for valid values and column comment.
- `20260312100000_user_skill_profiles.sql` — Creates `user_skill_profiles` table (UUID PK, user_id FK, `domain_familiarity` JSONB with per-domain novice defaults, `communication_level`, `known_topics` text[], timestamps). RLS for user self-access and system insert. Unique on user_id.
- `20260312200000_trade_licensing_rules.sql` — Creates `trade_licensing_rules` table (state, trade_category, license_required, license_type, homeowner_exemption flags, source_url, last_verified). Unique on (state, trade_category). 40 seed rows covering electrical/plumbing/hvac/general across 10 states. RLS read for authenticated users.
- `20260313000000_fix_recursive_rls_policy.sql` — Drops recursive RLS policy on `qa_questions`, creates `user_owns_parent_question()` SECURITY DEFINER function, recreates policy using the function.

## Section 2: Landing Page — Tabbed Hero with Three Paths

### Changes

Replace the `GuidedBot`-only hero section (lines 120-140 of `app/page.tsx`) with a tabbed interface offering three entry paths. All other landing page sections remain untouched.

### New Components

**`components/LandingHero.tsx`**
- Manages `activeTab` state: 'quick' | 'plan' | 'expert'
- Renders tab bar as flex row of `Button` components:
  - Active tab: `variant="primary"`
  - Inactive tabs: `variant="ghost"`
  - Bottom border on the row for visual separation
- Renders active panel:
  - 'quick' → `<LandingQuickChat />`
  - 'plan' → `<GuidedBot />`
  - 'expert' → `<LandingExpertForm />`
- Default active tab: 'quick'

**`components/LandingQuickChat.tsx`**
- Lightweight streaming chat embedded in the hero card
- Popular question chips (quick-select buttons) styled as `Button` variant `ghost` with small size
- Message history rendered inline:
  - User messages: terracotta bg, white text (matching `ChatMessages.tsx` patterns)
  - Assistant messages: surface bg, earth-brown text
- Markdown rendering via ReactMarkdown (same custom components as `ChatMessages.tsx`)
- "Continue in full chat" conversion:
  - Saves conversation ID and messages to sessionStorage
  - Redirects to `/chat`
- Error handling and loading states with `Spinner`

**`components/LandingExpertForm.tsx`**
- Trade category dropdown using `Select` component (12 categories: electrical, plumbing, hvac, carpentry, etc.)
- Question input using `Textarea` component (min 20 chars, character counter)
- Photo upload using new `FileUpload` component (Section 5)
- Files converted to base64 data URLs for sessionStorage persistence
- On submit: saves draft to sessionStorage key `diy-expert-question-draft` (`{ question, trade, photoUrls }`), redirects to `/marketplace/qa`
- Validation feedback via design system patterns (error states on inputs)

### Landing Page Modification (`app/page.tsx`)

- Replace the hero section's `<GuidedBot />` with `<LandingHero />`
- Keep the "Already know what you need? Skip to full chat →" link below
- No other changes to the page

## Section 3: Chat Feedback — "I already knew this" Button

### Changes

Add an inline feedback button below each assistant message in `components/ChatMessages.tsx`.

### Implementation

- Below each assistant message's markdown content, render a `<button>`:
  - Default state: "I already knew this" with `CheckCircle` icon (16px)
  - Styling: `text-xs text-earth-brown-light hover:text-terracotta transition-colors`
  - Acknowledged state: "Got it, noted for next time" in `text-xs text-forest-green`
- On click: POST to `/api/skill-profile/feedback` with domain inferred from conversation context
- State tracked per-message via local `Set<number>` of acknowledged message indices
- Only rendered for authenticated users (check via Supabase session)
- No new component — styled `<button>` consistent with existing message layout

### What stays the same

Message bubble styling, markdown rendering, progress indicators, retry button, streaming dots, video results — all untouched.

## Section 4: Expert Co-Pilot — Side Panel

### Changes

Add an "Expert Tools" button to `QAAnswerForm.tsx` that opens a right-side panel with three expert tools.

### Trigger

- `Button` (variant `tertiary`, `leftIcon={Wrench}`) labeled "Expert Tools"
- Placed above the answer textarea in the form
- Opens panel via `Modal` component with `position="right"` and `size="lg"`

### Panel Component: `components/marketplace/ExpertCoPilot.tsx`

Three collapsible sections, each with a clickable `SectionHeader` + chevron that toggles visibility via `useState` boolean.

**Section 1: Find Codes (`CodeLookup`)**
- `TextInput` for topic, `Select` for state (2-char), optional `TextInput` for city
- `Button` (variant `secondary`) to search
- Results in a `Card` with code text
- `Badge` (variant `neutral`) for disclaimer
- Calls `/api/experts/tools/code-lookup`

**Section 2: Generate Draft**
- `Button` (variant `secondary`) labeled "Generate Draft Answer"
- `Spinner` while loading
- Draft text displayed in a `Card`
- `Button` (variant `primary`) labeled "Insert into answer" — calls `onInsertDraft` callback to populate parent form textarea
- Calls `/api/experts/tools/draft-answer`

**Section 3: Licensing & References (`ReferenceSurface`)**
- Auto-fetches on section expand using the question ID
- Three states using `Alert` component:
  - `success` variant: No licensing gap detected
  - `warning` variant: Gap detected with trade mismatch details
  - `info` variant: No licenses on file for this expert
- `Spinner` while loading
- Calls `/api/experts/tools/references`

### Supporting Components

- `components/marketplace/CodeLookup.tsx` — Extracted for reuse, uses design system form components
- `components/marketplace/ReferenceSurface.tsx` — Extracted for reuse, uses `Alert` and `Spinner`

### Integration with QAAnswerForm

- Import `ExpertCoPilot` and `Modal`
- Add `isToolsOpen` state
- Render trigger button and `<Modal>` with `<ExpertCoPilot questionId={...} onInsertDraft={...} />`
- `onInsertDraft` callback sets the answer textarea value

## Section 5: FileUpload Design System Component

### New Component: `components/ui/FileUpload.tsx`

**Props:**
```typescript
interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;      // default 3
  maxSizeMB?: number;     // default 5
  accept?: string;        // default "image/*"
  label?: string;
  error?: string;
}
```

**Drop zone:**
- `border-2 border-dashed border-earth-sand rounded-xl` on white background
- Centered: camera icon (lucide `Camera`, 28px) + "Click to upload or drag photos here" (semibold) + "JPG, PNG up to {maxSizeMB}MB each" (muted)
- Drag-over state: `border-terracotta bg-terracotta/5`
- Hidden `<input type="file" multiple accept={accept}>` triggered on zone click
- Disabled appearance when `files.length >= maxFiles`

**Thumbnail grid:**
- Flex row with `gap-2`, rendered below the drop zone when files exist
- Each thumbnail: 80x80, `rounded-lg`, `border border-earth-sand`, `overflow-hidden`
- Image preview via `URL.createObjectURL()`
- Remove button: `IconButton` (variant `danger`, `X` icon, size small) positioned absolute top-right
- Cleanup: `URL.revokeObjectURL()` on unmount and on file removal

**Validation:**
- File size check on add — files exceeding `maxSizeMB` rejected
- File count check — excess files rejected
- Errors surfaced via `Alert` component (variant `error`) below the drop zone

**Export:** Added to `components/ui/index.ts`

### Integration Points

- `QASubmitForm.tsx` — Replace photo URL textarea with `<FileUpload>`. Files uploaded to `/api/messages/upload` on form submit, returned URLs sent with the question payload.
- `LandingExpertForm.tsx` — Same `<FileUpload>`. Files converted to base64 data URLs via `FileReader` for sessionStorage persistence (survives redirect to `/marketplace/qa`).

## Section 6: Migration Hardening

### Changes

7 existing marketplace migrations + 2 support migrations get idempotent safety wrappers. Direct port from `marketplace-build`. No schema changes — only DDL syntax changes for safe re-runs.

### Pattern

- `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ADD COLUMN` → `DO $$ BEGIN ALTER TABLE ... ADD COLUMN ...; EXCEPTION WHEN duplicate_column THEN NULL; END $$`
- `CREATE INDEX` → `CREATE INDEX IF NOT EXISTS`
- `CREATE POLICY` → `DO $$ BEGIN CREATE POLICY ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$`

### Files

- `20260225000000_qa_payment_flow_v2.sql`
- `20260226000000_qa_threaded_conversations.sql`
- `20260226200000_qa_progressive_tiers.sql`
- `20260226300000_qa_expert_bidding.sql`
- `20260226400000_qa_project_graduation.sql`
- `20260226500000_qa_reputation_engine.sql`
- `20260226600000_qa_protection_sustainability.sql`
- `20260308100000_strengthen_rls_policies.sql`
- `20260309000000_beta_feedback.sql`

## Out of Scope

- `.claude/skills/` files from marketplace-build (developer tooling, not user-facing)
- `GO_LIVE_CHECKLIST.md` updates
- `docs/superpowers/plans/` and `docs/superpowers/specs/` from marketplace-build (historical planning docs)
- Any changes to components not listed above — main's design system styling is preserved everywhere
