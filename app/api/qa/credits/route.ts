import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const adminClient = getAdminClient();
    const { data } = await adminClient
      .from('user_credits')
      .select('balance_cents')
      .eq('user_id', auth.userId)
      .single();

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ balanceCents: data?.balance_cents ?? 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Credits fetch error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
