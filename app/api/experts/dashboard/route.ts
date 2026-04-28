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

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'experts');
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

    // Compute earnings live from qa_questions instead of trusting the
    // experts.total_earnings_cents column (which is never written by the
    // resolve flow — caused $0 dashboard for paid experts pre-2026-04-28).
    const { data: earningsRows } = await auth.supabaseClient
      .from('qa_questions')
      .select('expert_payout_cents, status, payout_status, payout_released_at, answered_at, claimed_at')
      .eq('expert_id', expert.id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    let totalEarningsCents = 0;
    let thisMonthEarningsCents = 0;
    let pendingPayoutCents = 0;
    let inEscrowCents = 0;
    let activeQACount = 0;

    for (const q of earningsRows || []) {
      const payout = q.expert_payout_cents || 0;
      // Skip free / refunded — no expert earnings.
      if (q.payout_status === 'free' || q.payout_status === 'refunded') continue;

      if (q.status === 'accepted' && q.payout_status === 'released') {
        totalEarningsCents += payout;
        if (q.payout_released_at && q.payout_released_at >= startOfMonthIso) {
          thisMonthEarningsCents += payout;
        }
      } else if (q.status === 'accepted' && q.payout_status === 'pending') {
        pendingPayoutCents += payout;
      } else if (q.status === 'claimed' || q.status === 'answered') {
        // Charge-on-claim already moved DIYer money. Surface as escrow so
        // experts can see committed work value before DIYer accepts.
        inEscrowCents += payout;
        activeQACount += 1;
      }
    }

    // Recent reviews count (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentReviewsCount } = await auth.supabaseClient
      .from('expert_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('expert_id', expert.id)
      .gte('created_at', thirtyDaysAgo);

    // Reputation + subscription so the dashboard can render a tier badge
    // and upgrade CTA. Backend has tracked these for a while; UI was missing.
    const { data: tierProfile } = await auth.supabaseClient
      .from('expert_profiles')
      .select('expert_level, reputation_score, subscription_tier')
      .eq('id', expert.id)
      .single();

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        dashboard: {
          totalEarningsCents,
          thisMonthEarningsCents,
          pendingPayoutCents,
          inEscrowCents,
          recentReviewsCount: recentReviewsCount ?? 0,
          activeQACount,
          avgRating: expert.avgRating,
          totalReviews: expert.totalReviews,
          isAvailable: expert.isAvailable,
          verificationLevel: expert.verificationLevel,
          stripeOnboardingComplete: expert.stripeOnboardingComplete ?? false,
          expertLevel: (tierProfile?.expert_level || 'bronze') as string,
          reputationScore: Number(tierProfile?.reputation_score) || 0,
          subscriptionTier: (tierProfile?.subscription_tier || 'free') as string,
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
