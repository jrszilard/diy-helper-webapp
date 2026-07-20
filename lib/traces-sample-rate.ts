// Resolves Sentry's tracesSampleRate from env so it can be retuned without a deploy.
//
// This defaults to full capture on purpose. The rate was previously hardcoded to 0.1
// in production, which is sensible at scale but near-blind during a beta: with ~10
// real visitors in a day, 0.9^10 leaves a ~35% chance Sentry records *nothing*. A
// zero then reads identically to "nobody came," and the launch monitor reported
// exactly that for days while real people were arriving from Reddit.
//
// Full capture is affordable while traffic is in the tens-per-day. Once volume makes
// the Sentry quota bite, set SENTRY_TRACES_SAMPLE_RATE (and its NEXT_PUBLIC_ twin for
// the browser) rather than editing this default back down.

const DEFAULT_RATE = 1.0;

/**
 * Parses a sample rate from an env string, falling back to DEFAULT_RATE for anything
 * missing or out of range. A malformed value must not silently disable tracing, so
 * every invalid input resolves to the default rather than to 0.
 */
export function resolveTracesSampleRate(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_RATE;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return DEFAULT_RATE;

  return parsed;
}
