# Concierge Experts — Revised Design

Status: **Approved** 2026-05-26. Supersedes the deferred draft
`2026-05-25-beta-concierge-experts-design.md`. Changes from the draft: a single
dedicated catchall mailbox via `+` sub-addressing (was vague `+aliases`), a
gitignored credentials cheat-sheet (was "password manager"), reaffirmed
human-operated (no bot), and verification level fixed at 2 ("Verified by
Fixerator").

## Goal

Populate the public `/experts` directory — empty since the junk experts were
hidden (B4-data) — with four credible, human-operated expert personas so beta
DIYers can ask questions and get real answers. Optimized to **narrow failure
points** (no bot, no payments, no new notification code) and to make testing
**easy to manage** (one inbox, one password, one cheat-sheet).

## Operating model

Four real, logged-in expert accounts the team operates **by hand**. They appear
in the public directory as verified tradespeople; the team answers DIYer
questions/messages *as* the persona. Payments are bypassed beta-wide
(`QA_PAYMENT_TEST_MODE` → `isTestMode()`), so no real money moves and no Stripe
onboarding is needed. No bot, no answer-on-behalf automation.

## Roster (4 core trades)

Names chosen to avoid colliding with the 5 existing test personas (Mike the
Carpenter, Sarah the Electrician, Dave the Plumber, Lisa the HVAC Tech, Tony the
General Contractor). License numbers are **plausible-but-fictional** — acceptable
for beta seed accounts the team controls, but noted because they sit behind a
"Verified by Fixerator" badge shown to real DIYers.

| Persona | Trade (specialty) | Metro | License type · state | Insurance |
|---|---|---|---|---|
| Marcus Reyes | electrical | Denver, CO | Master Electrician · CO | bonded_insured |
| Danielle Kowalski | plumbing | Chicago, IL | Licensed Plumber · IL | bonded_insured |
| Victor Nguyen | hvac | Phoenix, AZ | HVAC / EPA 608 · AZ | insured |
| Grace Bellamy | carpentry (primary) + general | Raleigh, NC | General Contractor · NC | bonded_insured |

Bios (concrete, used verbatim by the seed script):
- **Marcus Reyes** — "Master electrician with 15 years wiring Denver-area homes — panel upgrades, EV chargers, and code-compliant remodels."
- **Danielle Kowalski** — "Licensed Chicago plumber specializing in repipes, water heaters, and old-house fixes across the metro."
- **Victor Nguyen** — "Phoenix HVAC tech (EPA 608) keeping desert homes comfortable — installs, tune-ups, and troubleshooting."
- **Grace Bellamy** — "Raleigh general contractor and finish carpenter — decks, trim, and whole-room remodels done right."

Each profile also: `service_radius_miles=25`, `hourly_rate_cents=7500`,
`qa_rate_cents=1500` (rates exist for display only; payments bypassed),
`is_active=true`, `is_available=true`.

## Data model

New migration adds:

```sql
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS is_seed_expert boolean NOT NULL DEFAULT false;
```

Rationale: concierge experts must be **visible** (`is_test_account=false`) yet
**distinguishable** from real beta sign-ups (`is_seed_expert=true`) — enables
badging, excluding from real-signup metrics, and clean retirement after beta.
(Alternative considered: identify by email pattern, no migration — rejected; a
data-layer flag is cleaner.)

Per concierge account, the seed script sets on `expert_profiles`:
- `is_seed_expert = true`
- `is_test_account = false` (public-visible)
- `verification_level = 2`, `verification_status = 'verified'` → renders the
  "Verified by Fixerator" badge (expert-003 credentials block, already shipped)
- `license_number`, `license_type`, `license_state`, `insurance_status` populated
- one `expert_specialties` row (`is_primary=true`, `years_experience=15`);
  Grace also gets a secondary `general` specialty row.

## Email scheme — `+` sub-addressing

Each account's Supabase auth email is a `+` sub-address of one Proton mailbox:

- `fixeratortestaccounts+electrician@madebylakeshore.com`
- `fixeratortestaccounts+plumber@madebylakeshore.com`
- `fixeratortestaccounts+hvac@madebylakeshore.com`
- `fixeratortestaccounts+carpenter@madebylakeshore.com`

Unique Supabase logins; Proton delivers all `+` sub-addresses to the single
`fixeratortestaccounts@madebylakeshore.com` inbox (confirmed: Proton supports `+`
sub-addressing on custom domains). A domain-level catch-all was rejected — it
would vacuum up mistyped mail on the primary `madebylakeshore.com` domain.

Note: the seed script creates accounts with `email_confirm: true` (admin API
skips verification), so email **deliverability is not on the critical path** for
seeding or interim monitoring — it only matters once Resend is enabled later.

## Credentials

- **Shared password** for all four accounts, read by the seed script from
  `SEED_EXPERT_PASSWORD` in `.env.local` (already gitignored, mirrors the
  existing `TEST_ACCOUNT_PASSWORD` pattern). If the var is missing, the script
  exits with a clear error rather than inventing one.
- The script writes a gitignored **`seed-accounts.local.md`** cheat-sheet at repo
  root: a table of persona, trade, `+alias` email, and the shared password, plus
  the sign-in URL — so the team can log in and check quickly.
- `.gitignore` must cover `seed-accounts.local.md` (verify/add). `.env.local` is
  already ignored.

## Seed script — `scripts/seed-concierge-experts.mjs`

Modeled on `scripts/seed-test-accounts.mjs`:

1. Read `.env.local` for `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SEED_EXPERT_PASSWORD`. Exit with a clear message if any are missing.
2. For each roster entry (idempotent — skip if the auth email already exists):
   - `auth.admin.createUser({ email, password, email_confirm: true })`
   - insert `expert_profiles` with the fields above (skip if a profile already
     exists for the user)
   - insert `expert_specialties` row(s)
3. After processing, (re)write `seed-accounts.local.md` from the roster.
4. Log a summary (created / skipped per account).

The script targets whatever Supabase project `.env.local` points at; running it
against **prod** is an explicit, user-gated step (see Execution notes).

## Monitoring

- **Interim (now):** the team logs into each account and watches the in-app
  NotificationBell / inbox to catch and reply to DIYer questions and messages.
  No email dependency.
- **Later (no code change):** once `RESEND_API_KEY` + a verified domain are set
  in prod, `lib/notifications.ts` auto-emails each account's auth email on every
  new question/message; all `+` sub-addresses land in `fixeratortestaccounts@`.

## Execution notes (prod-affecting — user-gated)

- The `is_seed_expert` migration applies to the **prod** database.
- Running the seed script against **prod** creates four real auth users +
  visible expert profiles. Both steps require the user's explicit go-ahead and
  the prod `.env.local` / Supabase access at run time.
- Seeding repopulates the now-empty public `/experts` directory.

## Out of scope (YAGNI)

No answer-on-behalf admin dashboard, no real payments, no analytics, no bot. Just
enough to populate the directory credibly and let the team respond by hand.
