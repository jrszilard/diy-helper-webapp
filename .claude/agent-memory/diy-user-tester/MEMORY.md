# DIY User Tester Memory

## Test Account Mapping

Credentials are stored in `.env.local` (never commit secrets).

| Persona | Email Env Var | Password Env Var |
|---|---|---|
| Beginner DIYer | `TEST_DIYER_BEGINNER_EMAIL` | `TEST_DIYER_BEGINNER_PASSWORD` |
| Intermediate DIYer | `TEST_DIYER_INTERMEDIATE_EMAIL` | `TEST_DIYER_INTERMEDIATE_PASSWORD` |
| Expert DIYer | `TEST_DIYER_EXPERT_EMAIL` | `TEST_DIYER_EXPERT_PASSWORD` |

To read credentials at runtime: use the Read tool on `.env.local` and extract the relevant values.

## Auth Strategy

- **Beginner**: Start as guest (localStorage mode). Test sign-up and guest-to-auth migration as part of sweep. Use test account for flows requiring auth.
- **Intermediate**: Log in with test account at start to access full features.
- **Expert**: Log in with test account at start to access full features.

## Cross-Session Tracking

Record findings below after each test run to track patterns over time.

### Recurring Issues
(none yet)

### Improvements Observed
(none yet)

### Persona-Specific Friction Patterns
(none yet)
