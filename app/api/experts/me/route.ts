import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'experts');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ expert: null, openQueueCount: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Count open questions matching expert's specialties
    let openQueueCount = 0;
    if (expert.specialties.length > 0) {
      const specialtyNames = expert.specialties.map(s => s.specialty);
      const { count } = await auth.supabaseClient
        .from('qa_questions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .in('category', specialtyNames)
        .neq('diyer_user_id', auth.userId);
      openQueueCount = count ?? 0;
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ expert, openQueueCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert me GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
