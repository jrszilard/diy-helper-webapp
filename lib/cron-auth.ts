// Authorization check for Vercel Cron endpoints. Beyond matching the Bearer
// token, it rejects known-weak / placeholder secrets so a forgotten rotation
// (H2: CRON_SECRET still the dev default) fails loudly instead of silently
// trusting a guessable value.

const WEAK_SECRETS = new Set([
  'generate-a-secure-random-string', // .env.example placeholder
  'changeme',
  'cron-secret',
  'your-cron-secret',
  'secret',
  'dev',
  'test',
]);

const MIN_SECRET_LENGTH = 16;

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'weak-secret' | 'mismatch' };

export function verifyCronAuth(
  authHeader: string | null,
  secret: string | undefined
): CronAuthResult {
  if (!secret) return { ok: false, reason: 'not-configured' };
  if (WEAK_SECRETS.has(secret) || secret.length < MIN_SECRET_LENGTH) {
    return { ok: false, reason: 'weak-secret' };
  }
  if (authHeader !== `Bearer ${secret}`) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}
