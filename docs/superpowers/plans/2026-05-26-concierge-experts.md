# Concierge Experts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed four human-operated, "verified" expert personas into the public `/experts` directory so beta DIYers can ask real questions, with one catchall inbox, one shared password, and a gitignored credentials cheat-sheet.

**Architecture:** A small idempotent Node seed script (modeled on `scripts/seed-test-accounts.mjs`) creates Supabase auth users (`+` sub-addressed on one Proton mailbox) and matching `expert_profiles` + `expert_specialties` rows, marked `is_seed_expert=true` / `is_test_account=false` / `verification_level=2`. A migration adds the `is_seed_expert` flag. Pure helpers (roster, email builder, cheat-sheet generator) are unit-tested; the Supabase-touching path follows the existing untested-ops-script convention but ships a `--dry-run` for safe verification.

**Tech Stack:** Node ESM (`.mjs`), `@supabase/supabase-js` (admin API), Supabase Postgres migration, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-26-concierge-experts-revised-design.md`

---

## File Structure

- Create: `supabase/migrations/20260526000000_expert_seed_flag.sql` — adds `is_seed_expert` column + partial index.
- Create: `scripts/seed-concierge-experts.mjs` — roster, pure helpers (`emailFor`, `buildCheatSheet`), and idempotent seed `main()` (guarded so the module is importable for tests).
- Create: `lib/__tests__/seed-concierge.test.ts` — unit tests for the pure helpers.
- Modify: `.gitignore` — ignore `seed-accounts.local.md`.
- Modify: `.env.example` — document `SEED_EXPERT_PASSWORD`.
- Runtime output (gitignored, never committed): `seed-accounts.local.md`.

No app/API/type changes: the `/experts` list and `/experts/[id]` routes already filter on `is_test_account = false`, so concierge experts (which set it `false`) appear automatically; the expert-003 credentials block (already shipped) renders the "Verified by Fixerator" badge from `verification_level=2`.

---

## Task 1: Migration — add `is_seed_expert` flag

**Files:**
- Create: `supabase/migrations/20260526000000_expert_seed_flag.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Concierge / seed expert flag
--
-- Concierge experts (revised design 2026-05-26) are real, human-operated expert
-- accounts that must be PUBLIC-VISIBLE (is_test_account = false) yet
-- DISTINGUISHABLE from real beta sign-ups. This flag enables badging, excluding
-- them from real-signup metrics, and clean retirement after beta.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS is_seed_expert boolean NOT NULL DEFAULT false;

-- Seeds are a tiny set; a partial index makes "find/clean up the seeds" cheap.
CREATE INDEX IF NOT EXISTS idx_expert_profiles_is_seed_expert
  ON expert_profiles (is_seed_expert)
  WHERE is_seed_expert = true;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260526000000_expert_seed_flag.sql
git commit -m "feat: add expert_profiles.is_seed_expert migration"
```

> Applying this migration to the database is a rollout step (Task 6), not part of writing the file. Local typecheck/build do not exercise SQL.

---

## Task 2: Gitignore + env documentation

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`

- [ ] **Step 1: Verify `seed-accounts.local.md` is ignored, add if not**

Run: `git check-ignore seed-accounts.local.md && echo IGNORED || echo NOT`
If `NOT`, append to `.gitignore`:

```gitignore
# Concierge seed-account credentials cheat-sheet (generated, never commit)
seed-accounts.local.md
```

- [ ] **Step 2: Document `SEED_EXPERT_PASSWORD` in `.env.example`**

Add under the existing test-account/credentials area (near `TEST_ACCOUNT_PASSWORD` if present, otherwise in the Beta Mode block):

```bash
# Shared login password for the seeded concierge expert accounts
# (scripts/seed-concierge-experts.mjs). Use a strong random value.
# SEED_EXPERT_PASSWORD=generate-a-strong-password
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: gitignore seed cheat-sheet + document SEED_EXPERT_PASSWORD"
```

---

## Task 3: Pure helpers (roster, email builder, cheat-sheet) — TDD

**Files:**
- Create: `lib/__tests__/seed-concierge.test.ts`
- Create: `scripts/seed-concierge-experts.mjs` (helpers + guarded entry only in this task)

