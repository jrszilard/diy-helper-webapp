// Sentry init for the Edge runtime (middleware, edge routes). Loaded by
// instrumentation.ts. Mirrors the server config; stays dormant without a DSN.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  debug: false,
});
