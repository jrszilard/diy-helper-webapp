# Marketplace Features Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port intelligence layer, expert tools, and UI features from `marketplace-build` into `main`, rebuilding all UI with main's design system.

**Architecture:** Backend files are mostly new (direct port from `marketplace-build`). Shared files (`chat/route.ts`, `system-prompt.ts`, `config.ts`, `chat-history.ts`) get surgical modifications. UI components are rebuilt from scratch using `components/ui/` design system. All work happens on a single feature branch off `main`.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Supabase (auth + DB), Anthropic SDK, Zod, Lucide icons, design system components (CVA-based)

**Spec:** `docs/superpowers/specs/2026-03-26-marketplace-features-integration-design.md`

---

## File Structure

### New files (created)
- `lib/intelligence/types.ts` — Shared types for intelligence layer
- `lib/intelligence/intent-router.ts` — Haiku-based intent classification
- `lib/intelligence/prompt-calibrator.ts` — Prompt adaptation by skill level
- `lib/intelligence/skill-profile.ts` — Profile assembly from multiple sources
- `lib/intelligence/trade-terminology.ts` — 380+ trade terms across 8 domains
- `lib/marketplace/expert-tools.ts` — Licensing, code lookup, draft prompts
- `app/api/experts/tools/code-lookup/route.ts` — Building code research endpoint
- `app/api/experts/tools/draft-answer/route.ts` — Expert answer drafting endpoint
- `app/api/experts/tools/references/route.ts` — Licensing advisory endpoint
- `app/api/skill-profile/feedback/route.ts` — "I already knew this" endpoint
- `lib/__tests__/intent-router.test.ts`
- `lib/__tests__/prompt-calibrator.test.ts`
- `lib/__tests__/skill-profile.test.ts`
- `lib/__tests__/trade-terminology.test.ts`
- `lib/__tests__/system-prompt.test.ts`
- `lib/__tests__/chat-history.test.ts`
- `lib/__tests__/chat-intent-integration.test.ts`
- `lib/__tests__/expert-tools.test.ts`
- `components/ui/FileUpload.tsx` — Reusable file upload with drop zone + thumbnails
- `components/LandingHero.tsx` — Tabbed hero with three paths
- `components/LandingQuickChat.tsx` — Lightweight streaming chat for landing page
- `components/LandingExpertForm.tsx` — Expert question form for landing page
- `components/marketplace/CodeLookup.tsx` — Building code search panel
- `components/marketplace/ExpertCoPilot.tsx` — Side panel with three expert tools
- `components/marketplace/ReferenceSurface.tsx` — Licensing gap checker
- `supabase/migrations/20260312000000_intent_type_column.sql`
- `supabase/migrations/20260312100000_user_skill_profiles.sql`
- `supabase/migrations/20260312200000_trade_licensing_rules.sql`
- `supabase/migrations/20260313000000_fix_recursive_rls_policy.sql`

### Modified files
- `lib/config.ts:192-194` — Add intelligence block, update default export
- `lib/system-prompt.ts:1-143` — Add `getSystemPrompt()` and 3 new prompt variants
- `lib/chat-history.ts:13-31` — Add `intentType` param to `createConversation()`
- `app/api/chat/route.ts:1-454` — Wire intent classification + skill calibration
- `components/ChatMessages.tsx` — Add "I already knew this" feedback button
- `components/ChatInterface.tsx` — Compute `conversationDomain` via `analyzeTerminology()`
- `components/ui/index.ts:20` — Add FileUpload export
- `components/marketplace/QAAnswerForm.tsx` — Add Expert Tools button + Modal
- `components/marketplace/QASubmitForm.tsx` — Replace photo URL textarea with FileUpload
- `app/page.tsx:120-140` — Replace GuidedBot with LandingHero
- `app/marketplace/qa/page.tsx` — Add sessionStorage hydration for expert draft
- 9 existing migration files — Add idempotent wrappers

---

### Task 1: Create Feature Branch

**Files:** None (git operation)

- [ ] **Step 1: Create and checkout feature branch**

```bash
git checkout -b feat/marketplace-features-integration main
```

- [ ] **Step 2: Verify clean state**

Run: `git status`
Expected: On branch `feat/marketplace-features-integration`, nothing to commit

---

### Task 2: Port Intelligence Layer Types and Trade Terminology

**Files:**
- Create: `lib/intelligence/types.ts`
- Create: `lib/intelligence/trade-terminology.ts`
- Test: `lib/__tests__/trade-terminology.test.ts`

- [ ] **Step 1: Write the trade terminology test**

Port from `marketplace-build`:
```bash
git show marketplace-build:lib/__tests__/trade-terminology.test.ts > lib/__tests__/trade-terminology.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/trade-terminology.test.ts --no-coverage`
Expected: FAIL — modules not found

