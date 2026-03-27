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
- `lib/rate-limit.ts` - Token bucket + circuit breaker; Upstash Redis distributed + in-memory fallback
- `lib/validation.ts` - Zod schemas for core routes, includes `isValidUUID()`
- `lib/marketplace/validation.ts` - Zod schemas for marketplace routes
- `lib/marketplace/messaging-utils.ts` - Contact info sanitization for messages
- `lib/cors.ts` - Origin allowlist + Vercel regex, `validateRedirectUrl()`, `getSafeOrigin()`
- `lib/logger.ts` - Sensitive key redaction in logs
- `proxy.ts` - Security headers (CSP, HSTS, etc.) -- STILL NOT WIRED (no middleware.ts)

## Remediated Since 2026-03-07
- Email templates now use `escapeHtml()` on all params
- UUID validation (`isValidUUID()`) added to most routes with `[id]` params
- Rate limiting upgraded to Upstash Redis (distributed) with in-memory fallback
- Stripe onboarding uses `getSafeOrigin()` now (open redirect fixed)
- `user_credits` + `credit_transactions` RLS policies added (migration 20260225)
- `qa_bids` has full RLS policies (migration 20260226300000 + 20260308100000)

## Current Findings (2026-03-11)
1. **CRITICAL**: `proxy.ts` still not wired -- no security headers applied (no middleware.ts)
2. **HIGH**: Expert subscription POST (`/api/experts/subscription`) accepts arbitrary redirect URLs
3. **HIGH**: Notes GET (`/api/qa/[id]/notes`) no participant verification (info disclosure)
4. **HIGH**: Corrections GET (`/api/qa/[id]/corrections`) no participant verification
5. **HIGH**: Q&A detail (`/api/qa/[id]`) exposes `paymentIntentId` to expert
6. **HIGH**: Availability PUT (`/api/experts/[id]/availability`) has no Zod validation on body
7. **MEDIUM**: Expert search `ilike('city', `%${city}%`)` allows SQL wildcard injection
8. **MEDIUM**: Public expert profile (`/api/experts/[id]`) exposes `userId`
9. **MEDIUM**: No rate limiting on reputation GET, badge GET, availability GET
10. **MEDIUM**: Shared report endpoint creates own service client instead of getAdminClient()
11. **MEDIUM**: `console.error` in conversations/route.ts bypasses logger redaction
12. **MEDIUM**: Guided chat route missing CORS handling (no applyCorsHeaders/OPTIONS)

## Positive Security Practices
- Consistent auth + rate limiting pattern across nearly all API routes
- Stripe webhook signature verification on all 3 webhook endpoints
- SSRF protection with isUrlSafe() for webFetch
- Logger redacts sensitive keys automatically
- Contact info sanitization in marketplace messages
- RLS enabled on all tables with well-structured policies
- Service role key never exposed to client (no NEXT_PUBLIC_ prefix)
- Cron endpoint protected with CRON_SECRET bearer token
- Redirect URL validation in user subscription route via validateRedirectUrl()
- File upload: MIME whitelist, 5MB cap, random UUID filenames
- Optimistic locking on Q&A claim prevents race conditions
- SVG badge escapes XML entities (escapeXml function)
