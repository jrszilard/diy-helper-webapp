# Beta Go-Live — Outstanding Work

_Snapshot after the 2026-05-25 pre-beta review + 2026-05-26 fix pass. Pick up here._

## ✅ Done & merged
- **#47** project selection opens on homepage · **#48** beta_feedback survey saves
- **#49** B1 dead signup CTA · B3 error boundaries (`app/error.tsx` + `global-error.tsx`) · B5 failing test
- **#50** B4 expert-queue test-question filter (column + backfill + insert trigger, applied to prod)
- **B4-data** — 3 junk experts (Slizzy Industry / Willy's Welding / Mike Thompson) flagged `is_test_account=true` on prod → public `/experts` directory is now **empty** until concierge experts are seeded.

---

## 🚧 Remaining beta BLOCKER

### B2 — Error monitoring (needs your account)
Without it you're blind to beta breakage (the exact failure mode that hid the feedback 500 for weeks).
1. Create a **Sentry** (or similar) account → add the **DSN** to Vercel env.
2. Add `@sentry/nextjs` (wizard generates `sentry.{client,server,edge}.config.ts` + `instrumentation.ts`).
3. Replace the `TODO(B2)` `console.error` calls in `app/error.tsx` and `app/global-error.tsx` with Sentry capture; route `lib/logger.ts` `error` through the sink.
4. Add a `/api/health` route + one error-rate alert (Slack/email).

_I can wire steps 2–4 once you provide the DSN._

---

## 🔎 Verify before inviting users (quick)
- Confirm **`QA_PAYMENT_TEST_MODE`** (beta payment-bypass) is set in **prod/Vercel** env — we only confirmed it in `.env.local`.
- Load one **real (non-test)** expert profile at `/experts/<id>` to confirm it resolves. (The sweep's "404" was just the test-account filter at `app/api/experts/[id]/route.ts:34`, not a real bug.)

---

## ⚠️ Strong fast-follows (from the 2026-05-25 review)
- **expert-002** — Settings says tiers "coming soon" while `/experts/dashboard/subscription` sells $29/$79 live. Pick one source of truth.
- **expert-003** — Render license/insurance on the public profile. **API already returns these fields** (`app/api/experts/[id]/route.ts:68-71`) — front-end only. Pairs naturally with seeding concierge experts.
- **diyer-02** — Stale "Welcome back, [name]" banner persists after logout (briefly shows a prior user). Tear down auth UI state on logout.
- **diyer-04** — De-dup shopping-list items (multiple chat extractions append duplicates, inflating count/cost).
- **diyer-03** — "Ask a Question" deep-link lands on the AI-chat tab instead of the expert composer (`/?tab=expert` renders "Ask Anything").
- **Security M1** — SSRF hardening on the chat `web_fetch` tool: `redirect: 'manual'` + re-check, DNS-resolve check, IPv6 ranges (`lib/security.ts`, `lib/search.ts`).
- **Security M2** — Drop `userId` from the public expert profile payload (`app/api/experts/[id]/route.ts:52`).
- **H2** — Rotate `CRON_SECRET` (still the dev default); confirm payment scope.

---

## 🌱 Seed-data: concierge experts (deferred — design locked)
Full design: `docs/superpowers/specs/2026-05-25-beta-concierge-experts-design.md`

- **4 concierge experts**: Electrical, Plumbing, HVAC, Carpentry/General (realistic identities TBD).
- **Operating model**: team answers as the persona by hand; **payments bypassed** (no real money).
- **Data marking**: new column `expert_profiles.is_seed_expert` (default false) — keeps them visible (`is_test_account=false`) but distinguishable from real sign-ups.
- **Accounts**: seed script modeled on `scripts/seed-test-accounts.mjs` (`auth.admin.createUser` → `expert_profiles` `is_seed_expert=true` → `expert_specialties`).
- **Emails**: `+aliases` on a **@madebylakeshore.com** mailbox (exact local-part TBD). Credentials → password manager, not committed.
- **Monitoring**: "plus-inbox now, Resend later" — interim in-app NotificationBell; once `RESEND_API_KEY` + verified domain are set in prod, `lib/notifications.ts` auto-emails on every new question/message (no code change).
- Seeding **repopulates the now-empty public directory**. Pair with **expert-003** so their license/insurance display.
