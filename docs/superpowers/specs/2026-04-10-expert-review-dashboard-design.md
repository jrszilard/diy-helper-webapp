# Expert Review Dashboard — Design Spec

**Date:** 2026-04-10
**Branch:** `claude-advisor-strategy-feature`
**Status:** Approved design, pending implementation

## Purpose

Close the human feedback loop in the advisor review system. Experts review borderline AI responses in their specialty and submit corrections. An admin reviews and edits corrections before promoting them into rubric examples that improve future AI reviews.

## Users & Access

- **Experts** — registered experts on the platform, filtered to their specialties
- **Admin** — identified by `ADMIN_USER_IDS` env var (comma-separated Supabase auth UIDs)

## Data Model

### Existing tables (minor change to one)

- `advisor_review_log` — audit trail of all advisor verdicts (APPROVE/REVISE), confidence, issues, rubric version. **Needs a `category text` column added** — currently missing, required so experts can be filtered to their specialty. Populated at write time from the intent classification context.
- `advisor_correction_queue` — pending corrections from user flags (`source: 'user_flag'`), expert Q&A corrections (`source: 'expert_correction'`), and expert review corrections (`source: 'expert_review'`)
- `advisor_rubric_examples` — promoted rubric examples used by the custom review loop
- `expert_specialties` — join table mapping expert profile IDs to specialty strings

### New table

```sql
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
```

Purpose: tracks which review log items an expert has already seen, preventing duplicates in their queue.

## API Routes

### Expert routes

**`GET /api/experts/dashboard/reviews`**

Auth: requires authenticated user with an `expert_profiles` row.

Query:
1. Get expert's specialties from `expert_specialties`
2. Query `advisor_review_log` where:
   - `verdict = 'APPROVE'` AND `jsonb_array_length(issues) > 0` with any issue having `severity = 'warning'` (borderline approvals)
   - OR `verdict = 'REVISE'` AND `jsonb_array_length(issues) = 1` (single-item failures, mild)
   - `category` IN expert's specialties (or expert has `general_contractor` specialty → sees all categories)
   - `id` NOT IN `advisor_expert_reviews` for this expert
3. Order by `created_at DESC`, cursor pagination via `?cursor=<id>&limit=20`

Response shape:
```json
{
  "items": [
    {
      "id": "uuid",
      "category": "electrical",
      "userQuestion": "Is my panel safe for a hot tub?",
      "draftResponse": "The AI's original response...",
      "verdict": "APPROVE",
      "confidence": 0.72,
      "issues": [{ "item": 3, "severity": "warning", "detail": "..." }],
      "safetyKeywords": ["electrical panel"],
      "createdAt": "2026-04-10T..."
    }
  ],
  "nextCursor": "uuid-or-null"
}
```

**`POST /api/experts/dashboard/reviews/[id]/correction`**

Auth: requires authenticated expert. Verifies the review log item matches their specialties.

Request body:
```json
{
  "correctionText": "The response should also mention...",
  "sectionType": "safety_warnings"
}
```

Actions:
1. Insert into `advisor_correction_queue` with `source: 'expert_review'`, `reporter_role: 'expert'`, `reporter_id: auth.userId`, `expert_specialties` from join table, `category` from the review log item
2. Insert into `advisor_expert_reviews` to mark as reviewed

Response: `201 { ok: true }`

**`POST /api/experts/dashboard/reviews/[id]/dismiss`**

Auth: requires authenticated expert.

Actions:
1. Insert into `advisor_expert_reviews` to mark as reviewed (no correction)

Response: `200 { ok: true }`

### Admin routes

**`GET /api/admin/reviews`**

Auth: requires `auth.userId` in `ADMIN_USER_IDS` env var.

Query: `advisor_correction_queue` where `status = 'pending'`.
Optional filters: `?source=user_flag|expert_correction|expert_review`, `?category=electrical`.
Order: `created_at DESC`.
Joins reporter info: if `reporter_role = 'expert'`, fetch `expert_profiles.display_name` and `expert_specialties.specialty`.

Response shape:
```json
{
  "items": [
    {
      "id": "uuid",
      "source": "expert_review",
      "category": "electrical",
      "userQuestion": "...",
      "aiResponse": "...",
      "correctionText": "...",
      "flagType": null,
      "severity": "warning",
      "reporter": {
        "role": "expert",
        "name": "Mike Chen",
        "specialties": ["electrical", "general"]
      },
      "createdAt": "2026-04-10T..."
    }
  ],
  "counts": { "total": 12, "userFlags": 4, "expertCorrections": 5, "expertReviews": 3 }
}
```

