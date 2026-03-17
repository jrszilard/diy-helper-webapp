# Go-Live Checklist

Items to complete before launching to real users. Split into Alpha (share for testing) and Production (real payments, real users).

---

## Phase 1: Alpha Launch (Testing & Feedback)

### Vercel Deployment

- [ ] **Deploy to Vercel** — push `marketplace-build` branch; 32 commits since last deploy (Mar 11)
- [ ] **Set env vars in Vercel** — ensure all of these are set in Vercel project settings:
  - `ANTHROPIC_API_KEY` — Claude API key
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (can use new `sb_publishable_` format)
  - `SUPABASE_SERVICE_ROLE_KEY` — **must be the JWT format key** (starts with `eyJ...`), not the new `ssb_secret_` format; see Settings > API > Project API keys
  - `QA_PAYMENT_TEST_MODE=true` — keep test mode ON for alpha
  - `NEXT_PUBLIC_BETA_MODE=true` — enables beta banner and feedback widget
  - `CRON_SECRET` — any random string for cron endpoint auth
  - `QA_CLAIM_EXPIRY_HOURS=2`
  - `QA_AUTO_ACCEPT_HOURS=24`
  - `BRAVE_SEARCH_API_KEY` — for local store search
- [ ] **Update `NEXT_PUBLIC_APP_URL`** — set to the Vercel deployment URL (e.g., `https://diy-helper-xxx.vercel.app`)

### Database

- [x] **All migrations applied** — 22 migrations pushed to Supabase (confirmed 2026-03-13)
- [x] **RLS recursion fix applied** — `20260313000000_fix_recursive_rls_policy.sql` fixes infinite recursion in `qa_questions` policies
- [x] **All migrations are idempotent** — safe to re-run if needed
- [ ] **Verify Supabase Storage bucket** — ensure `message-attachments` bucket exists and is public (used by Q&A photo uploads and messaging)

### Stripe (Test Mode for Alpha)

- [ ] **Use Stripe test keys** — `sk_test_` and `pk_test_` keys in Vercel env vars
- [ ] **Set `QA_PAYMENT_TEST_MODE=true`** — all payment flows use fake IDs, no real charges
- [ ] **Verify expert onboarding** — test mode auto-completes Stripe Connect onboarding
- [ ] **Test full Q&A payment flow** — submit question → expert claims → answers → DIYer accepts (all with fake payments)

### Features to Test with Alpha Users

- [ ] **Landing page three-path hero** — Quick Answer, Plan a Project, Ask an Expert tabs all work
- [ ] **Quick Answer from landing page** — streaming response appears, "Continue this conversation" navigates to /chat with history preserved
- [ ] **Plan a Project** — GuidedBot → agent planner → report renders correctly
- [ ] **Ask an Expert** — photo upload, question submission, auth redirect preserves question text
- [ ] **Expert registration** — expert can register and complete onboarding (test mode)
- [ ] **Expert Q&A queue** — expert sees questions, can claim, answer with Co-Pilot tools
- [ ] **Expert Co-Pilot** — Code Lookup, Draft Assistant, and Licensing References all render and function
- [ ] **Skill calibration** — "I already knew this" button appears on assistant messages
- [ ] **Intent routing** — quick questions get concise answers, project questions get full workflow
- [ ] **Chat image upload** — images can be attached and AI responds to them
- [ ] **Shopping lists** — materials extraction, store pricing search
- [ ] **Tool inventory** — adding tools, cross-referencing with materials lists
- [ ] **Messaging** — DIYer-expert direct messaging works
- [ ] **Notifications** — bell icon shows new notifications
- [ ] **Beta feedback widget** — feedback form appears (requires `NEXT_PUBLIC_BETA_MODE=true`)

### Known Issues / Limitations for Alpha

- Supabase service role key must use JWT format (`eyJ...`), not new `ssb_secret_` format — `@supabase/supabase-js` v2.95 doesn't support new format for PostgREST queries
- Expert Co-Pilot licensing rules only seeded for 10 states (MI, CA, TX, FL, NY, PA, OH, IL, GA, NC) x 4 trades (electrical, plumbing, HVAC, general)
- Skill calibration starts at "beginner" for all new users — profile builds passively over time
- Social proof stats on landing page expert form are hard-coded (4.9 rating, 127 questions)

---

## Phase 2: Production Launch (Real Payments)

### Stripe Live Mode

- [ ] **Disable test mode** — set `QA_PAYMENT_TEST_MODE=false` in Vercel env vars
- [ ] **Switch to live Stripe keys** — replace `sk_test_`/`pk_test_` with `sk_live_`/`pk_live_` keys
- [ ] **Verify Stripe Connect** — ensure expert onboarding creates live Connect accounts
- [ ] **Configure Stripe webhooks** — set production webhook URL for events: `charge.refunded`, `payment_intent.succeeded`, `transfer.created`
- [ ] **Test a real payment end-to-end** — submit a question, expert claims (charge), answers, DIYer accepts (transfer)
- [ ] **Test refund flow** — let a claim expire, verify auto-refund reaches the DIYer's card

### Vercel Pro

- [ ] **Upgrade to Vercel Pro** — unlocks frequent cron jobs and higher limits
- [ ] **Update cron schedule** — change `vercel.json` from `"0 0 * * *"` (daily) to `"*/5 * * * *"` (every 5 min) for timely expired claim cleanup

### Features to Review

- [ ] **Tune claim expiry window** — currently 2 hours (`QA_CLAIM_EXPIRY_HOURS`), adjust based on expert response patterns
- [ ] **Tune auto-accept window** — currently 24 hours (`QA_AUTO_ACCEPT_HOURS`)
- [ ] **Review Q&A pricing** — verify `calculateQAPrice()` returns appropriate rates; current: $5 general, $8 code-specific
- [ ] **Review "not helpful" credit policy** — currently gives full credit to DIYer + 50% payout to expert; confirm sustainable
- [ ] **First-question-free policy** — verify this is still desired
- [ ] **Dynamic social proof** — replace hard-coded stats with real data from expert/Q&A tables

### Security

- [ ] **Remove test mode banners** — UI shows "Test Mode" when `_test_` IDs detected; should never appear in prod
- [ ] **Audit API routes** — confirm all payment endpoints require auth and rate limiting
- [ ] **PII scrubbing** — verify logger scrubs sensitive data before storage
- [ ] **Upgrade Supabase SDK** — when `@supabase/supabase-js` supports new API key format, switch from legacy JWT keys

### Monitoring

- [ ] **Set up error alerting** — monitor failed charges, failed refunds, cron errors
- [ ] **Track refund rate** — if "not helpful" credits are too frequent, adjust policy
- [ ] **Monitor intent classification** — check logs for classification confidence distribution, tune threshold if needed

### Data Expansion

- [ ] **Expand licensing rules** — add more states and trades to `trade_licensing_rules` based on user traffic
- [ ] **Verify licensing data** — quarterly review cadence for `last_verified` dates
