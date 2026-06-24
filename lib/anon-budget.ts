import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

/**
 * Distributed daily ceiling on anonymous (logged-out) AI runs, backed by Upstash.
 *
 * The per-IP rate limiter is defeated by IP rotation, and the in-memory circuit
 * breaker is per-serverless-instance (not global). This counter bounds the
 * worst-case Anthropic spend from anonymous abuse across ALL callers/IPs to a
 * fixed number of runs per day. Authenticated users are never checked here (they
 * have per-user rate limits + freemium caps).
 *
 * Fails OPEN when Upstash is not configured (local dev) or on any Redis error, so
 * it can never block legitimate traffic due to a misconfiguration or outage.
 */
export async function checkAnonAiBudget(
  dayKey: string,
  bucket = 'agent-run',
): Promise<{ allowed: boolean; limit: number }> {
  const limit = Number(process.env.ANON_AI_DAILY_LIMIT || '500');
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return { allowed: true, limit };

  try {
    const redis = new Redis({ url, token });
    const key = `anon-ai:${bucket}:${dayKey}`;
    const count: number = await redis.incr(key);
    if (count === 1) {
      // ~26h TTL so the daily counter self-expires after the day rolls over.
      await redis.expire(key, 26 * 60 * 60);
    }
    return { allowed: count <= limit, limit };
  } catch (err) {
    logger.error('Anon AI budget check failed (failing open)', err, { dayKey, bucket });
    return { allowed: true, limit };
  }
}