- [ ] **Step 3: Create intelligence types**

```bash
mkdir -p lib/intelligence
git show marketplace-build:lib/intelligence/types.ts > lib/intelligence/types.ts
```

- [ ] **Step 4: Create trade terminology module**

```bash
git show marketplace-build:lib/intelligence/trade-terminology.ts > lib/intelligence/trade-terminology.ts
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest lib/__tests__/trade-terminology.test.ts --no-coverage`
Expected: PASS — all terminology tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/intelligence/types.ts lib/intelligence/trade-terminology.ts lib/__tests__/trade-terminology.test.ts
git commit -m "feat: add intelligence layer types and trade terminology"
```

---

### Task 3: Port Intent Router

**Files:**
- Create: `lib/intelligence/intent-router.ts`
- Test: `lib/__tests__/intent-router.test.ts`

- [ ] **Step 1: Port the intent router test**

```bash
git show marketplace-build:lib/__tests__/intent-router.test.ts > lib/__tests__/intent-router.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/intent-router.test.ts --no-coverage`
Expected: FAIL — `intent-router` module not found

- [ ] **Step 3: Port the intent router implementation**

```bash
git show marketplace-build:lib/intelligence/intent-router.ts > lib/intelligence/intent-router.ts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/intent-router.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/intent-router.ts lib/__tests__/intent-router.test.ts
git commit -m "feat: add intent router with Haiku classification"
```

---

### Task 4: Port Skill Profile and Prompt Calibrator

**Files:**
- Create: `lib/intelligence/skill-profile.ts`
- Create: `lib/intelligence/prompt-calibrator.ts`
- Test: `lib/__tests__/skill-profile.test.ts`
- Test: `lib/__tests__/prompt-calibrator.test.ts`

- [ ] **Step 1: Port both test files**

```bash
git show marketplace-build:lib/__tests__/skill-profile.test.ts > lib/__tests__/skill-profile.test.ts
git show marketplace-build:lib/__tests__/prompt-calibrator.test.ts > lib/__tests__/prompt-calibrator.test.ts
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/__tests__/skill-profile.test.ts lib/__tests__/prompt-calibrator.test.ts --no-coverage`
Expected: FAIL — modules not found

- [ ] **Step 3: Port both implementations**

```bash
git show marketplace-build:lib/intelligence/skill-profile.ts > lib/intelligence/skill-profile.ts
git show marketplace-build:lib/intelligence/prompt-calibrator.ts > lib/intelligence/prompt-calibrator.ts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/skill-profile.test.ts lib/__tests__/prompt-calibrator.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/skill-profile.ts lib/intelligence/prompt-calibrator.ts lib/__tests__/skill-profile.test.ts lib/__tests__/prompt-calibrator.test.ts
git commit -m "feat: add skill profile assembly and prompt calibrator"
```

---

### Task 5: Port Expert Tools Library

**Files:**
- Create: `lib/marketplace/expert-tools.ts`
- Test: `lib/__tests__/expert-tools.test.ts`

- [ ] **Step 1: Port the expert tools test**

```bash
git show marketplace-build:lib/__tests__/expert-tools.test.ts > lib/__tests__/expert-tools.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/expert-tools.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Port the expert tools implementation**

```bash
git show marketplace-build:lib/marketplace/expert-tools.ts > lib/marketplace/expert-tools.ts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/expert-tools.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/marketplace/expert-tools.ts lib/__tests__/expert-tools.test.ts
git commit -m "feat: add expert tools library — licensing, code lookup, drafts"
```

---

### Task 6: Add System Prompt Variants and Config

**Files:**
- Modify: `lib/system-prompt.ts` — Add `getSystemPrompt()` function and 3 new prompt variants
- Modify: `lib/config.ts:192-194` — Add `intelligence` config block
- Test: `lib/__tests__/system-prompt.test.ts`

- [ ] **Step 1: Port the system prompt test**

```bash
git show marketplace-build:lib/__tests__/system-prompt.test.ts > lib/__tests__/system-prompt.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/system-prompt.test.ts --no-coverage`
Expected: FAIL — `getSystemPrompt` not exported

- [ ] **Step 3: Add prompt variants to system-prompt.ts**

Add the following to the end of `lib/system-prompt.ts` (after the existing `systemPrompt` export on line 143). Port the `quickQuestionPrompt`, `troubleshootingPrompt`, `midProjectPrompt` constants and the `getSystemPrompt` function from `marketplace-build:lib/system-prompt.ts`. The existing `systemPrompt` constant is the `full_project` variant — do NOT replace it.

