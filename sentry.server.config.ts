// Sentry init for the Node.js server runtime. Loaded by instrumentation.ts.
// Stays dormant until NEXT_PUBLIC_SENTRY_DSN is set (local dev = no-op).
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Performance tracing: full in dev, light sample in prod.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Quieter SDK logs; flip on temporarily to debug Sentry itself.
  debug: false,
});
