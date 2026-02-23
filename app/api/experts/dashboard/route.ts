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
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Total earnings from expert profile
    const totalEarningsCents = expert.totalEarningsCents;

    // Recent reviews count (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentReviewsCount } = await auth.supabaseClient
      .from('expert_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('expert_id', expert.id)
      .gte('created_at', thirtyDaysAgo);

    // Active Q&A count (claimed or answered, not yet accepted)
    const { count: activeQACount } = await auth.supabaseClient
      .from('qa_questions')
      .select('id', { count: 'exact', head: true })
      .eq('expert_id', expert.id)
      .in('status', ['claimed', 'answered']);

    // Pending payouts (accepted Q&A where payout not yet released)
    const { data: pendingPayouts } = await auth.supabaseClient
      .from('qa_questions')
      .select('expert_payout_cents')
      .eq('expert_id', expert.id)
      .eq('status', 'accepted')
      .eq('payout_status', 'pending');

    const pendingPayoutCents = (pendingPayouts || []).reduce(
      (sum, q) => sum + (q.expert_payout_cents || 0),
      0
    );

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        dashboard: {
          totalEarningsCents,
          recentReviewsCount: recentReviewsCount ?? 0,
          activeQACount: activeQACount ?? 0,
          pendingPayoutCents,
          avgRating: expert.avgRating,
          totalReviews: expert.totalReviews,
          isAvailable: expert.isAvailable,
          verificationLevel: expert.verificationLevel,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert dashboard error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
