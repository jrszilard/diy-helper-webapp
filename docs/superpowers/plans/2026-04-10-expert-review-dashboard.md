# Expert Review Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-view dashboard where experts review borderline AI responses in their specialty and submit corrections, and an admin approves/edits/rejects corrections to promote them into rubric examples.

**Architecture:** New migration adds `advisor_expert_reviews` table and `category` column to `advisor_review_log`. Admin auth via `ADMIN_USER_IDS` env var. Expert queue filters `advisor_review_log` for borderline verdicts matching expert specialties. Admin queue reads `advisor_correction_queue` with pending status. Promotion reuses existing `structureCorrection()` pipeline.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (admin client for API routes, RLS for client), Tailwind CSS, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-04-10-expert-review-dashboard-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260410100000_review_dashboard.sql` | Migration: `advisor_expert_reviews` table + `category` column on `advisor_review_log` |
| `lib/admin-auth.ts` | `isAdmin(userId)` helper using `ADMIN_USER_IDS` env var |
| `app/api/experts/dashboard/reviews/route.ts` | GET expert review queue (borderline verdicts filtered by specialty) |
| `app/api/experts/dashboard/reviews/[id]/correction/route.ts` | POST expert correction for a review log item |
| `app/api/experts/dashboard/reviews/[id]/dismiss/route.ts` | POST dismiss a review log item (mark as seen) |
| `app/api/admin/reviews/route.ts` | GET admin correction queue (pending corrections) |
| `app/api/admin/reviews/[id]/approve/route.ts` | POST approve (with optional edit) and promote to rubric |
| `app/api/admin/reviews/[id]/reject/route.ts` | POST reject a correction |
| `components/reviews/ReviewCard.tsx` | Card for expert review queue item |
| `components/reviews/CorrectionInlineForm.tsx` | Inline correction form (section type + textarea) |
| `components/reviews/AdminCorrectionCard.tsx` | Card for admin correction queue item |
| `components/reviews/EditApproveModal.tsx` | Modal for editing correction before promoting |
| `components/reviews/RubricPreview.tsx` | Preview of structured rubric example |
| `app/experts/dashboard/reviews/page.tsx` | Expert review queue page |
| `app/admin/reviews/page.tsx` | Admin review queue page |
| `lib/__tests__/admin-auth.test.ts` | Tests for admin auth helper |
| `lib/__tests__/review-queries.test.ts` | Tests for borderline verdict detection logic |

### Modified files

| File | Change |
|------|--------|
| `app/experts/dashboard/layout.tsx` | Add "Reviews" nav link |
| `lib/advisor-audit.ts` | Accept and log `category` field |
| `lib/config.ts` | Add `admin` config block with `userIds` |

---

## Task 1: Migration — `advisor_expert_reviews` table + `category` column

**Files:**
- Create: `supabase/migrations/20260410100000_review_dashboard.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Expert review tracking (prevents showing same item twice)
CREATE TABLE advisor_expert_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  review_log_id   uuid NOT NULL REFERENCES advisor_review_log(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expert_id, review_log_id)
);

CREATE INDEX idx_expert_reviews_expert ON advisor_expert_reviews(expert_id);

ALTER TABLE advisor_expert_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can insert their own reviews"
  ON advisor_expert_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Experts can read their own reviews"
  ON advisor_expert_reviews FOR SELECT
  TO authenticated
  USING (
    expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
  );

-- Add category to review log for specialty-based filtering
ALTER TABLE advisor_review_log ADD COLUMN category text;

-- Service role can read all review data (needed for admin + API routes)
CREATE POLICY "Service role full access to expert reviews"
  ON advisor_expert_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can read review log"
  ON advisor_review_log FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can read correction queue"
  ON advisor_correction_queue FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update correction queue"
  ON advisor_correction_queue FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert rubric examples"
  ON advisor_rubric_examples FOR INSERT
  TO service_role
  WITH CHECK (true);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: Migration applied, no errors.

