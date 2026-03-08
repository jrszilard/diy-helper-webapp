# Security Review Memory - DIY Helper WebApp

## Architecture
- Next.js app with Supabase (PostgreSQL), Stripe payments, Brave Search API, Anthropic Claude AI
- Q&A marketplace: DIYers ask questions, experts claim and answer for payment
- Auth: Supabase JWT via Bearer token in Authorization header
- Admin client: `getAdminClient()` in `lib/supabase-admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY`
- RLS enforced on all tables; service role client bypasses RLS (used by webhooks, cron, notifications)

## Key Security Files
- `lib/auth.ts` - JWT auth extraction, creates user-scoped Supabase client for RLS
- `lib/security.ts` - XSS escaping, SSRF protection, href sanitization
- `lib/rate-limit.ts` - Token bucket + circuit breaker (in-memory, not distributed)
- `lib/validation.ts` - Zod schemas for core routes
- `lib/marketplace/validation.ts` - Zod schemas for marketplace routes
- `lib/marketplace/messaging-utils.ts` - Contact info sanitization for messages
- `lib/cors.ts` - Origin allowlist + Vercel regex
- `lib/logger.ts` - Sensitive key redaction in logs
- `proxy.ts` - Security headers (CSP, HSTS, etc.) -- BUT NOT WIRED AS MIDDLEWARE

## Critical Findings (2026-03-07)
1. **CRITICAL**: `proxy.ts` exists with security headers but NO `middleware.ts` imports it -- headers never applied
2. **HIGH**: Email templates use raw `params.title`/`params.body` without HTML escaping (XSS in emails)
3. **HIGH**: No UUID validation on route params (`[id]`) -- arbitrary strings passed to `.eq('id', ...)` queries
4. **HIGH**: In-memory rate limiting resets on serverless cold starts; no distributed rate limiter
5. **MEDIUM**: Stripe `onboardingLink` return URL comes from `origin` header (open redirect risk)
6. **MEDIUM**: `qa/[id]/bids` GET uses adminClient without verifying caller is participant (info disclosure)
7. **MEDIUM**: Missing `user_credits` and `credit_transactions` RLS policies (no migration creates them)
8. **MEDIUM**: `qa_bids` table has no RLS migration visible

## Positive Security Practices
- Consistent auth + rate limiting pattern across all API routes
- Stripe webhook signature verification on all 3 webhook endpoints
- SSRF protection with isUrlSafe() for webFetch
- Logger redacts sensitive keys automatically
- Contact info sanitization in marketplace messages
- RLS enabled on all tables with well-structured policies
- Service role key never exposed to client (no NEXT_PUBLIC_ prefix)
- Cron endpoint protected with CRON_SECRET bearer token