**`POST /api/admin/reviews/[id]/approve`**

Auth: admin only.

Request body:
```json
{
  "editedCorrection": "Optional edited version of the correction text",
  "severity": "critical",
  "rubricItemsFailed": [1, 4]
}
```

Actions:
1. If `editedCorrection` provided, use it; otherwise use original `correction_text`
2. Call `structureCorrection()` from `advisor-promotion.ts` to build the rubric example row
3. Insert into `advisor_rubric_examples` with `source: 'community_verified'` (all admin-approved corrections use this source), `weight: 0.9` (admin-verified is high confidence)
4. Update `advisor_correction_queue` row: `status = 'promoted'`, `promoted_at = now()`, `promoted_to = <new rubric example id>`

Response: `200 { ok: true, rubricExampleId: "uuid" }`

If `severity` or `rubricItemsFailed` are not provided in the request, the admin UI should require them — these are needed to structure the rubric example properly.

**`POST /api/admin/reviews/[id]/reject`**

Auth: admin only.

Request body:
```json
{
  "reason": "Optional reason for rejection"
}
```

Actions:
1. Update `advisor_correction_queue` row: `status = 'rejected'`

Response: `200 { ok: true }`

## Frontend Pages

### Expert page: `/experts/dashboard/reviews`

**Components:**

- **`ReviewQueuePage`** — Page shell. Fetches queue, handles pagination, shows empty state ("No responses need review in your specialties right now").

- **`ReviewCard`** — Card per borderline verdict:
  - Category badge (color-coded per design system)
  - User question (full text)
  - AI response (collapsible `<details>`, first ~3 lines visible)
  - Rubric issues: severity pills + short detail text
  - Safety keywords as small tags if present
  - Actions: "Submit Correction" button, "Looks Good" button

- **`CorrectionInlineForm`** — Expands below ReviewCard on "Submit Correction" click:
  - Section type dropdown (Safety Warnings, Building Codes, Materials, Technique, Tools, Permits)
  - Correction textarea (min 10 chars, max 1000)
  - Submit / Cancel buttons

### Admin page: `/admin/reviews`

**Components:**

- **`AdminReviewPage`** — Page shell. Filter bar (source dropdown, category dropdown). Pending count badge. Fetches queue.

- **`AdminCorrectionCard`** — Card per pending correction:
  - Source badge (User Flag / Expert Correction / Expert Review)
  - Reporter info (expert name + specialties, or "DIY User")
  - Side-by-side layout: original AI response (left) and correction text (right)
  - User's original question above both
  - Actions: "Approve", "Edit & Approve", "Reject"

- **`EditApproveModal`** — Opens on "Edit & Approve":
  - Editable textarea pre-filled with correction text
  - Severity selector (critical / warning)
  - Rubric items failed checkboxes (the 6 rubric items)
  - Preview of what the rubric example will look like
  - Confirm / Cancel

- **`RubricPreview`** — Inline preview showing the structured rubric example: category, severity, rubric items, good/bad response pair. Read-only.

## Auth Pattern

```typescript
// lib/admin-auth.ts
import { envList } from '@/lib/config';

const ADMIN_USER_IDS = envList('ADMIN_USER_IDS', []);

export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}
```

Used in admin route handlers:
```typescript
const auth = await getAuthFromRequest(req);
if (!auth.userId || !isAdmin(auth.userId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Design System

Both pages use the existing earth-tone palette and Tailwind classes from `DESIGN-SYSTEM.md`. Key tokens:
- Category badges: `bg-terracotta` for safety, `bg-slate-blue` for codes, `bg-forest-green` for materials
- Severity: `bg-rust text-white` for critical, `bg-earth-sand text-earth-brown` for warning
- Cards: `bg-surface border border-earth-sand rounded-lg`
- Buttons follow existing patterns from `ChatMessageFeedback` and `CorrectionForm`

## Navigation

- Expert dashboard sidebar: add "Reviews" link below existing "Q&A" link at `/experts/dashboard/reviews`
- Admin page: no nav integration for V1 — accessed directly via URL `/admin/reviews`

## Deferred (not in V1)

- Email/push notifications when new items appear in expert queue
- Batch approve/reject in admin view
- Analytics (correction approval rate, expert contribution leaderboard)
- Admin navigation/layout (single page for now)