```typescript
// After the existing systemPrompt export, add:

import type { IntentType } from '@/lib/intelligence/types';

const quickQuestionPrompt = `...`; // Port from marketplace-build
const troubleshootingPrompt = `...`; // Port from marketplace-build
const midProjectPrompt = `...`; // Port from marketplace-build

export function getSystemPrompt(intentType?: IntentType): string {
  switch (intentType) {
    case 'quick_question': return quickQuestionPrompt;
    case 'troubleshooting': return troubleshootingPrompt;
    case 'mid_project': return midProjectPrompt;
    case 'full_project':
    default: return systemPrompt;
  }
}
```

Get the exact prompt text from: `git show marketplace-build:lib/system-prompt.ts`

- [ ] **Step 4: Add intelligence config block**

Add to `lib/config.ts` before the final `const config = ...` line (line 193):

```typescript
// ── Intelligence ────────────────────────────────────────────────────────────
export const intelligence = {
  classificationModel: envString('INTENT_CLASSIFICATION_MODEL', 'claude-haiku-4-5-20251001'),
  classificationMaxTokens: envInt('INTENT_CLASSIFICATION_MAX_TOKENS', 100),
  confidenceThreshold: envFloat('INTENT_CONFIDENCE_THRESHOLD', 0.7),
  classificationTimeoutMs: envInt('INTENT_CLASSIFICATION_TIMEOUT_MS', 500),
} as const;
```

Update the default export on line 193 to include `intelligence`:
```typescript
const config = { beta, anthropic, rateLimits, cors, storeSearch, streaming, pruning, freemium, stripe, marketplace, expertSubscriptions, intelligence } as const;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest lib/__tests__/system-prompt.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/system-prompt.ts lib/config.ts lib/__tests__/system-prompt.test.ts
git commit -m "feat: add intent-aware system prompt variants and intelligence config"
```

---

### Task 7: Modify Chat History for Intent Type

**Files:**
- Modify: `lib/chat-history.ts:13-31` — Add `intentType` parameter
- Test: `lib/__tests__/chat-history.test.ts`

- [ ] **Step 1: Port the chat history test**

```bash
git show marketplace-build:lib/__tests__/chat-history.test.ts > lib/__tests__/chat-history.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/chat-history.test.ts --no-coverage`
Expected: FAIL — `createConversation` doesn't accept `intentType`

- [ ] **Step 3: Add intentType to createConversation**

In `lib/chat-history.ts`, modify the `createConversation` function signature (line 13-17) and insert (line 21-25):

```typescript
export async function createConversation(
  client: SupabaseClient,
  userId: string,
  title?: string,
  projectId?: string,
  intentType?: string
) {
  const { data, error } = await client
    .from('conversations')
    .insert({
      user_id: userId,
      title: title || 'New Conversation',
      project_id: projectId || null,
      intent_type: intentType || null,
    })
    .select('id, title, created_at, updated_at, project_id')
    .single();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/chat-history.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/chat-history.ts lib/__tests__/chat-history.test.ts
git commit -m "feat: add intentType parameter to createConversation"
```

---

### Task 8: Wire Intelligence Layer into Chat Route

**Files:**
- Modify: `app/api/chat/route.ts`
- Test: `lib/__tests__/chat-intent-integration.test.ts`

- [ ] **Step 1: Port the integration test**

```bash
git show marketplace-build:lib/__tests__/chat-intent-integration.test.ts > lib/__tests__/chat-intent-integration.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/chat-intent-integration.test.ts --no-coverage`
Expected: FAIL (or partial pass — some tests may pass since they test prompt functions already added in Task 6)

- [ ] **Step 3: Add imports to chat route**

At the top of `app/api/chat/route.ts`, add after line 10 (`import { systemPrompt }...`):

```typescript
import { getSystemPrompt } from '@/lib/system-prompt';
import { classifyIntent } from '@/lib/intelligence/intent-router';
import { calibratePrompt } from '@/lib/intelligence/prompt-calibrator';
import type { IntentType } from '@/lib/intelligence/types';
import { getAdminClient } from '@/lib/supabase-admin';
```

- [ ] **Step 4: Add intent classification block**

After line 125 (`userContent.push({ type: 'text', text: message });`), add:

