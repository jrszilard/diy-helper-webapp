# Beta Go-Live — Shipped

_Pre-beta review 2026-05-25 → fully cleared 2026-05-26. Everything below shipped to `main`
and (where applicable) is live in prod. Only M2 was consciously deferred._

## ✅ Shipped & merged

**Earlier fixes**
- **#47** project selection opens on homepage · **#48** beta_feedback survey saves
- **#49** B1 dead signup CTA · B3 error boundaries (`app/error.tsx` + `global-error.tsx`) · B5 failing test
- **#50** B4 expert-queue test-question filter (column + backfill + insert trigger, applied to prod)
- **B4-data** — 3 junk experts flagged `is_test_account=true` (directory emptied until concierge seed)

**Beta blocker**
- **B2 — error monitoring** · **#52**, live in prod. `@sentry/nextjs` wired (`instrumentation.ts`,
  `instrumentation-client.ts`, `sentry.{server,edge}.config.ts`), `withSentryConfig` with
  `tunnelRoute:"/monitoring"` (required by the strict CSP), `Sentry.captureException` in both error
  boundaries, `logger.error` → Sentry, `/api/health` liveness probe. DSN set in Vercel prod; verified
  the ingest host is inlined in the prod bundle.

**Security fast-follows · #53**
- **M1 — SSRF hardening** on the chat `web_fetch` tool: `redirect:'manual'` + per-hop re-validation +
  redirect cap, DNS-resolution check (defeats DNS rebinding), expanded IPv6 coverage
  (`isBlockedIp` / `isUrlSafe` in `lib/security.ts`, `webFetch` in `lib/search.ts`). 25 tests.
- **H2 — CRON_SECRET** guard (`lib/cron-auth.ts` `verifyCronAuth` rejects missing/placeholder/short
  secrets, logs misconfig → Sentry). **Rotated in prod** (fresh 64-char value) + redeployed.

**Expert UX**
- **expert-002** · **#54** — Settings "coming soon" card → link to the live subscription page.
- **expert-003** — already shipped in #30 (`ExpertProfileView` credentials block). The 2026-05-25 sweep
  saw it empty only because test experts had no license data; it renders once experts have credentials.

**DIYer UX · #55**
- **diyer-02** — clear the `expert-status` sessionStorage cache on logout (no more stale "Welcome back").
- **diyer-03** — homepage reads `?tab=expert` → `LandingHero` opens the expert composer.
- **diyer-04** — `dedupeNewListItems` in `reports/[id]/apply` stops shopping-list duplicate inflation (TDD).

**Verify-before-invite**
- `QA_PAYMENT_TEST_MODE=true` confirmed in prod. · Public expert profile resolves (`/api/experts/<id>` → 200).

**Concierge experts · #56 + gated prod rollout (done)**
- Migration `expert_profiles.is_seed_expert` applied to prod; `scripts/seed-concierge-experts.mjs`
  seeded 4 human-operated "Verified by Fixerator" personas (Marcus Reyes/Denver, Danielle
  Kowalski/Chicago, Victor Nguyen/Phoenix, Grace Bellamy/Raleigh) — `is_seed_expert=true`,
  `is_test_account=false`, `verification_level=2`, license + insurance set. Public `/experts`
  repopulated. Revised design: `docs/superpowers/specs/2026-05-26-concierge-experts-revised-design.md`.
- Logins are `+` sub-addresses of one Proton catchall (`fixeratortestaccounts+<trade>@madebylakeshore.com`
  → `fixeratortestaccounts@`); shared password in `.env.local` (`SEED_EXPERT_PASSWORD`); credentials in
  the gitignored `seed-accounts.local.md`.

---

## ⏸️ Deferred (not blocking beta)
- **Security M2** — drop `userId` from the public expert payload. Not a one-line delete: the messaging
  flow keys DMs off `userId` (`ExpertProfileView.tsx`), so it needs a re-route to the expert profile id.
  Rated medium, deferred to a dedicated PR.

## 🔧 Ongoing ops (no code)
- **Concierge monitoring** — team logs into the 4 accounts and answers DIYer questions by hand via the
  in-app NotificationBell. Once `RESEND_API_KEY` + a verified domain are set in prod, `lib/notifications.ts`
  auto-emails the `+` aliases (all → the one catchall inbox) with no code change.
