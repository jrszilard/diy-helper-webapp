// Sentry init for the Node.js server runtime. Loaded by instrumentation.ts.
// Stays dormant until NEXT_PUBLIC_SENTRY_DSN is set (local dev = no-op).
import * as Sentry from '@sentry/nextjs';
import { resolveTracesSampleRate } from './lib/traces-sample-rate';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Performance tracing. Full capture by default — see lib/traces-sample-rate.ts for
  // why sampling is off while beta traffic is small, and how to dial it back down.
  tracesSampleRate: resolveTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),

  // Quieter SDK logs; flip on temporarily to debug Sentry itself.
  debug: false,
});
