# Expert New-Question Email Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email an expert when a DIYer submits a question to/matching them, gated by a per-expert preference (default on), while the in-app bell notification keeps firing unconditionally.

**Architecture:** Add an `email_on_new_question` boolean to `expert_profiles`. Wire `qa_question_posted` + `qa_bidding_open` into the email switch in `sendEmailNotification`, where a single preference check covers all three trigger call-sites. Surface a toggle on the expert profile page via the existing profile `PUT`.

**Tech Stack:** Next.js 16 / React 19, Supabase (Postgres), Resend (REST), Vitest, Zod.

**Spec:** `docs/superpowers/specs/2026-06-01-expert-new-question-email-notifications-design.md`

---

### Task 1: Migration + type definitions

Adds the DB column and its TypeScript representations (row type, domain type, mapper) so the rest of the code type-checks.

**Files:**
- Create: `supabase/migrations/20260601000000_expert_email_on_new_question.sql`
- Modify: `lib/marketplace/types.ts:67` (ExpertProfile), `:445` (ExpertProfileRow), `:485` (toExpertProfile)

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260601000000_expert_email_on_new_question.sql`:

```sql
-- Per-expert preference: email me when a new question matches/targets me.
--
-- Experts already receive an in-app bell notification on new questions
-- (type qa_question_posted / qa_bidding_open). This flag additionally gates the
-- EMAIL for those notifications. Default true so existing experts — including the
-- concierge seed accounts — get emails immediately, with no opt-in step.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS email_on_new_question boolean NOT NULL DEFAULT true;
```

- [ ] **Step 2: Add the field to `ExpertProfile` (camelCase domain type)**

In `lib/marketplace/types.ts`, immediately after the `isAvailable: boolean;` line (~67):

```ts
  isAvailable: boolean;
  emailOnNewQuestion: boolean;
```

- [ ] **Step 3: Add the field to `ExpertProfileRow` (snake_case DB row type)**

In `lib/marketplace/types.ts`, immediately after the `is_available: boolean;` line (~445):

```ts
  is_available: boolean;
  email_on_new_question: boolean;
