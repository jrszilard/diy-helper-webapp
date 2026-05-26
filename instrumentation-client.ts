// Sentry init for the browser. In Next.js 15+/16 this replaces the old
// sentry.client.config.ts. Events are sent via the same-origin tunnel route
// configured in next.config.ts, so the strict CSP connect-src 'self' covers
// them (and ad-blockers can't drop them). Dormant until a DSN is set.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  debug: false,
});

// Lets Sentry instrument client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