- [ ] **Step 1: Write the failing test**

`lib/__tests__/seed-concierge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCheatSheet, emailFor, ROSTER } from '../../scripts/seed-concierge-experts.mjs';

describe('concierge seed helpers', () => {
  it('builds + sub-addressed emails on the catchall mailbox', () => {
    expect(emailFor({ key: 'electrician' })).toBe(
      'fixeratortestaccounts+electrician@madebylakeshore.com'
    );
  });

  it('has 4 roster entries, each with the required fields', () => {
    expect(ROSTER).toHaveLength(4);
    for (const e of ROSTER) {
      expect(e.key).toBeTruthy();
      expect(e.displayName).toBeTruthy();
      expect(e.specialty).toBeTruthy();
      expect(e.bio).toBeTruthy();
      expect(e.licenseType).toBeTruthy();
      expect(['insured', 'bonded_insured']).toContain(e.insuranceStatus);
    }
  });

  it('cheat-sheet includes the password, sign-in URL, and every account email', () => {
    const md = buildCheatSheet(ROSTER, { password: 'pw-123', signinUrl: 'https://x/?signIn=true' });
    expect(md).toContain('pw-123');
    expect(md).toContain('https://x/?signIn=true');
    for (const e of ROSTER) expect(md).toContain(emailFor(e));
    expect(md).toMatch(/gitignored/i);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:run 2>&1 | grep -i seed-concierge`
Expected: FAIL — `Cannot find package '../../scripts/seed-concierge-experts.mjs'` (module missing).

- [ ] **Step 3: Create the script with helpers + a guarded entry point**

`scripts/seed-concierge-experts.mjs`:

```js
#!/usr/bin/env node
/**
 * Seed concierge experts — revised design 2026-05-26.
 * Idempotent. Run: node scripts/seed-concierge-experts.mjs [--dry-run]
 *
 * --dry-run writes the cheat-sheet and prints the plan WITHOUT touching Supabase.
 * The real run requires the is_seed_expert migration to be applied first.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ENV_PATH = '.env.local';
const CHEAT_SHEET_PATH = 'seed-accounts.local.md';
const SIGNIN_URL = 'https://www.fixerator.com/?signIn=true';
const EMAIL_BASE = 'fixeratortestaccounts';
const EMAIL_DOMAIN = 'madebylakeshore.com';

export const ROSTER = [
  {
    key: 'electrician', displayName: 'Marcus Reyes', specialty: 'electrical', secondary: null,
    city: 'Denver', state: 'CO',
    bio: 'Master electrician with 15 years wiring Denver-area homes — panel upgrades, EV chargers, and code-compliant remodels.',
    licenseType: 'Master Electrician', licenseState: 'CO', licenseNumber: 'CO-ME-104882',
    insuranceStatus: 'bonded_insured',
  },
  {
    key: 'plumber', displayName: 'Danielle Kowalski', specialty: 'plumbing', secondary: null,
    city: 'Chicago', state: 'IL',
    bio: 'Licensed Chicago plumber specializing in repipes, water heaters, and old-house fixes across the metro.',
    licenseType: 'Licensed Plumber', licenseState: 'IL', licenseNumber: 'IL-PL-058-219114',
    insuranceStatus: 'bonded_insured',
  },
  {
    key: 'hvac', displayName: 'Victor Nguyen', specialty: 'hvac', secondary: null,
    city: 'Phoenix', state: 'AZ',
    bio: 'Phoenix HVAC tech (EPA 608) keeping desert homes comfortable — installs, tune-ups, and troubleshooting.',
    licenseType: 'HVAC / EPA 608', licenseState: 'AZ', licenseNumber: 'AZ-HVAC-2207-K',
    insuranceStatus: 'insured',
  },
  {
    key: 'carpenter', displayName: 'Grace Bellamy', specialty: 'carpentry', secondary: 'general',
    city: 'Raleigh', state: 'NC',
    bio: 'Raleigh general contractor and finish carpenter — decks, trim, and whole-room remodels done right.',
    licenseType: 'General Contractor', licenseState: 'NC', licenseNumber: 'NC-GC-86134',
    insuranceStatus: 'bonded_insured',
  },
];

export function emailFor(entry) {
  return `${EMAIL_BASE}+${entry.key}@${EMAIL_DOMAIN}`;
}

export function buildCheatSheet(roster, { password, signinUrl }) {
  const rows = roster
    .map((e) => `| ${e.displayName} | ${e.specialty} | ${emailFor(e)} |`)
    .join('\n');
  return `# Concierge Expert Accounts (LOCAL — gitignored, DO NOT COMMIT)