```typescript
    // ── Intent Classification ─────────────────────────────────────
    let intentType: IntentType | undefined;
    if (!existingConversationId && prunedHistory.length === 0) {
      const classification = await classifyIntent(message, {
        hasActiveProjects: false,
      });
      if (classification.confidence >= config.intelligence.confidenceThreshold) {
        intentType = classification.intent;
      }
      logger.info('Intent classified', {
        requestId,
        intent: classification.intent,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      });
    } else if (existingConversationId && auth.userId) {
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

    // ── Skill Calibration ─────────────────────────────────────────
    let calibratedPrompt = activeSystemPrompt;
    if (auth.userId) {
      try {
        const adminClient = getAdminClient();
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

- [ ] **Step 5: Replace systemPrompt references with calibratedPrompt**

In the streaming path, replace `system: systemPrompt` with `system: calibratedPrompt` at:
- Line 159 (first `anthropic.messages.create` call)
- Line 242 (follow-up `anthropic.messages.create` call in tool loop)

In the `handleNonStreamingRequest` function:
- Add `intentType?: IntentType` and `calibratedSystemPrompt?: string` parameters to the function signature (line 350-354)
- Replace `system: systemPrompt` with `system: calibratedSystemPrompt || systemPrompt` at lines 365 and 414
- Update the call site (line 128) to pass `intentType` and `calibratedPrompt`:
  ```typescript
  return handleNonStreamingRequest(auth, message, prunedHistory, image ? userContent : undefined, intentType, calibratedPrompt);
  ```

- [ ] **Step 6: Pass intentType to createConversation**

Update the `createConversation` call (~line 280-285) to pass `intentType`:

```typescript
const conv = await createConversation(
  auth.supabaseClient,
  auth.userId,
  generateTitle(message),
  parsed.data.project_id,
  intentType
);
```

- [ ] **Step 7: Run integration test**

Run: `npx jest lib/__tests__/chat-intent-integration.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 8: Run all tests to verify no regressions**

Run: `npx jest --no-coverage`
Expected: All existing tests still pass

- [ ] **Step 9: Commit**

```bash
git add app/api/chat/route.ts lib/__tests__/chat-intent-integration.test.ts
git commit -m "feat: wire intent classification and skill calibration into chat route"
```

---

### Task 9: Port API Routes (Expert Tools + Skill Feedback)

**Files:**
- Create: `app/api/experts/tools/code-lookup/route.ts`
- Create: `app/api/experts/tools/draft-answer/route.ts`
- Create: `app/api/experts/tools/references/route.ts`
- Create: `app/api/skill-profile/feedback/route.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p app/api/experts/tools/code-lookup
mkdir -p app/api/experts/tools/draft-answer
mkdir -p app/api/experts/tools/references
mkdir -p app/api/skill-profile/feedback
```

- [ ] **Step 2: Port all four route files**

```bash
git show marketplace-build:app/api/experts/tools/code-lookup/route.ts > app/api/experts/tools/code-lookup/route.ts
git show marketplace-build:app/api/experts/tools/draft-answer/route.ts > app/api/experts/tools/draft-answer/route.ts
git show marketplace-build:app/api/experts/tools/references/route.ts > app/api/experts/tools/references/route.ts
git show marketplace-build:app/api/skill-profile/feedback/route.ts > app/api/skill-profile/feedback/route.ts
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(experts/tools|skill-profile)" | head -20`
Expected: No errors for these files (or fix any import path issues)

- [ ] **Step 4: Commit**

```bash
git add app/api/experts/tools/ app/api/skill-profile/
git commit -m "feat: add expert tools and skill profile feedback API routes"
```

---

### Task 10: Port New Migrations

**Files:**
- Create: `supabase/migrations/20260312000000_intent_type_column.sql`
- Create: `supabase/migrations/20260312100000_user_skill_profiles.sql`
- Create: `supabase/migrations/20260312200000_trade_licensing_rules.sql`
- Create: `supabase/migrations/20260313000000_fix_recursive_rls_policy.sql`

- [ ] **Step 1: Port all four migration files**

```bash
git show marketplace-build:supabase/migrations/20260312000000_intent_type_column.sql > supabase/migrations/20260312000000_intent_type_column.sql
git show marketplace-build:supabase/migrations/20260312100000_user_skill_profiles.sql > supabase/migrations/20260312100000_user_skill_profiles.sql
git show marketplace-build:supabase/migrations/20260312200000_trade_licensing_rules.sql > supabase/migrations/20260312200000_trade_licensing_rules.sql
git show marketplace-build:supabase/migrations/20260313000000_fix_recursive_rls_policy.sql > supabase/migrations/20260313000000_fix_recursive_rls_policy.sql
```

- [ ] **Step 2: Review migration SQL for correctness**