If using remote Supabase (no local), apply via Supabase dashboard SQL editor instead.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260410100000_review_dashboard.sql
git commit -m "feat: add advisor_expert_reviews table and category column to review log"
```

---

## Task 2: Admin auth helper + config

**Files:**
- Create: `lib/admin-auth.ts`
- Create: `lib/__tests__/admin-auth.test.ts`
- Modify: `lib/config.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/admin-auth.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('isAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true for admin user IDs', async () => {
    process.env.ADMIN_USER_IDS = 'user-aaa,user-bbb';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(true);
    expect(isAdmin('user-bbb')).toBe(true);
  });

  it('returns false for non-admin user IDs', async () => {
    process.env.ADMIN_USER_IDS = 'user-aaa';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-zzz')).toBe(false);
  });

  it('returns false when env var is not set', async () => {
    delete process.env.ADMIN_USER_IDS;
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(false);
  });

  it('trims whitespace in user IDs', async () => {
    process.env.ADMIN_USER_IDS = ' user-aaa , user-bbb ';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(true);
    expect(isAdmin('user-bbb')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/admin-auth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// lib/admin-auth.ts

function getAdminUserIds(): string[] {
  const v = process.env.ADMIN_USER_IDS;
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export function isAdmin(userId: string): boolean {
  return getAdminUserIds().includes(userId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/admin-auth.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Add `ADMIN_USER_IDS` to `.env.local`**

Add to `.env.local` (use your own Supabase auth UID):
```
ADMIN_USER_IDS=<your-supabase-user-id>
```

Find your UID via: `SELECT id FROM auth.users WHERE email = 'your@email.com';` in Supabase SQL editor.

- [ ] **Step 6: Commit**

```bash
git add lib/admin-auth.ts lib/__tests__/admin-auth.test.ts
git commit -m "feat: add isAdmin helper with ADMIN_USER_IDS env var"
```

---

## Task 3: Update advisor audit to log category

**Files:**
- Modify: `lib/advisor-audit.ts`

- [ ] **Step 1: Add `category` to the `ReviewVerdictLog` interface and insert**

In `lib/advisor-audit.ts`, add `category` to the interface and insert statement:

```typescript
// Add to ReviewVerdictLog interface (after safetyKeywords line):
  category: string | null;
```

Add to the insert object (after `safety_keywords` line):
```typescript
        category: params.category,
```

- [ ] **Step 2: Find and update the call site**

Search for where `logReviewVerdict` is called:

Run: `grep -rn "logReviewVerdict" lib/ app/`

Update the call site to pass `category`. The category comes from the intent classification context — if it's available as `intentResult.category` or from the rubric evaluation, pass it. If not available, pass `null`.

Typical call site in `lib/advisor-custom-loop.ts` or `app/api/chat/route.ts`:
```typescript
// Add to the logReviewVerdict call:
category: intentResult?.category ?? null,
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: 221/222 pass (same pre-existing failure)

- [ ] **Step 4: Commit**

```bash
git add lib/advisor-audit.ts lib/advisor-custom-loop.ts
git commit -m "feat: log category in advisor review audit trail"
```

---

## Task 4: Expert review queue API route

**Files:**
- Create: `app/api/experts/dashboard/reviews/route.ts`

- [ ] **Step 1: Write the GET handler**

```typescript
// app/api/experts/dashboard/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Get expert profile
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!expert) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 403 });
  }

  // Get expert specialties
  const { data: specialtyRows } = await supabase
    .from('expert_specialties')
    .select('specialty')
    .eq('expert_id', expert.id);

  const specialties = (specialtyRows || []).map((s: { specialty: string }) => s.specialty);
  const isGC = specialties.includes('general_contractor');

  // Get already-reviewed item IDs for this expert
  const { data: reviewedRows } = await supabase
    .from('advisor_expert_reviews')
    .select('review_log_id')
    .eq('expert_id', expert.id);

  const reviewedIds = (reviewedRows || []).map((r: { review_log_id: string }) => r.review_log_id);

  // Parse cursor pagination
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  // Query borderline verdicts
  // Filter for borderline verdicts in application code since JSONB filtering is complex.
  // Overfetch 200 rows, then filter down to borderline + specialty + not-reviewed.
  let query = supabase
    .from('advisor_review_log')
    .select('id, category, user_question, draft_response, verdict, confidence, issues, safety_keywords, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (cursor) {
    query = query.lt('id', cursor);
  }

  const { data: rows, error } = await query;

  if (error) {
    logger.error('Failed to fetch review queue', { error });
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  // Application-level filtering for borderline + specialty + not-reviewed
  const filtered = (rows || []).filter(row => {
    // Skip already reviewed
    if (reviewedIds.includes(row.id)) return false;

    // Specialty filter
    if (!isGC && row.category && !specialties.includes(row.category)) return false;

    // Borderline detection
    const issues = row.issues as Array<{ item?: number; severity?: string; detail?: string }>;
    if (row.verdict === 'APPROVE') {
      // Approved but has warning-level issues
      return issues.some(i => i.severity === 'warning');
    }
    if (row.verdict === 'REVISE') {
      // Revised but only 1 issue (mild failure)
      return issues.length === 1;
    }
    return false;
  });

  // Paginate
  const page = filtered.slice(0, limit);
  const nextCursor = page.length === limit ? page[page.length - 1].id : null;

  const items = page.map(row => ({
    id: row.id,
    category: row.category,
    userQuestion: row.user_question,
    draftResponse: row.draft_response,
    verdict: row.verdict,
    confidence: row.confidence,
    issues: row.issues,
    safetyKeywords: row.safety_keywords,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items, nextCursor });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/experts/dashboard/reviews/route.ts
git commit -m "feat: add expert review queue API route"
```

---

## Task 5: Expert correction + dismiss API routes

**Files:**
- Create: `app/api/experts/dashboard/reviews/[id]/correction/route.ts`
- Create: `app/api/experts/dashboard/reviews/[id]/dismiss/route.ts`

- [ ] **Step 1: Write the correction route**

```typescript
// app/api/experts/dashboard/reviews/[id]/correction/route.ts
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

  const { id: reviewLogId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const correctionText = body.correctionText as string;
  const sectionType = body.sectionType as string;

  if (!correctionText || correctionText.length < 10) {
    return NextResponse.json({ error: 'Correction must be at least 10 characters' }, { status: 400 });
  }
  if (!sectionType) {
    return NextResponse.json({ error: 'sectionType is required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Get expert profile
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!expert) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 403 });
  }

  // Get the review log item
  const { data: reviewLog } = await supabase
    .from('advisor_review_log')
    .select('user_question, draft_response, category')
    .eq('id', reviewLogId)
    .single();

  if (!reviewLog) {
    return NextResponse.json({ error: 'Review log item not found' }, { status: 404 });
  }

  // Get expert specialties
  const { data: specialtyRows } = await supabase
    .from('expert_specialties')
    .select('specialty')
    .eq('expert_id', expert.id);

  const specialties = (specialtyRows || []).map((s: { specialty: string }) => s.specialty);

  // Insert correction into queue
  const { error: insertError } = await supabase
    .from('advisor_correction_queue')
    .insert({
      source: 'expert_review',
      status: 'pending',
      user_question: reviewLog.user_question,
      ai_response: reviewLog.draft_response,
      correction_text: correctionText.slice(0, 1000),
      category: reviewLog.category,
      reporter_id: auth.userId,
      reporter_role: 'expert',
      expert_specialties: specialties,
    });

  if (insertError) {
    logger.error('Failed to insert expert review correction', { error: insertError });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  // Mark as reviewed
  await supabase
    .from('advisor_expert_reviews')
    .insert({ expert_id: expert.id, review_log_id: reviewLogId });

  logger.info('Expert review correction submitted', { reviewLogId, expertId: auth.userId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 2: Write the dismiss route**

```typescript
// app/api/experts/dashboard/reviews/[id]/dismiss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: reviewLogId } = await params;
  const supabase = getAdminClient();

  // Get expert profile
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!expert) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 403 });
  }

  // Mark as reviewed (no correction)
  const { error } = await supabase
    .from('advisor_expert_reviews')
    .insert({ expert_id: expert.id, review_log_id: reviewLogId });

  if (error) {
    // Unique constraint violation means already reviewed — that's fine
    if (error.code !== '23505') {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/experts/dashboard/reviews/\[id\]/correction/route.ts app/api/experts/dashboard/reviews/\[id\]/dismiss/route.ts
git commit -m "feat: add expert review correction and dismiss API routes"
```

---

## Task 6: Admin review queue API route

**Files:**
- Create: `app/api/admin/reviews/route.ts`

- [ ] **Step 1: Write the GET handler**

```typescript
// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getAdminClient();
  const url = new URL(req.url);
  const sourceFilter = url.searchParams.get('source');
  const categoryFilter = url.searchParams.get('category');

  let query = supabase
    .from('advisor_correction_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (sourceFilter) {
    query = query.eq('source', sourceFilter);
  }
  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data: corrections, error } = await query;

  if (error) {
    logger.error('Failed to fetch admin review queue', { error });
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  // Get counts by source
  const allCorrections = corrections || [];
  const counts = {
    total: allCorrections.length,
    userFlags: allCorrections.filter(c => c.source === 'user_flag').length,
    expertCorrections: allCorrections.filter(c => c.source === 'expert_correction').length,
    expertReviews: allCorrections.filter(c => c.source === 'expert_review').length,
  };

  // Enrich with reporter info for expert corrections
  const expertReporterIds = [...new Set(
    allCorrections
      .filter(c => c.reporter_role === 'expert' && c.reporter_id)
      .map(c => c.reporter_id as string)
  )];

  const expertMap: Record<string, { name: string; specialties: string[] }> = {};

  if (expertReporterIds.length > 0) {
    // expert_specialties.expert_id references expert_profiles.id (not user_id),
    // so we need both id and user_id from the profile lookup
    const { data: profiles } = await supabase
      .from('expert_profiles')
      .select('id, user_id, display_name')
      .in('user_id', expertReporterIds);

    for (const p of profiles || []) {
      const { data: specs } = await supabase
        .from('expert_specialties')
        .select('specialty')
        .eq('expert_id', p.id);

      expertMap[p.user_id] = {
        name: p.display_name || 'Expert',
        specialties: (specs || []).map((s: { specialty: string }) => s.specialty),
      };
    }
  }

  const items = allCorrections.map(c => ({
    id: c.id,
    source: c.source,
    category: c.category,
    userQuestion: c.user_question,
    aiResponse: c.ai_response,
    correctionText: c.correction_text,
    flagType: c.flag_type,
    severity: c.severity,
    rubricItemsFailed: c.rubric_items_failed,
    reporter: c.reporter_role === 'expert' && c.reporter_id
      ? { role: 'expert' as const, ...expertMap[c.reporter_id] }
      : { role: 'diy_user' as const, name: 'DIY User', specialties: [] },
    createdAt: c.created_at,
  }));

  return NextResponse.json({ items, counts });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/reviews/route.ts
git commit -m "feat: add admin review queue API route"
```

---

## Task 7: Admin approve + reject API routes

**Files:**
- Create: `app/api/admin/reviews/[id]/approve/route.ts`
- Create: `app/api/admin/reviews/[id]/reject/route.ts`

- [ ] **Step 1: Write the approve route**

```typescript
// app/api/admin/reviews/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { structureCorrection } from '@/lib/advisor-promotion';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: correctionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const severity = body.severity as 'critical' | 'warning';
  const rubricItemsFailed = body.rubricItemsFailed as number[];

  if (!severity || !['critical', 'warning'].includes(severity)) {
    return NextResponse.json({ error: 'severity is required (critical or warning)' }, { status: 400 });
  }
  if (!rubricItemsFailed || !Array.isArray(rubricItemsFailed) || rubricItemsFailed.length === 0) {
    return NextResponse.json({ error: 'rubricItemsFailed must be a non-empty array' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Fetch the correction
  const { data: correction } = await supabase
    .from('advisor_correction_queue')
    .select('*')
    .eq('id', correctionId)
    .eq('status', 'pending')
    .single();

  if (!correction) {
    return NextResponse.json({ error: 'Correction not found or already processed' }, { status: 404 });
  }

  // Use edited text if provided, otherwise original
  const editedCorrection = body.editedCorrection as string | undefined;
  const finalCorrectionText = editedCorrection?.trim() || correction.correction_text;

  if (!finalCorrectionText || finalCorrectionText.length < 10) {
    return NextResponse.json({ error: 'Correction text must be at least 10 characters' }, { status: 400 });
  }

  // Structure the rubric example
  const rubricRow = structureCorrection({
    userQuestion: correction.user_question,
    aiResponse: correction.ai_response,
    correctionText: finalCorrectionText,
    category: correction.category || 'general',
    severity,
    rubricItemsFailed,
  });

  // Insert rubric example
  const { data: rubricExample, error: insertError } = await supabase
    .from('advisor_rubric_examples')
    .insert({
      ...rubricRow,
      source: 'community_verified',
      weight: 0.9,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !rubricExample) {
    logger.error('Failed to insert rubric example', { error: insertError });
    return NextResponse.json({ error: 'Failed to promote' }, { status: 500 });
  }

  // Update correction status
  const { error: updateError } = await supabase
    .from('advisor_correction_queue')
    .update({
      status: 'promoted',
      promoted_at: new Date().toISOString(),
      promoted_to: rubricExample.id,
      severity,
      rubric_items_failed: rubricItemsFailed,
      corrected_response: finalCorrectionText,
    })
    .eq('id', correctionId);

  if (updateError) {
    logger.error('Failed to update correction status', { error: updateError });
  }

  logger.info('Admin approved correction', { correctionId, rubricExampleId: rubricExample.id });
  return NextResponse.json({ ok: true, rubricExampleId: rubricExample.id });
}
```

- [ ] **Step 2: Write the reject route**

```typescript
// app/api/admin/reviews/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: correctionId } = await params;
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('advisor_correction_queue')
    .update({ status: 'rejected' })
    .eq('id', correctionId)
    .eq('status', 'pending');

  if (error) {
    logger.error('Failed to reject correction', { error });
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }

  logger.info('Admin rejected correction', { correctionId });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/reviews/\[id\]/approve/route.ts app/api/admin/reviews/\[id\]/reject/route.ts
git commit -m "feat: add admin approve and reject API routes with rubric promotion"
```

---

## Task 8: Expert review queue page + ReviewCard component

**Files:**
- Create: `components/reviews/ReviewCard.tsx`
- Create: `components/reviews/CorrectionInlineForm.tsx`
- Create: `app/experts/dashboard/reviews/page.tsx`

- [ ] **Step 1: Write the CorrectionInlineForm component**

```typescript
// components/reviews/CorrectionInlineForm.tsx
'use client';

import { useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';

const SECTION_TYPES = [
  { value: 'safety_warnings', label: 'Safety Warnings' },
  { value: 'building_codes', label: 'Building Codes' },
  { value: 'materials', label: 'Materials List' },
  { value: 'tools', label: 'Tools Needed' },
  { value: 'steps', label: 'Project Steps' },
  { value: 'cost_estimate', label: 'Cost Estimate' },
  { value: 'skill_level', label: 'Skill Level Assessment' },
  { value: 'other', label: 'Other' },
];

interface CorrectionInlineFormProps {
  onSubmit: (sectionType: string, correctionText: string) => Promise<void>;
  onCancel: () => void;
}

export default function CorrectionInlineForm({ onSubmit, onCancel }: CorrectionInlineFormProps) {
  const [sectionType, setSectionType] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sectionType || correctionText.trim().length < 10) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sectionType, correctionText.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-3 border-t border-earth-sand pt-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-earth-brown block mb-1">Section</label>
        <select
          value={sectionType}
          onChange={e => setSectionType(e.target.value)}
          className="w-full text-sm border border-earth-sand rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
        >
          <option value="">Select section...</option>
          {SECTION_TYPES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-earth-brown block mb-1">Correction *</label>
        <textarea
          value={correctionText}
          onChange={e => setCorrectionText(e.target.value)}
          placeholder="What should the AI response have said instead..."
          rows={3}
          maxLength={1000}
          className="w-full text-sm border border-earth-sand rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-terracotta"
        />
        <span className="text-xs text-earth-brown-light">{correctionText.length}/1000</span>
      </div>

      {error && <p className="text-xs text-rust">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !sectionType || correctionText.trim().length < 10}
          className="flex items-center gap-1 px-4 py-2 bg-terracotta text-white text-sm font-semibold rounded-lg hover:bg-terracotta/90 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Correction
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 text-sm text-earth-brown hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the ReviewCard component**

```typescript
// components/reviews/ReviewCard.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import CorrectionInlineForm from './CorrectionInlineForm';

interface ReviewIssue {
  item?: number;
  severity?: string;
  detail?: string;
}

interface ReviewItem {
  id: string;
  category: string | null;
  userQuestion: string;
  draftResponse: string;
  verdict: string;
  confidence: number | null;
  issues: ReviewIssue[];
  safetyKeywords: string[];
  createdAt: string;
}

interface ReviewCardProps {
  item: ReviewItem;
  onCorrection: (id: string, sectionType: string, correctionText: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export default function ReviewCard({ item, onCorrection, onDismiss }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (dismissed || submitted) {
    return (
      <div className="bg-surface border border-earth-sand rounded-lg p-4 text-sm text-forest-green flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        {submitted ? 'Correction submitted — thanks!' : 'Dismissed'}
      </div>
    );
  }

  const handleCorrection = async (sectionType: string, correctionText: string) => {
    await onCorrection(item.id, sectionType, correctionText);
    setSubmitted(true);
  };

  const handleDismiss = async () => {
    await onDismiss(item.id);
    setDismissed(true);
  };

  return (
    <div className="bg-surface border border-earth-sand rounded-lg p-4 space-y-3">
      {/* Header: category + verdict */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white font-medium">
            {item.category}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          item.verdict === 'REVISE' ? 'bg-rust text-white' : 'bg-earth-sand text-earth-brown'
        }`}>
          {item.verdict}
        </span>
        {item.confidence != null && (
          <span className="text-xs text-earth-brown-light">
            confidence: {(item.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* User question */}
      <p className="text-sm font-medium text-foreground">{item.userQuestion}</p>

      {/* AI response (collapsible) */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-blue hover:text-slate-blue-dark flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide' : 'Show'} AI response
        </button>
        {expanded && (
          <div className="mt-2 text-sm text-earth-brown bg-earth-tan/30 rounded-lg p-3 max-h-60 overflow-y-auto whitespace-pre-wrap">
            {item.draftResponse}
          </div>
        )}
      </div>

      {/* Issues */}
      {item.issues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.issues.map((issue, idx) => (
            <span
              key={idx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                issue.severity === 'critical' ? 'bg-rust text-white' : 'bg-earth-sand text-earth-brown'
              }`}
            >
              {issue.detail || `Rubric item ${issue.item}`}
            </span>
          ))}
        </div>
      )}

      {/* Safety keywords */}
      {item.safetyKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.safetyKeywords.map(kw => (
            <span key={kw} className="text-xs px-1.5 py-0.5 rounded bg-rust/10 text-rust">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {!showForm && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-terracotta text-white rounded-lg hover:bg-terracotta/90 transition-colors"
          >
            Submit Correction
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-earth-brown hover:text-foreground border border-earth-sand rounded-lg hover:bg-earth-tan/30 transition-colors"
          >
            Looks Good
          </button>
        </div>
      )}

      {/* Inline correction form */}
      {showForm && (
        <CorrectionInlineForm
          onSubmit={handleCorrection}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the expert review queue page**

```typescript
// app/experts/dashboard/reviews/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ReviewCard from '@/components/reviews/ReviewCard';
import { ClipboardCheck } from 'lucide-react';

interface ReviewIssue {
  item?: number;
  severity?: string;
  detail?: string;
}

interface ReviewItem {
  id: string;
  category: string | null;
  userQuestion: string;
  draftResponse: string;
  verdict: string;
  confidence: number | null;
  issues: ReviewIssue[];
  safetyKeywords: string[];
  createdAt: string;
}

export default function ExpertReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const getToken = async () => {
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchItems = useCallback(async (cursor?: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const url = new URL('/api/experts/dashboard/reviews', window.location.origin);
      url.searchParams.set('limit', '20');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setItems(prev => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCorrection = async (id: string, sectionType: string, correctionText: string) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/experts/dashboard/reviews/${id}/correction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sectionType, correctionText }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to submit');
    }
  };

  const handleDismiss = async (id: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch(`/api/experts/dashboard/reviews/${id}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review AI Responses</h1>
        <p className="text-sm text-earth-brown mt-1">
          Borderline AI responses in your specialty areas. Submit corrections or confirm they look good.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-earth-brown">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-earth-brown-light" />
          <p className="text-lg font-medium">All caught up</p>
          <p className="text-sm text-earth-brown-light mt-1">
            No responses need review in your specialties right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ReviewCard
              key={item.id}
              item={item}
              onCorrection={handleCorrection}
              onDismiss={handleDismiss}
            />
          ))}

          {nextCursor && (
            <button
              onClick={() => fetchItems(nextCursor)}
              className="w-full py-3 text-sm text-slate-blue hover:text-slate-blue-dark border border-earth-sand rounded-lg hover:bg-earth-tan/30 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/reviews/CorrectionInlineForm.tsx components/reviews/ReviewCard.tsx app/experts/dashboard/reviews/page.tsx
git commit -m "feat: add expert review queue page with ReviewCard and CorrectionInlineForm"
```

---

## Task 9: Admin review page + components

**Files:**
- Create: `components/reviews/RubricPreview.tsx`
- Create: `components/reviews/EditApproveModal.tsx`
- Create: `components/reviews/AdminCorrectionCard.tsx`
- Create: `app/admin/reviews/page.tsx`

- [ ] **Step 1: Write the RubricPreview component**

```typescript
// components/reviews/RubricPreview.tsx
'use client';

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

interface RubricPreviewProps {
  category: string;
  severity: 'critical' | 'warning';
  rubricItemsFailed: number[];
  userQuestion: string;
  badResponse: string;
  goodResponse: string;
}

export default function RubricPreview({
  category,
  severity,
  rubricItemsFailed,
  userQuestion,
  badResponse,
  goodResponse,
}: RubricPreviewProps) {
  return (
    <div className="border border-dashed border-earth-sand rounded-lg p-3 bg-earth-tan/10 space-y-2 text-sm">
      <p className="text-xs font-semibold text-earth-brown-light uppercase tracking-wide">Rubric Example Preview</p>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white">{category}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          severity === 'critical' ? 'bg-rust text-white' : 'bg-earth-sand text-earth-brown'
        }`}>{severity}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {rubricItemsFailed.map(id => (
          <span key={id} className="text-xs px-1.5 py-0.5 rounded bg-rust/10 text-rust">
            {RUBRIC_ITEM_NAMES[id] || `Item ${id}`}
          </span>
        ))}
      </div>
      <div className="text-xs text-earth-brown">
        <p className="font-medium">Q: {userQuestion.slice(0, 120)}{userQuestion.length > 120 ? '...' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-rust/5 rounded p-2">
          <p className="font-medium text-rust mb-1">Bad response</p>
          <p className="text-earth-brown line-clamp-3">{badResponse}</p>
        </div>
        <div className="bg-forest-green/5 rounded p-2">
          <p className="font-medium text-forest-green mb-1">Good response</p>
          <p className="text-earth-brown line-clamp-3">{goodResponse}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the EditApproveModal component**

```typescript
// components/reviews/EditApproveModal.tsx
'use client';

import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import RubricPreview from './RubricPreview';

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

interface EditApproveModalProps {
  correctionText: string;
  userQuestion: string;
  aiResponse: string;
  category: string;
  onApprove: (data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function EditApproveModal({
  correctionText,
  userQuestion,
  aiResponse,
  category,
  onApprove,
  onClose,
}: EditApproveModalProps) {
  const [editedText, setEditedText] = useState(correctionText);
  const [severity, setSeverity] = useState<'critical' | 'warning'>('warning');
  const [rubricItems, setRubricItems] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRubricItem = (id: number) => {
    setRubricItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApprove = async () => {
    if (rubricItems.length === 0) {
      setError('Select at least one rubric item');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const edited = editedText.trim() !== correctionText.trim() ? editedText.trim() : undefined;
      await onApprove({ editedCorrection: edited, severity, rubricItemsFailed: rubricItems });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-earth-sand">
          <h2 className="text-lg font-bold text-foreground">Edit & Approve Correction</h2>
          <button onClick={onClose} className="text-earth-brown-light hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Editable correction text */}
          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Correction text</label>
            <textarea
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full text-sm border border-earth-sand rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Severity</label>
            <div className="flex gap-2">
              {(['critical', 'warning'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    severity === s
                      ? s === 'critical' ? 'bg-rust text-white border-rust' : 'bg-earth-sand text-earth-brown border-earth-sand'
                      : 'border-earth-sand text-earth-brown hover:bg-earth-tan/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Rubric items */}
          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Rubric items failed</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RUBRIC_ITEM_NAMES).map(([id, label]) => {
                const numId = parseInt(id, 10);
                const selected = rubricItems.includes(numId);
                return (
                  <button
                    key={id}
                    onClick={() => toggleRubricItem(numId)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selected
                        ? 'bg-rust text-white border-rust'
                        : 'border-earth-sand text-earth-brown hover:border-rust'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {rubricItems.length > 0 && (
            <RubricPreview
              category={category || 'general'}
              severity={severity}
              rubricItemsFailed={rubricItems}
              userQuestion={userQuestion}
              badResponse={aiResponse}
              goodResponse={editedText}
            />
          )}

          {error && <p className="text-sm text-rust">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-earth-sand">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-earth-brown hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting || rubricItems.length === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-forest-green text-white rounded-lg hover:bg-forest-green/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve & Promote
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the AdminCorrectionCard component**

```typescript
// components/reviews/AdminCorrectionCard.tsx
'use client';

import { useState } from 'react';
import { Check, Edit, X, CheckCircle } from 'lucide-react';
import EditApproveModal from './EditApproveModal';

interface Reporter {
  role: 'expert' | 'diy_user';
  name: string;
  specialties: string[];
}

interface CorrectionItem {
  id: string;
  source: string;
  category: string | null;
  userQuestion: string;
  aiResponse: string;
  correctionText: string | null;
  flagType: string | null;
  severity: string | null;
  reporter: Reporter;
  createdAt: string;
}

interface AdminCorrectionCardProps {
  item: CorrectionItem;
  onApprove: (id: string, data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  user_flag: 'User Flag',
  expert_correction: 'Expert Correction',
  expert_review: 'Expert Review',
};

export default function AdminCorrectionCard({ item, onApprove, onReject }: AdminCorrectionCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [processed, setProcessed] = useState<'approved' | 'rejected' | null>(null);

  if (processed) {
    return (
      <div className={`bg-surface border rounded-lg p-4 text-sm flex items-center gap-2 ${
        processed === 'approved' ? 'border-forest-green text-forest-green' : 'border-earth-sand text-earth-brown-light'
      }`}>
        <CheckCircle className="w-4 h-4" />
        {processed === 'approved' ? 'Approved and promoted to rubric' : 'Rejected'}
      </div>
    );
  }

  const handleQuickApprove = () => {
    setShowModal(true);
  };

  const handleApprove = async (data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => {
    await onApprove(item.id, data);
    setShowModal(false);
    setProcessed('approved');
  };

  const handleReject = async () => {
    await onReject(item.id);
    setProcessed('rejected');
  };

  return (
    <>
      <div className="bg-surface border border-earth-sand rounded-lg p-4 space-y-3">
        {/* Header: source + reporter + category */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta/20 text-terracotta font-medium">
            {SOURCE_LABELS[item.source] || item.source}
          </span>
          {item.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white">
              {item.category}
            </span>
          )}
          {item.flagType && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rust/10 text-rust">
              {item.flagType}
            </span>
          )}
          <span className="text-xs text-earth-brown-light ml-auto">
            {item.reporter.role === 'expert'
              ? `${item.reporter.name} (${item.reporter.specialties.join(', ')})`
              : 'DIY User'}
          </span>
        </div>

        {/* User question */}
        <p className="text-sm font-medium text-foreground">{item.userQuestion}</p>

        {/* Side by side: AI response vs correction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-rust/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-rust mb-1">AI Response</p>
            <p className="text-sm text-earth-brown whitespace-pre-wrap line-clamp-6">{item.aiResponse}</p>
          </div>
          <div className="bg-forest-green/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-forest-green mb-1">Correction</p>
            <p className="text-sm text-earth-brown whitespace-pre-wrap line-clamp-6">
              {item.correctionText || '(no correction text provided)'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleQuickApprove}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-forest-green text-white rounded-lg hover:bg-forest-green/90 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit & Approve
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-earth-brown hover:text-rust border border-earth-sand rounded-lg hover:border-rust transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      </div>

      {showModal && (
        <EditApproveModal
          correctionText={item.correctionText || ''}
          userQuestion={item.userQuestion}
          aiResponse={item.aiResponse}
          category={item.category || 'general'}
          onApprove={handleApprove}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Write the admin review queue page**

```typescript
// app/admin/reviews/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminCorrectionCard from '@/components/reviews/AdminCorrectionCard';
import { ShieldCheck } from 'lucide-react';

interface Reporter {
  role: 'expert' | 'diy_user';
  name: string;
  specialties: string[];
}

interface CorrectionItem {
  id: string;
  source: string;
  category: string | null;
  userQuestion: string;
  aiResponse: string;
  correctionText: string | null;
  flagType: string | null;
  severity: string | null;
  reporter: Reporter;
  createdAt: string;
}

interface Counts {
  total: number;
  userFlags: number;
  expertCorrections: number;
  expertReviews: number;
}

export default function AdminReviewPage() {
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, userFlags: 0, expertCorrections: 0, expertReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const url = new URL('/api/admin/reviews', window.location.origin);
      if (sourceFilter) url.searchParams.set('source', sourceFilter);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError('Not authorized — admin access required');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setCounts(data.counts);
      }
    } catch {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [sourceFilter, categoryFilter]);

  const handleApprove = async (id: string, data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/admin/reviews/${id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch(`/api/admin/reviews/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <div className="min-h-screen bg-earth-cream">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-terracotta" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Review Queue</h1>
            <p className="text-sm text-earth-brown">
              {counts.total} pending &middot; {counts.userFlags} flags &middot; {counts.expertCorrections + counts.expertReviews} expert corrections
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-sm border border-earth-sand rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
          >
            <option value="">All sources</option>
            <option value="user_flag">User flags</option>
            <option value="expert_correction">Expert corrections</option>
            <option value="expert_review">Expert reviews</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-sm border border-earth-sand rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
          >
            <option value="">All categories</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="structural">Structural</option>
            <option value="roofing">Roofing</option>
            <option value="gas">Gas</option>
            <option value="hazmat">Hazmat</option>
          </select>
        </div>

        {error && (
          <div className="bg-rust/10 text-rust rounded-lg p-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-earth-brown">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-earth-brown-light" />
            <p className="text-lg font-medium">Queue is clear</p>
            <p className="text-sm text-earth-brown-light mt-1">No pending corrections to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <AdminCorrectionCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add components/reviews/RubricPreview.tsx components/reviews/EditApproveModal.tsx components/reviews/AdminCorrectionCard.tsx app/admin/reviews/page.tsx
git commit -m "feat: add admin review queue page with correction cards, edit modal, rubric preview"
```

---

## Task 10: Add "Reviews" link to expert dashboard nav

**Files:**
- Modify: `app/experts/dashboard/layout.tsx`

- [ ] **Step 1: Add the Reviews nav item**

In `app/experts/dashboard/layout.tsx`, find the `NAV_ITEMS` array and add the Reviews entry. Import the `ClipboardCheck` icon from lucide-react:

Add to imports:
```typescript
import { MessageSquare, Mail, ClipboardCheck, Menu, Home } from 'lucide-react';
```

Update `NAV_ITEMS`:
```typescript
const NAV_ITEMS = [
  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
  { href: '/experts/dashboard/reviews', label: 'Reviews', icon: ClipboardCheck },
  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
];
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev` (if not already running)
Navigate to `http://localhost:3003/experts/dashboard` — verify "Reviews" link appears in nav.

- [ ] **Step 3: Commit**

```bash
git add app/experts/dashboard/layout.tsx
git commit -m "feat: add Reviews link to expert dashboard navigation"
```

---

## Task 11: Smoke test the full flow

- [ ] **Step 1: Verify expert review queue renders**

1. Sign in as a test expert (e.g., `test-expert-carpenter@diyhelper.test` / `TestAgent2026!`)
2. Navigate to `/experts/dashboard/reviews`
3. Expected: empty state "All caught up" (no borderline verdicts exist yet)

- [ ] **Step 2: Generate a borderline verdict for testing**

Send a safety-related chat message with `ADVISOR_MODE=custom` to generate a review log entry. Use a message like "How do I install a new electrical panel?" which should trigger the advisor review loop and log a verdict.

After the chat response, check that a row exists in `advisor_review_log`:
```bash
curl -s "https://kthwqkmscbxpggzyojqq.supabase.co/rest/v1/advisor_review_log?order=created_at.desc&limit=1&select=id,verdict,confidence,issues,category" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" | python3 -m json.tool
```

- [ ] **Step 3: Verify expert review queue shows the item**

Reload `/experts/dashboard/reviews` — the borderline verdict should now appear (if it matches the test expert's specialty and has warning-level issues).

- [ ] **Step 4: Submit a correction from the expert queue**

Click "Submit Correction" on the review card, select a section type, type a correction, submit. Verify "Correction submitted" confirmation.

- [ ] **Step 5: Verify admin review queue shows the correction**

Sign in as admin (your user account configured in `ADMIN_USER_IDS`).
Navigate to `/admin/reviews`. The correction should appear with source "Expert Review".

- [ ] **Step 6: Approve a correction from the admin queue**

Click "Edit & Approve", select severity + rubric items, confirm. Verify it shows "Approved and promoted to rubric".

Check that a row was inserted into `advisor_rubric_examples`:
```bash
curl -s "https://kthwqkmscbxpggzyojqq.supabase.co/rest/v1/advisor_rubric_examples?order=created_at.desc&limit=1&select=id,source,category,severity,weight" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" | python3 -m json.tool
```

Expected: `source: 'community_verified'`, `weight: 0.9`

- [ ] **Step 7: Clean up test data and commit any fixes**

Delete test rows from `advisor_review_log`, `advisor_correction_queue`, `advisor_rubric_examples`, and `advisor_expert_reviews` that were created during testing.

- [ ] **Step 8: Run full test suite**

Run: `npx vitest run`
Expected: 221/222 pass (same pre-existing validation failure)

Run: `npx tsc --noEmit`
Expected: No errors
