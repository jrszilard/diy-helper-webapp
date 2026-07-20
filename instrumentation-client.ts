// Sentry init for the browser. In Next.js 15+/16 this replaces the old
// sentry.client.config.ts. Events are sent via the same-origin tunnel route
// configured in next.config.ts, so the strict CSP connect-src 'self' covers
// them (and ad-blockers can't drop them). Dormant until a DSN is set.
import * as Sentry from '@sentry/nextjs';
import { resolveTracesSampleRate } from './lib/traces-sample-rate';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  // NEXT_PUBLIC_ prefix is required here: this value is inlined into the browser
  // bundle at build time, so the server-side SENTRY_TRACES_SAMPLE_RATE is not visible.
  tracesSampleRate: resolveTracesSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  ),
  debug: false,
});

// Lets Sentry instrument client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
