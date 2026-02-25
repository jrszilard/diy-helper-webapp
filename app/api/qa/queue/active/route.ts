import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { releaseExpiredClaims } from '@/lib/marketplace/qa-helpers';
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

    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Release expired claims first
    await releaseExpiredClaims(adminClient);

    // Get expert's active questions (claimed or answered)
    const { data: questions, error } = await adminClient
      .from('qa_questions')
      .select('*')
      .eq('expert_id', expert.id)
      .in('status', ['claimed', 'answered'])
      .order('claimed_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch active questions', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch active questions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        questions: (questions || []).map(q => ({
          id: q.id,
          questionText: q.question_text,
          category: q.category,
          photoUrls: q.photo_urls,
          priceCents: q.price_cents,
          expertPayoutCents: q.expert_payout_cents,
          status: q.status,
          claimedAt: q.claimed_at,
          claimExpiresAt: q.claim_expires_at,
          answeredAt: q.answered_at,
          answerText: q.answer_text,
          diyerCity: q.diyer_city,
          diyerState: q.diyer_state,
          aiContext: q.ai_context,
          questionMode: q.question_mode,
          createdAt: q.created_at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Active queue error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
