# Cohort Tracker

> Last updated: 2026-05-08
> Workflow defined in [README.md](./README.md)

## Cohort 1 — Invite-only beta (May 2026)

| Name | Role | Contact | Date Texted | Replied? | Signed Up? | Active? | First Feedback | Notes |
|------|------|---------|-------------|----------|------------|---------|----------------|-------|
| _Example DIYer_ | DIYer | 555-0100 | 2026-05-08 | Y | Y (2026-05-08) | Y | "AI chat helpful, checkout confusing" | Basement bathroom remodel |
| _Example Expert_ | Expert (Plumber) | example@email.com | 2026-05-08 | Y | N | N | _pending_ | TX-licensed, 12yr exp |

<!--
ROW TEMPLATE — copy and fill in:
| Name | DIYer / Expert (trade) / Both | phone or email | YYYY-MM-DD | Y/N | Y (date) / N | Y/N | "quote or summary" | context |
-->

## Stage definitions

| Stage | Meaning |
|-------|---------|
| **Texted** | Initial 1:1 invite sent |
| **Replied** | They responded — yes/no/maybe/no-reply |
| **Signed Up** | Created an account on fixerator.com (cross-check Supabase `users` table) |
| **Active** | Used the app within the last 7 days |
| **Feedback received** | Shared first impressions (text, in-app, or call) |

## Roll-up

Update weekly. Quick gut-check on cohort health.

| Metric | Count | Target |
|--------|-------|--------|
| Texted | 0 | 10-15 |
| Replied | 0 | 8-12 |
| Signed up | 0 | 6-10 |
| Active (7-day) | 0 | 5-8 |
| Feedback received | 0 | 5+ |

## Notable feedback themes

_Aggregate patterns once you have 3+ feedback items. Categorize as:_
- **Bugs** (blocking flow) — fix in 24-48h
- **UX gripes** (friction, confusion) — log, batch fixes weekly
- **Feature requests** — log, defer until cohort signal converges
- **Praise** — keep, use in marketing copy later