Read each file and verify:
- `intent_type_column.sql`: CHECK constraint values match `IntentType` in `types.ts`
- `user_skill_profiles.sql`: RLS policies allow user self-read and service role insert
- `trade_licensing_rules.sql`: 40 seed rows present (4 trades × 10 states)
- `fix_recursive_rls_policy.sql`: SECURITY DEFINER function created, old policy dropped

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312*.sql supabase/migrations/20260313*.sql
git commit -m "feat: add intent_type, skill profiles, licensing rules migrations"
```

---

### Task 11: Harden Existing Migrations (Idempotent Wrappers)

**Files:**
- Modify: 9 existing migration files in `supabase/migrations/`

- [ ] **Step 1: Port all 9 modified migrations from marketplace-build**

```bash
git show marketplace-build:supabase/migrations/20260225000000_qa_payment_flow_v2.sql > supabase/migrations/20260225000000_qa_payment_flow_v2.sql
git show marketplace-build:supabase/migrations/20260226000000_qa_threaded_conversations.sql > supabase/migrations/20260226000000_qa_threaded_conversations.sql
git show marketplace-build:supabase/migrations/20260226200000_qa_progressive_tiers.sql > supabase/migrations/20260226200000_qa_progressive_tiers.sql
git show marketplace-build:supabase/migrations/20260226300000_qa_expert_bidding.sql > supabase/migrations/20260226300000_qa_expert_bidding.sql
git show marketplace-build:supabase/migrations/20260226400000_qa_project_graduation.sql > supabase/migrations/20260226400000_qa_project_graduation.sql
git show marketplace-build:supabase/migrations/20260226500000_qa_reputation_engine.sql > supabase/migrations/20260226500000_qa_reputation_engine.sql
git show marketplace-build:supabase/migrations/20260226600000_qa_protection_sustainability.sql > supabase/migrations/20260226600000_qa_protection_sustainability.sql
git show marketplace-build:supabase/migrations/20260308100000_strengthen_rls_policies.sql > supabase/migrations/20260308100000_strengthen_rls_policies.sql
git show marketplace-build:supabase/migrations/20260309000000_beta_feedback.sql > supabase/migrations/20260309000000_beta_feedback.sql
```

- [ ] **Step 2: Verify idempotent patterns are present**

Spot-check that files use `IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column`, etc.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/202602*.sql supabase/migrations/20260308*.sql supabase/migrations/20260309*.sql
git commit -m "fix: make existing marketplace migrations idempotent"
```

---

### Task 12: Create FileUpload Design System Component

**Files:**
- Create: `components/ui/FileUpload.tsx`
- Modify: `components/ui/index.ts` — Add export

- [ ] **Step 1: Create the FileUpload component**

Create `components/ui/FileUpload.tsx`:

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import IconButton from './IconButton';
import Alert from './Alert';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  error?: string;
}

