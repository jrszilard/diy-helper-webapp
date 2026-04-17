# Expert User Tester Memory

## Test Account Mapping

Credentials are stored in `.env.local` (never commit secrets).

| Persona | Email Env Var | Password Env Var |
|---|---|---|
| Carpenter | `TEST_EXPERT_CARPENTER_EMAIL` | `TEST_EXPERT_CARPENTER_PASSWORD` |
| Electrician | `TEST_EXPERT_ELECTRICIAN_EMAIL` | `TEST_EXPERT_ELECTRICIAN_PASSWORD` |
| Plumber | `TEST_EXPERT_PLUMBER_EMAIL` | `TEST_EXPERT_PLUMBER_PASSWORD` |
| HVAC | `TEST_EXPERT_HVAC_EMAIL` | `TEST_EXPERT_HVAC_PASSWORD` |
| General Contractor | `TEST_EXPERT_GC_EMAIL` | `TEST_EXPERT_GC_PASSWORD` |

To read credentials at runtime: use the Read tool on `.env.local` and extract the relevant values.

## Auth Strategy

All expert personas log in with their trade-specific test account at the start of every test run. Expert features (dashboard, Q&A queue, bidding, messaging) require authentication.

## Cross-Session Tracking

Record findings below after each test run to track patterns over time.

### Test Run Log
- [Carpenter Full Sweep 2026-04-03](carpenter_sweep_2026-04-03.md) — 11 findings, 2 critical (dashboard data mismatch, $0 payout bug), AI scored 9+/10
- [Electrician Code Compliance 2026-04-03](electrician_code_compliance_2026-04-03.md) — 7 findings, 2 critical (same dashboard/payout bugs), AI scored 9.4/10

### Recurring Issues (confirmed by 2+ trades)
- Dashboard "Recent Questions" widget out of sync with Q&A Queue (carpenter + electrician)
- Q&A payout showing $0.00 / "Free question" despite expert having $15 Q&A rate (carpenter + electrician)
- "Free question" and "Pool"/"Paid" tags appear simultaneously on Q&A cards (carpenter + electrician)
- No credential/license fields on expert profile (carpenter + electrician)
- No expert subscription tiers visible (carpenter + electrician)

### Improvements Observed
- AI chat carpentry responses are technically excellent (IRC code refs, safety warnings, pro referrals)
- AI chat electrical NEC code compliance is exceptional (9.4/10 across 5 questions)
- AI correctly identifies lethal risks (service entrance lugs, fire hazards) with prominent warnings
- AI handles nuanced code debates diplomatically (AFCI history timeline, local code variations)
- Expert notification system correctly filters by specialty
- Expert banner on DIYer pages bridges contexts well
- "Save Materials" button auto-detects material mentions in AI responses

### Trade-Specific Friction Patterns
- Carpenter: 2000-char answer limit too short for structural repair answers with code refs and tool lists
- Carpenter: No certification/license fields to display contractor credentials
- Carpenter: No photo attachment for answer diagrams (structural work often needs sketches)
- Electrician: No electrical license number/type/state fields on profile (critical for trust)
- Electrician: Q&A queue has only gibberish test data — no real questions to answer/evaluate
