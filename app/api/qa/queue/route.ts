import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { releaseExpiredClaims } from '@/lib/marketplace/qa-helpers';
import { getQueuePriorityTier, type ExpertLevel } from '@/lib/marketplace/reputation-engine';
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

    // Verify user is an expert
    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Release any expired claims first
    await releaseExpiredClaims(adminClient);

    // Get expert's reputation level and subscription tier for queue priority
    const { data: repProfile } = await adminClient
      .from('expert_profiles')
      .select('expert_level, reputation_score, subscription_tier')
      .eq('id', expert.id)
      .single();

    const expertLevel = (repProfile?.expert_level || 'bronze') as ExpertLevel;
    const subscriptionTier = (repProfile?.subscription_tier || 'free') as string;
    const reputationPriority = getQueuePriorityTier(expertLevel);
    // Subscription can boost priority: pro → priority, premium → premium
    const subscriptionPriority = subscriptionTier === 'premium' ? 'premium' : subscriptionTier === 'pro' ? 'priority' : 'standard';
    // Use the higher of reputation or subscription priority
    const priorityRank = { standard: 0, priority: 1, premium: 2 };
    const priorityTier = priorityRank[subscriptionPriority as keyof typeof priorityRank] >= priorityRank[reputationPriority as keyof typeof priorityRank]
      ? subscriptionPriority
      : reputationPriority;

    // Get expert's specialties
    const expertCategories = expert.specialties.map(s => s.specialty);

    // Build query — Gold/Platinum experts see specialist questions first
    let query = adminClient
      .from('qa_questions')
      .select('*')
      .eq('status', 'open')
      .in('category', expertCategories)
      .neq('diyer_user_id', auth.userId);

    // Standard-tier experts don't see specialist bidding questions
    // (they can still bid if they find them, but won't clutter their queue)
    if (priorityTier === 'standard') {
      query = query.or('pricing_mode.is.null,pricing_mode.neq.bidding');
    }

    const { data: questions, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch Q&A queue', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch queue' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        expertLevel,
        priorityTier,
        subscriptionTier,
        reputationScore: Number(repProfile?.reputation_score) || 0,
        questions: (questions || []).map(q => ({
          id: q.id,
          questionText: q.question_text,
          category: q.category,
          photoUrls: q.photo_urls,
          priceCents: q.price_cents,
          expertPayoutCents: q.expert_payout_cents,
          diyerCity: q.diyer_city,
          diyerState: q.diyer_state,
          aiContext: q.ai_context || null,
          questionMode: q.question_mode,
          priceTier: q.price_tier || null,
          difficultyScore: q.difficulty_score || null,
          pricingMode: q.pricing_mode || 'fixed',
          bidCount: q.bid_count || 0,
          bidDeadline: q.bid_deadline || null,
          createdAt: q.created_at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A queue error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
