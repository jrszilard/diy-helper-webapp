// Next.js instrumentation hook. Loads the runtime-appropriate Sentry config and
// exports onRequestError so Server Component / route / middleware errors are
// captured automatically (the gap that let the feedback 500 stay invisible).
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
