import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertById } from '@/lib/marketplace/expert-helpers';
import { logger } from '@/lib/logger';

export async function GET(
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
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;

    const { data: question, error } = await auth.supabaseClient
      .from('qa_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify user is the DIYer or the claiming expert
    const isOwner = question.diyer_user_id === auth.userId;

    // Check if user is the expert who claimed this question
    let isClaimingExpert = false;
    if (question.expert_id) {
      const expert = await getExpertById(auth.supabaseClient, question.expert_id);
      if (expert && expert.userId === auth.userId) {
        isClaimingExpert = true;
      }
    }

    if (!isOwner && !isClaimingExpert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Build response
    const response: Record<string, unknown> = {
      id: question.id,
      diyerUserId: question.diyer_user_id,
      expertId: question.expert_id,
      reportId: question.report_id,
      projectId: question.project_id,
      questionText: question.question_text,
      category: question.category,
      aiContext: question.ai_context,
      photoUrls: question.photo_urls,
      priceCents: question.price_cents,
      status: question.status,
      claimedAt: question.claimed_at,
      claimExpiresAt: question.claim_expires_at,
      answeredAt: question.answered_at,
      answerText: question.answer_text,
      answerPhotos: question.answer_photos,
      recommendsProfessional: question.recommends_professional,
      proRecommendationReason: question.pro_recommendation_reason,
      diyerCity: question.diyer_city,
      diyerState: question.diyer_state,
      createdAt: question.created_at,
    };

    // Include expert profile if claimed
    if (question.expert_id) {
      const expertProfile = await getExpertById(auth.supabaseClient, question.expert_id);
      if (expertProfile) {
        response.expert = {
          id: expertProfile.id,
          displayName: expertProfile.displayName,
          profilePhotoUrl: expertProfile.profilePhotoUrl,
          avgRating: expertProfile.avgRating,
          totalReviews: expertProfile.totalReviews,
          verificationLevel: expertProfile.verificationLevel,
          specialties: expertProfile.specialties,
        };
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ question: response }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A detail error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
