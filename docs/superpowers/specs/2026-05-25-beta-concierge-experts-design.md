# Beta Concierge Experts — Design (DRAFT / DEFERRED)

Status: **Deferred** on 2026-05-25 — design approved-in-principle ("looks good"), but
implementation postponed until the beta launch blockers (B1–B5) are closed. Resume from
this doc.

## Operating model
Four **concierge experts** — real, logged-in expert accounts the team operates by hand.
They appear in the public directory as normal "verified tradespeople"; the team answers
DIYer questions/messages *as* the persona. Payments are bypassed beta-wide
(`QA_PAYMENT_TEST_MODE` → `isTestMode()`), so no real money moves and no Stripe onboarding
is needed.

## Roster (4 — core trades)
Realistic identities in distinct metros, with license/insurance set for credibility.
Names TBD at implementation (avoid colliding with the 5 existing test personas):

| Trade | Location (proposed) | Specialty |
|---|---|---|
| Electrical | Denver, CO | electrical |
| Plumbing | Chicago, IL | plumbing |
| HVAC | Phoenix, AZ | hvac |
| Carpentry/General | Raleigh, NC | carpentry (+ general) |

## Data marking
Concierge experts must be **visible** (`is_test_account = false`) yet **distinguishable**
from real beta sign-ups. Add `expert_profiles.is_seed_expert boolean default false` via a
small migration. Enables badging, excluding from real-signup metrics, and clean retirement
after beta. (Alternative considered: identify by email pattern, no migration — rejected;
a data-layer flag is cleaner.)

## Accounts & email
Seed script modeled on `scripts/seed-test-accounts.mjs`:
`auth.admin.createUser` (email-confirmed) → `expert_profiles` (`is_seed_expert=true`) →
`expert_specialties`. Emails use `+aliases` on one **@madebylakeshore.com** mailbox
(exact local-part TBD, e.g. `experts+fixerator-electrician@madebylakeshore.com`).
Credentials (a strong shared password) live in the team password manager, NOT committed.

## Monitoring — "plus-inbox now, Resend later"
Notification rows are written to the `notifications` table per concierge account from day
one. Interim: team logs into each account and watches the in-app NotificationBell/inbox to
catch and reply to DIYer messages. When Resend is configured in prod (`RESEND_API_KEY` +
verified domain), `lib/notifications.ts` auto-emails `experts+<trade>@…` on every new
question/message — no extra code.

## Related dependency (not in scope here)
**expert-003**: the public profile doesn't render license/insurance (front-end gap; the API
already returns those fields). To make the "licensed & insured" trust signal visible to
beta DIYers, pair this with the expert-003 fix.

## Pre-existing junk experts
The 3 non-test active experts (Mike Thompson, Slizzy Industry, Willy's Welding "Your Mom,
CA") are handled by **B4-data** (flag `is_test_account=true` to hide) independently of this
work. Until concierge experts are seeded, the public directory will be empty.

## Out of scope (YAGNI)
No admin "answer-on-behalf" dashboard, no real payments, no analytics. Just enough to
populate the directory credibly and let the team respond by hand.
