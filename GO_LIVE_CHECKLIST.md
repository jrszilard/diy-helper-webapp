# Go-Live Checklist

Items to complete before launching to real users.

## Vercel / Infrastructure

- [ ] **Upgrade to Vercel Pro** — unlocks frequent cron jobs and higher deployment limits
- [ ] **Update cron schedule** — change `vercel.json` from `"0 0 * * *"` (daily) to `"*/5 * * * *"` (every 5 min) for timely expired claim cleanup and refunds
- [ ] **Set `CRON_SECRET`** — generate a strong random secret for the cron endpoint (replace `dev-cron-secret-change-in-prod`)
- [ ] **Verify all env vars in Vercel** — ensure `QA_CLAIM_EXPIRY_HOURS`, `QA_AUTO_ACCEPT_HOURS`, `CRON_SECRET` are set in production environment

## Payments / Stripe

- [ ] **Disable test mode** — set `QA_PAYMENT_TEST_MODE=false` (or remove it) in Vercel production env vars so real Stripe calls are made
- [ ] **Verify Stripe keys** — ensure `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` point to live-mode keys (not `sk_test_` / `pk_test_`)
- [ ] **Verify Stripe Connect** — ensure expert onboarding creates live Connect accounts, not test ones
- [ ] **Stripe webhook** — configure the production Stripe webhook endpoint for `charge.refunded` and `payment_intent.succeeded` events
- [ ] **Test a real payment end-to-end** — submit a question, have an expert claim (triggers charge), answer, and accept (triggers transfer)
- [ ] **Test refund flow** — let a claim expire and verify the auto-refund reaches the DIYer's card

## Database

- [ ] **Run production migration** — execute `supabase/migrations/20260225000000_qa_payment_flow_v2.sql` on the production Supabase instance
- [ ] **Verify RLS policies** — confirm `user_credits` and `credit_transactions` RLS policies are active in production

## Features to Review

- [ ] **Tune claim expiry window** — currently 2 hours (`QA_CLAIM_EXPIRY_HOURS=2`), adjust based on expert response patterns
- [ ] **Tune auto-accept window** — currently 24 hours (`QA_AUTO_ACCEPT_HOURS=24`)
- [ ] **Review Q&A pricing** — verify `calculateQAPrice()` returns appropriate rates for each category
- [ ] **Review "not helpful" credit policy** — currently gives full credit to DIYer + 50% payout to expert; confirm this is sustainable
- [ ] **First-question-free policy** — verify this is still desired for launch

## Security

- [ ] **Remove test mode banners** — the UI shows "Test Mode" banners when `_test_` IDs are detected; these should never appear in prod but verify
- [ ] **Audit API routes** — confirm all payment-related endpoints require proper auth and rate limiting
- [ ] **PII scrubbing** — verify message content is scrubbed before storage

## Monitoring

- [ ] **Set up error alerting** — monitor for failed charges, failed refunds, and cron errors
- [ ] **Track refund rate** — if "not helpful" credits are too frequent, may need to adjust policy
