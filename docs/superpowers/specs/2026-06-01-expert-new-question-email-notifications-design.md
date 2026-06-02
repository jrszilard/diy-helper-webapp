# Expert New-Question Email Notifications — Design

_Date: 2026-06-01_

## Problem

When a DIYer submits a question, the matching/targeted expert receives **only an
in-app bell notification — no email**. For the human-operated concierge experts
(the "Verified by Fixerator" seed accounts), this is a blocker: the team is not
logged in watching the bell, so they have no signal to log in and answer. They
need an **email** to know a question is waiting.

### Root cause

The notification fires with type `qa_question_posted` (direct + pool) or
`qa_bidding_open` (bidding mode):

- `app/api/qa/route.ts:177` — direct mode → target expert
- `app/api/qa/route.ts:198` — pool/bidding mode → each matching expert
- `lib/marketplace/qa-helpers.ts:130` — re-notify matching experts when a claim
  expires and the question reopens

But `sendEmailNotification` (`lib/notifications.ts:58-72`) only emails five types:
`qa_question_claimed`, `qa_answer_received`, `qa_answer_accepted`,
`message_received`, `payment_received`. Neither `qa_question_posted` nor
`qa_bidding_open` is in the switch, so they hit `default: return` and **no email
is sent.** The email infrastructure itself works (verified end-to-end via Resend
on 2026-06-01); this notification type was simply never wired to it.

## Goal

Email an expert when a new question is posted to / matches them, **gated by a
per-expert preference** (default on) so real experts can opt out as the beta
scales, while the in-app bell notification continues to fire unconditionally.

## Decision: check the preference in the email layer

The notification fans out from three call sites. Rather than touch all three,
add the new types to the switch in `sendEmailNotification` and check the
recipient's preference **there** — one place, covers every path (direct, pool,
bidding, and the expiry re-notify), call sites unchanged. The alternative
(pre-filtering at each call site by adding the column to the existing expert
fan-out query) is marginally more query-efficient but scatters the logic across
three files; not worth it on a non-blocking, fire-and-forget email path.

## The four pieces

### 1. Migration

`supabase/migrations/20260601000000_expert_email_on_new_question.sql`, mirroring
the `20260526000000_expert_seed_flag.sql` pattern:

```sql
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS email_on_new_question boolean NOT NULL DEFAULT true;
```

- **Default `true`** → the 4 concierge experts (and every existing expert) get
  emails immediately, with no opt-in step.
- **No index** — the column is only ever read per-recipient by `user_id` (already
  the lookup key), never filtered on.

### 2. Email template

Add `qaNewQuestion` to `lib/email-templates.ts`, following the existing
`wrapInLayout` + `actionButton` + `escapeHtml` pattern. Unlike the other
templates, it renders **`params.body`** (the question-text snippet) as the
preview, since the notification's `title` is only a label
("New question in your specialty" / "You have a direct question" /
"New specialist question — submit your proposal"):

```ts
export function qaNewQuestion(
  params: { title: string; body?: string; link?: string }
): EmailContent {
  return {
    subject: 'New question waiting for you',
    html: wrapInLayout(`
      <h2 ...>${escapeHtml(params.title)}</h2>
      ${params.body ? `<p ...>${escapeHtml(params.body)}</p>` : ''}
      <p ...>Claim it from your Q&A queue to start answering.</p>
      ${params.link ? actionButton('View Q&A Queue', params.link) : ''}
    `),
  };
}
```

One shared template covers all three trigger variants; the differing
title/body are already set at the call sites and passed through.

### 3. `lib/notifications.ts`

`sendEmailNotification` already builds
`templateParams = { title, body, link }` (line 54) — `body` is available. Handle
the two new types with a preference gate before sending:

```ts
if (params.type === 'qa_question_posted' || params.type === 'qa_bidding_open') {
  const { data: pref } = await adminClient
    .from('expert_profiles')
    .select('email_on_new_question')
    .eq('user_id', params.userId)
    .single();
  if (pref?.email_on_new_question === false) return;   // opted out → skip email
  content = emailTemplates.qaNewQuestion(templateParams);
}
```

- Missing row or `true` → send (consistent with the default-on column).
- Explicit `false` → return before the Resend call.
- **The in-app insert in `createNotification` is untouched** — the bell always
  fires; this gate only suppresses the email.

### 4. Toggle UI + API

- **API** (`app/api/experts/profile/route.ts`): add `emailOnNewQuestion` to the
  `PUT` zod schema and the field mapping, mirroring `isAvailable` (line 97):
  `if (updateFields.emailOnNewQuestion !== undefined) updateData.email_on_new_question = updateFields.emailOnNewQuestion;`
- **UI** (`app/experts/dashboard/profile/page.tsx`): an
  "Email me when a new question matches my specialty" toggle beside the existing
  Availability toggle, loading from and saving to the same profile endpoint.

## Testing (TDD)

Unit-test the gating logic in `lib/notifications.ts` (vitest), mocking the
Supabase admin client (to return the preference) and global `fetch` (to assert
whether Resend is called):

1. `qa_question_posted` + pref `true` → Resend `fetch` **is** called with the
   `qaNewQuestion` content.
2. `qa_question_posted` + pref `false` → Resend `fetch` is **not** called.
3. `qa_bidding_open` + pref `false` → Resend `fetch` is **not** called.
4. The in-app notification row is inserted in **all** cases (email pref never
   blocks the bell).

`sendEmailNotification` is currently private; expose it (or a thin seam) for the
unit test, or drive the assertions through `createNotification`.

## Rollout

Migration-before-code (the project's standard pattern): apply
`20260601000000_…` to prod **first** (the new code's `select` references the
column), then deploy. Default-on means concierge experts start receiving
new-question emails the moment the code is live — no per-account action. The
toggle is a control, not a prerequisite.

## Out of scope (YAGNI)

Digest/batching, per-specialty granularity, quiet hours, SMS. Not needed for the
concierge model; revisit only if real-expert volume makes per-question emails
noisy despite the toggle.
