import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { recalculateReputation, LEVEL_THRESHOLDS } from '@/lib/marketplace/reputation-engine';
import { logger } from '@/lib/logger';

/**
 * GET /api/experts/[id]/reputation — Get expert's reputation data.
 * POST /api/experts/[id]/reputation — Trigger reputation recalculation (expert only).
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = getAdminClient();

    const { data: profile } = await adminClient
      .from('expert_profiles')
      .select(`
        reputation_score, expert_level, acceptance_rate, avg_response_minutes,
        tier_upgrade_rate, total_questions_answered, total_questions_claimed,
        total_corrections, total_graduations, avg_rating, total_reviews,
        reputation_updated_at
      `)
      .eq('id', id)
      .single();

    if (!profile) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        reputationScore: Number(profile.reputation_score) || 0,
        expertLevel: profile.expert_level || 'bronze',
        acceptanceRate: Number(profile.acceptance_rate) || 0,
        avgResponseMinutes: profile.avg_response_minutes,
        tierUpgradeRate: Number(profile.tier_upgrade_rate) || 0,
        totalQuestionsAnswered: profile.total_questions_answered || 0,
        totalQuestionsClaimed: profile.total_questions_claimed || 0,
        totalCorrections: profile.total_corrections || 0,
        totalGraduations: profile.total_graduations || 0,
        avgRating: Number(profile.avg_rating) || 0,
        totalReviews: profile.total_reviews || 0,
        levelThresholds: LEVEL_THRESHOLDS,
        updatedAt: profile.reputation_updated_at,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Reputation GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { id } = await params;
    const adminClient = getAdminClient();

    // Verify the requesting user owns this expert profile
    const { data: profile } = await adminClient
      .from('expert_profiles')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!profile || profile.user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'You can only recalculate your own reputation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const result = await recalculateReputation(adminClient, id);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        score: result.score,
        level: result.level,
        metrics: result.metrics,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Reputation POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