_Generated by scripts/seed-concierge-experts.mjs. Human-operated seed accounts;
payments are bypassed beta-wide. All + sub-addresses deliver to ${EMAIL_BASE}@${EMAIL_DOMAIN}._

- **Sign in:** ${signinUrl}
- **Shared password:** ${password}

| Persona | Trade | Login email |
|---|---|---|
${rows}
`;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main();
```

(Note: `main` is defined in Task 4. This step intentionally leaves `if (isMain) main()` referencing a not-yet-defined `main`; that's fine because importing the module under test never sets `isMain` true, so `main` is never called. Task 4 adds `main` before any real run.)

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:run 2>&1 | grep -iE "seed-concierge|Test Files"`
Expected: `lib/__tests__/seed-concierge.test.ts (3 tests)` PASS, suite green.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-concierge-experts.mjs lib/__tests__/seed-concierge.test.ts
git commit -m "feat: concierge seed roster + cheat-sheet helpers (TDD)"
```

---

## Task 4: Seed logic — accounts, profiles, specialties, dry-run

**Files:**
- Modify: `scripts/seed-concierge-experts.mjs`

- [ ] **Step 1: Add env loader, Supabase helpers, and `main()` above the `isMain` guard**

Insert this block immediately AFTER the `buildCheatSheet` function and BEFORE the `const isMain = …` line:

```js
function loadEnv() {
  const env = {};
  const content = readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function ensureUser(supabase, email, password) {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existing = users.find((u) => u.email === email);
  if (existing) {
    console.log(`  ⟳ ${email} exists (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) {
    console.error(`  ✗ createUser ${email}: ${error.message}`);
    return null;
  }
  console.log(`  ✓ created ${email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(supabase, userId, e) {
  const { data: existing } = await supabase
    .from('expert_profiles').select('id').eq('user_id', userId).maybeSingle();
  if (existing) {
    console.log(`  ⟳ profile exists for ${e.displayName}`);
    return existing.id;
  }
  const { data: profile, error } = await supabase.from('expert_profiles').insert({
    user_id: userId,
    display_name: e.displayName,
    bio: e.bio,
    city: e.city,
    state: e.state,
    service_radius_miles: 25,
    hourly_rate_cents: 7500,
    qa_rate_cents: 1500,
    is_active: true,
    is_available: true,
    is_test_account: false,
    is_seed_expert: true,
    verification_level: 2,
    verification_status: 'verified',
    license_number: e.licenseNumber,
    license_type: e.licenseType,
    license_state: e.licenseState,
    insurance_status: e.insuranceStatus,
  }).select('id').single();
  if (error) {
    console.error(`  ✗ profile ${e.displayName}: ${error.message}`);
    return null;
  }
  const specialties = [
    { expert_id: profile.id, specialty: e.specialty, years_experience: 15, is_primary: true },
  ];
  if (e.secondary) {
    specialties.push({ expert_id: profile.id, specialty: e.secondary, years_experience: 15, is_primary: false });
  }
  const { error: specErr } = await supabase.from('expert_specialties').insert(specialties);
  if (specErr) console.error(`  ✗ specialties ${e.displayName}: ${specErr.message}`);
  console.log(`  ✓ profile created for ${e.displayName} (${e.specialty})`);
  return profile.id;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = loadEnv();
  const password = env.SEED_EXPERT_PASSWORD;
  if (!password) {
    console.error('Missing SEED_EXPERT_PASSWORD in .env.local');
    process.exit(1);
  }

  // Always (re)write the local cheat-sheet — safe offline, no Supabase needed.
  writeFileSync(CHEAT_SHEET_PATH, buildCheatSheet(ROSTER, { password, signinUrl: SIGNIN_URL }));
  console.log(`✓ wrote ${CHEAT_SHEET_PATH}`);

  if (dryRun) {
    console.log('\n[dry-run] Would seed:');
    for (const e of ROSTER) {
      console.log(`  - ${e.displayName} <${emailFor(e)}> (${e.specialty}${e.secondary ? ' + ' + e.secondary : ''})`);
    }
    return;
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const e of ROSTER) {
    console.log(`\n${e.displayName}:`);
    const userId = await ensureUser(supabase, emailFor(e), password);
    if (userId) await ensureProfile(supabase, userId, e);
  }
  console.log('\nDone. Public /experts directory repopulated.');
}
```

- [ ] **Step 2: Re-run the helper tests, verify still green**

Run: `npm run test:run 2>&1 | grep -iE "seed-concierge|Test Files"`
Expected: still PASS (importing the module must NOT run `main()` — the `isMain` guard prevents it).

- [ ] **Step 3: Dry-run to verify the script wiring + cheat-sheet (no Supabase)**

First ensure `.env.local` has `SEED_EXPERT_PASSWORD` set (any value for the dry-run), then:

Run: `node scripts/seed-concierge-experts.mjs --dry-run`
Expected output: `✓ wrote seed-accounts.local.md`, then a `[dry-run] Would seed:` list of the 4 personas with their `+alias` emails.
Then: `git check-ignore seed-accounts.local.md` → prints the path (confirms it will NOT be committed).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-concierge-experts.mjs
git commit -m "feat: concierge seed script — accounts, profiles, specialties, --dry-run"
```

---

## Task 5: Verify, open PR

- [ ] **Step 1: Full verification**

Run: `npm run test:run 2>&1 | grep -iE "Test Files|Tests "` → all pass (includes the 3 new tests).
Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → 0 errors.

(No `npm run build` impact expected — the script is not imported by app code — but run it if in doubt.)

- [ ] **Step 2: Confirm no secrets / cheat-sheet staged**

Run: `git status --porcelain` → must NOT list `seed-accounts.local.md` or `.env.local`.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin HEAD
gh pr create --base main \
  --title "feat: seed concierge experts (migration + script)" \
  --body "Implements docs/superpowers/specs/2026-05-26-concierge-experts-revised-design.md. Adds is_seed_expert migration + idempotent seed script (+ sub-addressed catchall, shared password from .env.local, gitignored cheat-sheet, --dry-run). Rollout (apply migration + run seed against prod) is a gated post-merge step."
```

---

## Task 6: Rollout (POST-MERGE, prod, USER-GATED — do NOT run automatically)

These steps mutate the production database and create publicly-visible accounts. Run only with the user's explicit go-ahead, with prod `.env.local` in place.

- [ ] **Step 1: Set the shared password locally**

Add a strong value to the local `.env.local` (the one pointing at prod Supabase):
`SEED_EXPERT_PASSWORD=<strong random value>`

- [ ] **Step 2: Apply the migration to prod**

Apply `supabase/migrations/20260526000000_expert_seed_flag.sql` via the Supabase MCP `apply_migration` tool (name: `expert_seed_flag`, query: the file's SQL). Verify: `is_seed_expert` exists on `expert_profiles`.

- [ ] **Step 3: Dry-run once more against the prod-pointed env**

Run: `node scripts/seed-concierge-experts.mjs --dry-run` → confirm the 4 personas + emails, and that `seed-accounts.local.md` is written.

- [ ] **Step 4: Seed prod**

Run: `node scripts/seed-concierge-experts.mjs` → expect 4 `✓ created` + `✓ profile created` lines (or `⟳ exists` on re-run; idempotent).

- [ ] **Step 5: Verify in the live app**

- `https://www.fixerator.com/experts` lists the 4 concierge experts.
- Open one profile → renders the "Verified by Fixerator" badge + license/insurance (expert-003 block).
- Confirm `seed-accounts.local.md` holds the 4 `+alias` logins + shared password for the team.
- Log into one account; confirm the in-app NotificationBell is reachable for hand-answering.