export default function FileUpload({
  files,
  onChange,
  maxFiles = 3,
  maxSizeMB = 5,
  accept = 'image/*',
  label,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const previewUrls = useRef<Map<File, string>>(new Map());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const getPreviewUrl = (file: File) => {
    if (!previewUrls.current.has(file)) {
      previewUrls.current.set(file, URL.createObjectURL(file));
    }
    return previewUrls.current.get(file)!;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setValidationError(null);
      const incoming = Array.from(newFiles);

      // Validate size
      const oversized = incoming.filter((f) => f.size > maxSizeMB * 1024 * 1024);
      if (oversized.length) {
        setValidationError(`${oversized.map((f) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} ${maxSizeMB}MB limit`);
        return;
      }

      // Validate count
      const total = files.length + incoming.length;
      if (total > maxFiles) {
        setValidationError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      onChange([...files, ...incoming]);
    },
    [files, onChange, maxFiles, maxSizeMB]
  );

  const removeFile = useCallback(
    (index: number) => {
      const file = files[index];
      const url = previewUrls.current.get(file);
      if (url) {
        URL.revokeObjectURL(url);
        previewUrls.current.delete(file);
      }
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const atLimit = files.length >= maxFiles;
  const displayError = error || validationError;

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-foreground mb-2">
          {label}{' '}
          <span className="font-normal text-earth-brown-light">
            (optional, max {maxFiles})
          </span>
        </label>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !atLimit && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !atLimit) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-terracotta bg-terracotta/5' : 'border-earth-sand bg-white'}
          ${atLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-terracotta/50'}
        `}
      >
        <Camera className="w-7 h-7 text-earth-brown-light mx-auto mb-1" />
        <p className="text-sm font-medium text-foreground">
          {atLimit ? `${maxFiles} files uploaded` : 'Click to upload or drag photos here'}
        </p>
        <p className="text-xs text-earth-brown-light mt-1">
          JPG, PNG up to {maxSizeMB}MB each
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative w-20 h-20 rounded-lg border border-earth-sand overflow-hidden"
            >
              <img
                src={getPreviewUrl(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0.5 right-0.5">
                <IconButton
                  icon={X}
                  iconSize={14}
                  label={`Remove ${file.name}`}
                  variant="danger"
                  onClick={() => removeFile(i)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {displayError && (
        <div className="mt-2">
          <Alert variant="error">{displayError}</Alert>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add export to index.ts**

In `components/ui/index.ts`, add after the existing Textarea export (line 20):

```typescript
export { default as FileUpload } from './FileUpload';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep FileUpload`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/ui/FileUpload.tsx components/ui/index.ts
git commit -m "feat: add FileUpload design system component with drop zone and thumbnails"
```

---

### Task 13: Build Landing Page — LandingHero, LandingQuickChat, LandingExpertForm

**Files:**
- Create: `components/LandingHero.tsx`
- Create: `components/LandingQuickChat.tsx`
- Create: `components/LandingExpertForm.tsx`
- Modify: `app/page.tsx:120-140`

- [ ] **Step 1: Create LandingHero component**

Create `components/LandingHero.tsx`. This is the tabbed container. Use `marketplace-build:components/LandingHero.tsx` as functional reference but rebuild with design system:

```typescript
'use client';

import { useState } from 'react';
import { Zap, ClipboardList, HardHat } from 'lucide-react';
import Button from '@/components/ui/Button';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';
import GuidedBot from '@/components/guided-bot/GuidedBot';

type TabId = 'quick' | 'plan' | 'expert';

const tabs: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: 'quick', label: 'Quick Answer', icon: Zap },
  { id: 'plan', label: 'Plan a Project', icon: ClipboardList },
  { id: 'expert', label: 'Ask an Expert', icon: HardHat },
];

export default function LandingHero() {
  const [activeTab, setActiveTab] = useState<TabId>('quick');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b-2 border-earth-sand mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={tab.icon}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? '' : 'text-earth-brown hover:text-foreground'}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'quick' && <LandingQuickChat />}
      {activeTab === 'plan' && <GuidedBot />}
      {activeTab === 'expert' && <LandingExpertForm />}
    </div>
  );
}
```

- [ ] **Step 2: Create LandingQuickChat component**

Create `components/LandingQuickChat.tsx`. Port the streaming chat logic from `marketplace-build:components/LandingQuickChat.tsx` but rebuild UI with design system. Key elements:
- Popular question chips as `Button` variant `ghost` size `xs`
- Message rendering matching `ChatMessages.tsx` patterns (terracotta user, surface assistant)
- "Continue in full chat" `Button` variant `tertiary`
- `Spinner` for loading state
- Streaming via `/api/chat` with `streaming: true`
- SessionStorage write of `diy-helper-conversation-id` and `diy-helper-chat-messages` on continue

Reference the exact streaming logic from `marketplace-build:components/LandingQuickChat.tsx`.

- [ ] **Step 3: Create LandingExpertForm component**

Create `components/LandingExpertForm.tsx`. Port logic from `marketplace-build:components/LandingExpertForm.tsx` but rebuild with design system:
- `Select` for trade category (12 categories)
- `Textarea` for question (min 20 chars, with character counter)
- `FileUpload` for photos
- On submit: convert files to base64, save to sessionStorage key `diy-expert-question-draft`, redirect to `/marketplace/qa`
- `Button` variant `primary` for submit
- Validation errors via input error props

- [ ] **Step 4: Update app/page.tsx**

In `app/page.tsx`, replace lines 120-140 (the hero section content):

Replace:
```tsx
<GuidedBot />
```
With:
```tsx
<LandingHero />
```

Update imports: add `LandingHero`, remove `GuidedBot` import (it's now imported inside `LandingHero`).

- [ ] **Step 5: Verify the page builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (or `npx tsc --noEmit` if faster iteration is needed)

- [ ] **Step 6: Commit**

```bash
git add components/LandingHero.tsx components/LandingQuickChat.tsx components/LandingExpertForm.tsx app/page.tsx
git commit -m "feat: add three-path tabbed hero with Quick Answer, Plan, and Expert entry"
```

---

### Task 14: Add SessionStorage Consumers

**Files:**
- Modify: `components/ChatInterface.tsx` — Hydrate from sessionStorage on mount
- Modify: `app/marketplace/qa/page.tsx` — Read `diy-expert-question-draft` for prefill

- [ ] **Step 1: Add sessionStorage hydration to ChatInterface.tsx**

In `components/ChatInterface.tsx`, add a `useEffect` that on mount:
1. Checks for `diy-helper-conversation-id` and `diy-helper-chat-messages` in sessionStorage
2. If found, parses and sets as initial state (conversation ID and messages)
3. Clears the sessionStorage keys after reading

Reference the exact keys and data shape from `LandingQuickChat.tsx` (Task 13).

- [ ] **Step 2: Add sessionStorage hydration to QA page**

In `app/marketplace/qa/page.tsx`, port the sessionStorage reading logic from `marketplace-build:app/marketplace/qa/page.tsx`:
1. On mount, check for `diy-expert-question-draft` in sessionStorage
2. If found, parse `{ question, trade, photoUrls }` and pass as initial values to `QASubmitForm`
3. Clear the key after reading

This may require adding `initialQuestion`, `initialTrade`, `initialPhotoUrls` props to `QASubmitForm` if they don't already exist.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(ChatInterface|qa/page)" | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/ChatInterface.tsx app/marketplace/qa/page.tsx
git commit -m "feat: hydrate chat and QA form from sessionStorage after landing page redirect"
```

---

### Task 15: Add "I already knew this" Feedback Button

**Files:**
- Modify: `components/ChatMessages.tsx` — Add feedback button below assistant messages
- Modify: `components/ChatInterface.tsx` — Compute `conversationDomain` prop

- [ ] **Step 1: Add conversationDomain computation to ChatInterface.tsx**

In `components/ChatInterface.tsx`:
1. Import `analyzeTerminology` from `@/lib/intelligence/trade-terminology`
2. Add a `useMemo` that runs `analyzeTerminology()` on the concatenated message content
3. Extract the domain with the highest advanced term count, defaulting to `'general'`
4. Pass `conversationDomain={domain}` to `<ChatMessages>`

- [ ] **Step 2: Add feedback button to ChatMessages.tsx**

In `components/ChatMessages.tsx`:
1. Add `conversationDomain?: string` to the component props
2. Add `user?: { id: string } | null` to props (to gate on auth)
3. Add local state: `const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set())`
4. Below each assistant message's markdown content, add:

```tsx
{user && conversationDomain && (
  <div className="mt-1">
    {acknowledged.has(idx) ? (
      <span className="text-xs text-forest-green flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" /> Got it, noted for next time
      </span>
    ) : (
      <button
        onClick={async () => {
          try {
            await fetch('/api/skill-profile/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: conversationDomain }),
            });
            setAcknowledged((prev) => new Set(prev).add(idx));
          } catch { /* silent */ }
        }}
        className="text-xs text-earth-brown-light hover:text-terracotta transition-colors flex items-center gap-1"
      >
        <CheckCircle className="w-3.5 h-3.5" /> I already knew this
      </button>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(ChatMessages|ChatInterface)" | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/ChatMessages.tsx components/ChatInterface.tsx
git commit -m "feat: add 'I already knew this' feedback button on assistant messages"
```

---

### Task 16: Build Expert Co-Pilot Side Panel

**Files:**
- Create: `components/marketplace/CodeLookup.tsx`
- Create: `components/marketplace/ReferenceSurface.tsx`
- Create: `components/marketplace/ExpertCoPilot.tsx`
- Modify: `components/marketplace/QAAnswerForm.tsx`

- [ ] **Step 1: Create CodeLookup component**

Create `components/marketplace/CodeLookup.tsx`. Port logic from `marketplace-build:components/marketplace/CodeLookup.tsx`, rebuild with design system:
- `TextInput` for topic
- `Select` for state (US states list, 2-char values)
- Optional `TextInput` for city
- `Button` variant `secondary` for search
- Results in `Card` with code text
- `Badge` variant `neutral` for disclaimer
- `Spinner` for loading
- `Alert` variant `error` for errors
- Calls `/api/experts/tools/code-lookup`

- [ ] **Step 2: Create ReferenceSurface component**

Create `components/marketplace/ReferenceSurface.tsx`. Port logic from `marketplace-build:components/marketplace/ReferenceSurface.tsx`, rebuild with design system:
- Auto-fetches on mount with `questionId` prop
- Three states using `Alert`:
  - `success`: "No licensing gaps detected"
  - `warning`: Gap detected with trade details
  - `info`: "No licenses on file"
- `Spinner` while loading
- Calls `/api/experts/tools/references`

- [ ] **Step 3: Create ExpertCoPilot component**

Create `components/marketplace/ExpertCoPilot.tsx`. This is the panel content:

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileSearch, PenTool, Shield } from 'lucide-react';
import { Button, Card, Spinner, SectionHeader } from '@/components/ui';
import CodeLookup from './CodeLookup';
import ReferenceSurface from './ReferenceSurface';

interface ExpertCoPilotProps {
  questionId: string;
  onInsertDraft: (draft: string) => void;
}

export default function ExpertCoPilot({ questionId, onInsertDraft }: ExpertCoPilotProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);

  const toggle = (section: string) =>
    setOpenSection((prev) => (prev === section ? null : section));

  const generateDraft = async () => {
    setDraftLoading(true);
    try {
      const res = await fetch('/api/experts/tools/draft-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const data = await res.json();
      setDraft(data.draft);
    } catch {
      setDraft(null);
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Find Codes */}
      <div>
        <button
          onClick={() => toggle('codes')}
          className="flex items-center gap-2 w-full text-left"
        >
          {openSection === 'codes' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <FileSearch className="w-4 h-4 text-slate-blue" />
          <SectionHeader title="Find Building Codes" size="sm" />
        </button>
        {openSection === 'codes' && (
          <div className="mt-3 pl-6">
            <CodeLookup />
          </div>
        )}
      </div>

      {/* Generate Draft */}
      <div>
        <button
          onClick={() => toggle('draft')}
          className="flex items-center gap-2 w-full text-left"
        >
          {openSection === 'draft' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <PenTool className="w-4 h-4 text-terracotta" />
          <SectionHeader title="Generate Draft Answer" size="sm" />
        </button>
        {openSection === 'draft' && (
          <div className="mt-3 pl-6 space-y-3">
            {!draft && !draftLoading && (
              <Button variant="secondary" onClick={generateDraft}>
                Generate Draft
              </Button>
            )}
            {draftLoading && <Spinner />}
            {draft && (
              <>
                <Card padding="sm">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{draft}</p>
                </Card>
                <Button variant="primary" onClick={() => onInsertDraft(draft)}>
                  Insert into answer
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Licensing & References */}
      <div>
        <button
          onClick={() => toggle('refs')}
          className="flex items-center gap-2 w-full text-left"
        >
          {openSection === 'refs' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Shield className="w-4 h-4 text-forest-green" />
          <SectionHeader title="Licensing & References" size="sm" />
        </button>
        {openSection === 'refs' && (
          <div className="mt-3 pl-6">
            <ReferenceSurface questionId={questionId} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Integrate into QAAnswerForm**

In `components/marketplace/QAAnswerForm.tsx`:
1. Import `Modal` from `@/components/ui` and `ExpertCoPilot` from `./ExpertCoPilot`
2. Import `Wrench` from `lucide-react` and `Button` from `@/components/ui`
3. Add state: `const [isToolsOpen, setIsToolsOpen] = useState(false)`
4. Above the answer textarea, add:

```tsx
<Button
  variant="tertiary"
  leftIcon={Wrench}
  onClick={() => setIsToolsOpen(true)}
>
  Expert Tools
</Button>

<Modal
  isOpen={isToolsOpen}
  onClose={() => setIsToolsOpen(false)}
  title="Expert Tools"
  position="right"
  className="max-w-lg"
>
  <ExpertCoPilot
    questionId={questionId}
    onInsertDraft={(draft) => {
      setAnswer(draft);
      setIsToolsOpen(false);
    }}
  />
</Modal>
```

Ensure `questionId` and `setAnswer` are available in scope (they should be from existing state).

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(ExpertCoPilot|CodeLookup|ReferenceSurface|QAAnswerForm)" | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add components/marketplace/CodeLookup.tsx components/marketplace/ReferenceSurface.tsx components/marketplace/ExpertCoPilot.tsx components/marketplace/QAAnswerForm.tsx
git commit -m "feat: add Expert Co-Pilot side panel with code lookup, draft, and licensing tools"
```

---

### Task 17: Replace Photo URL Textarea with FileUpload in QASubmitForm

**Files:**
- Modify: `components/marketplace/QASubmitForm.tsx`

- [ ] **Step 1: Update QASubmitForm**

In `components/marketplace/QASubmitForm.tsx`:
1. Import `FileUpload` from `@/components/ui`
2. Replace the `photoUrls` string state with `const [photos, setPhotos] = useState<File[]>([])`
3. Replace the photo URL textarea with:

```tsx
<FileUpload
  files={photos}
  onChange={setPhotos}
  maxFiles={3}
  maxSizeMB={5}
  label="Photos"
/>
```

4. Update the form submit handler to upload files to `/api/messages/upload` before submission:

```typescript
// Upload photos and collect URLs
let uploadedUrls: string[] = [];
if (photos.length > 0) {
  const formData = new FormData();
  photos.forEach((file) => formData.append('files', file));
  const uploadRes = await fetch('/api/messages/upload', {
    method: 'POST',
    body: formData,
  });
  if (uploadRes.ok) {
    const uploadData = await uploadRes.json();
    uploadedUrls = uploadData.urls || [];
  }
}
```

5. Pass `uploadedUrls` instead of the old `photoUrls.split('\n')` to the question submission payload.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep QASubmitForm`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/marketplace/QASubmitForm.tsx
git commit -m "feat: replace photo URL textarea with FileUpload component in QASubmitForm"
```

---

### Task 18: Final Verification and Lint

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx jest --no-coverage`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx next lint`
Expected: No errors (or fix any that appear)

- [ ] **Step 4: Run build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds

- [ ] **Step 5: Fix any issues found in steps 1-4**

Address any test failures, type errors, lint issues, or build errors.

- [ ] **Step 6: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from marketplace features integration"
```
