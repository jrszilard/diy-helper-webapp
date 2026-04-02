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

### Recurring Issues
(none yet)

### Improvements Observed
(none yet)

### Trade-Specific Friction Patterns
(none yet)