```

- [ ] **Step 4: Map it in `toExpertProfile`**

In `lib/marketplace/types.ts`, immediately after the `isAvailable: row.is_available,` line (~485):

```ts
    isAvailable: row.is_available,
    emailOnNewQuestion: row.email_on_new_question,
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors related to `emailOnNewQuestion` / `email_on_new_question`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260601000000_expert_email_on_new_question.sql lib/marketplace/types.ts
git commit -m "feat(experts): add email_on_new_question column + types"
```

---

### Task 2: Email template `qaNewQuestion`

A shared template for all three new-question variants. Unlike the other templates it renders `params.body` (the question-text snippet), because the notification `title` is only a label.

**Files:**
- Modify: `lib/email-templates.ts` (add export after the existing `qa*` templates)

- [ ] **Step 1: Add the template**

In `lib/email-templates.ts`, add after the `qaAnswerAccepted` function (mirror the existing `wrapInLayout` / `actionButton` / `escapeHtml` style):

```ts
export function qaNewQuestion(params: { title: string; body?: string; link?: string }): EmailContent {
  return {
    subject: 'New question waiting for you',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">${escapeHtml(params.title)}</h2>
      ${params.body ? `<p style="color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(params.body)}</p>` : ''}
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        Claim it from your Q&amp;A queue to start answering.
      </p>
      ${params.link ? actionButton('View Q&A Queue', params.link) : ''}
    `),
  };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email-templates.ts
git commit -m "feat(notifications): add qaNewQuestion email template"
```

---

### Task 3: Preference-gated email send (TDD — the core)

Export `sendEmailNotification`, add the two new types to the switch, and gate their email on the recipient's `email_on_new_question`. The in-app insert in `createNotification` is untouched.

**Files:**
- Create: `lib/__tests__/notifications.test.ts`
- Modify: `lib/notifications.ts:41` (export + new switch cases)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/notifications.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable per-test preference value read by the mocked admin client.
let mockPref: boolean = true;

vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { email: 'expert@example.com' } },
          error: null,
        }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { email_on_new_question: mockPref }, error: null }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('sendEmailNotification — new-question preference gate', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_DOMAIN = 'fixerator.com';
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => '' })) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the new-question email when the expert has it enabled', async () => {
    mockPref = true;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_question_posted',
      title: 'New question in your specialty',
      body: 'How do I install a faucet?',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(init.body)).toContain('New question waiting for you'); // qaNewQuestion subject
  });

  it('does NOT send the email when the expert has it disabled', async () => {
    mockPref = false;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_question_posted',
      title: 'New question in your specialty',
      body: 'How do I install a faucet?',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('also gates qa_bidding_open on the preference', async () => {
    mockPref = false;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_bidding_open',
      title: 'New specialist question — submit your proposal',
      body: 'Need a load calc',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/notifications.test.ts`
Expected: FAIL — `sendEmailNotification` is not exported (import is `undefined`), or the new types hit `default: return` so no fetch occurs even when enabled (test 1 fails).

- [ ] **Step 3: Export the function and add the gated cases**

In `lib/notifications.ts`, change the function signature (~line 41) from:

```ts
async function sendEmailNotification(params: {
```

to:

```ts
export async function sendEmailNotification(params: {
```

Then, in the `switch (params.type)` block, add these cases immediately before `default: return;`:

```ts
    case 'qa_question_posted':
    case 'qa_bidding_open': {
      const { data: pref } = await adminClient
        .from('expert_profiles')
        .select('email_on_new_question')
        .eq('user_id', params.userId)
        .single();
      if (pref?.email_on_new_question === false) return; // expert opted out — skip email
      content = emailTemplates.qaNewQuestion(templateParams);
      break;
    }
```

(`adminClient` and `templateParams` are already declared earlier in the function. No change to `createNotification` is needed — it already calls `sendEmailNotification` whenever `RESEND_API_KEY` is set, and the in-app insert happens before that call.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/notifications.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/notifications.ts lib/__tests__/notifications.test.ts
git commit -m "feat(notifications): email experts on new questions, gated by preference"
```

---

### Task 4: Profile API — accept the preference

**Files:**
- Modify: `lib/marketplace/validation.ts:31` (schema), `app/api/experts/profile/route.ts:97` (mapping)

- [ ] **Step 1: Add the field to the zod schema**

In `lib/marketplace/validation.ts`, immediately after the `isAvailable: z.boolean().optional(),` line (~31):

```ts
  isAvailable: z.boolean().optional(),
  emailOnNewQuestion: z.boolean().optional(),
```

- [ ] **Step 2: Map it in the PUT handler**

In `app/api/experts/profile/route.ts`, immediately after the `isAvailable` mapping line (~97):

```ts
    if (updateFields.isAvailable !== undefined) updateData.is_available = updateFields.isAvailable;
    if (updateFields.emailOnNewQuestion !== undefined) updateData.email_on_new_question = updateFields.emailOnNewQuestion;
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/marketplace/validation.ts app/api/experts/profile/route.ts
git commit -m "feat(experts): accept emailOnNewQuestion in profile update"
```

---

### Task 5: Profile page — the toggle

Adds state, hydrates it on load, includes it in the save payload, and renders a toggle beside Availability.

**Files:**
- Modify: `app/experts/dashboard/profile/page.tsx` (state ~42, load ~73, save body ~133, markup ~438)

- [ ] **Step 1: Add state**

In `app/experts/dashboard/profile/page.tsx`, immediately after the `const [isAvailable, setIsAvailable] = useState(true);` line (~42):

```ts
  const [isAvailable, setIsAvailable] = useState(true);
  const [emailOnNewQuestion, setEmailOnNewQuestion] = useState(true);
```

- [ ] **Step 2: Hydrate it on load**

In the same file, immediately after the `setIsAvailable(p.isAvailable);` line (~73):

```ts
        setIsAvailable(p.isAvailable);
        setEmailOnNewQuestion(p.emailOnNewQuestion);
```

- [ ] **Step 3: Include it in the save payload**

In the `handleSave` body object, immediately after the `isAvailable,` line (~133):

```ts
        isAvailable,
        emailOnNewQuestion,
```

- [ ] **Step 4: Render the toggle**

In the same file, immediately after the closing `/>` of the Availability `<Toggle>` (~438), add:

```tsx
        {/* New-question email preference */}
        <Toggle
          id="profile-email-new-question"
          label="Email me about new questions"
          description="Get an email when a new question matches your specialty"
          checked={emailOnNewQuestion}
          onChange={setEmailOnNewQuestion}
        />
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/experts/dashboard/profile/page.tsx
git commit -m "feat(experts): add new-question email toggle to profile page"
```

---

### Task 6: Full verification

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test:run`
Expected: all tests pass, including the new `notifications.test.ts`.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Commit any fixups** (only if needed)

```bash
git add -A
git commit -m "fix: address build/test feedback for new-question emails"
```

---

### Task 7: Rollout (HUMAN-GATED — outward-facing)

These steps touch production and MUST be run with explicit user authorization, following the project's migration-before-code-deploy pattern. Do not perform autonomously.

- [ ] **Step 1: Apply the migration to prod FIRST** (before deploying code, since the new `select('email_on_new_question')` references the column). Apply `20260601000000_expert_email_on_new_question.sql` via the team's Supabase migration path. Default `true` makes this harmless to the currently-running build (nothing reads the column yet).
- [ ] **Step 2: Open a PR** from `feat/expert-new-question-emails` and merge once CI is green (branch protection requires PR + green CI).
- [ ] **Step 3: Deploy** the merged `main` to production.
- [ ] **Step 4: End-to-end verify** — re-run the concierge flow (DIYer submits a plumbing question) and confirm the matching concierge expert's `+alias` now receives a **"New question waiting for you"** email in the catchall, in addition to the in-app bell. Confirm toggling the preference off suppresses the email while the bell still fires.

---

## Self-Review

- **Spec coverage:** migration (T1), template (T2), notifications gate + in-app-unconditional (T3), API (T4), UI toggle (T5), testing (T3), rollout/migration-first (T7) — all spec sections map to a task. ✅
- **Type consistency:** `emailOnNewQuestion` (camel) used in ExpertProfile/zod/PUT-field/page-state/save-body; `email_on_new_question` (snake) used in migration/ExpertProfileRow/mapper/updateData/select — each in its correct layer. ✅
- **Placeholders:** none — every code step shows complete content. ✅
```
