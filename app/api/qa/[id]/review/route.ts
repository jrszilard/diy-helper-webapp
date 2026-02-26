import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { SubmitReviewSchema } from '@/lib/marketplace/validation';
import { updateExpertRating } from '@/lib/marketplace/review-helpers';
import { recalculateReputation } from '@/lib/marketplace/reputation-engine';
import { createNotification } from '@/lib/notifications';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

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
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = parseRequestBody(SubmitReviewSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get the question
    const { data: question, error: fetchError } = await auth.supabaseClient
      .from('qa_questions')
      .select('id, status, diyer_user_id, expert_id')
      .eq('id', id)
      .single();

    if (fetchError || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify user is the DIYer
    if (question.diyer_user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the question owner can leave a review' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.status !== 'accepted') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Can only review after accepting the answer' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!question.expert_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No expert to review' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Check for existing review
    const { count: existingReviewCount } = await adminClient
      .from('expert_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('qa_question_id', id)
      .eq('reviewer_user_id', auth.userId);

    if ((existingReviewCount ?? 0) > 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'You have already reviewed this question' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Insert review
    const { data: review, error: insertError } = await adminClient
      .from('expert_reviews')
      .insert({
        expert_id: question.expert_id,
        reviewer_user_id: auth.userId,
        review_type: 'qa',
        qa_question_id: id,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body || null,
        is_visible: true,
      })
      .select('id')
      .single();

    if (insertError || !review) {
      logger.error('Failed to insert review', insertError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to submit review' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Update expert rating and recalculate reputation
    await updateExpertRating(adminClient, question.expert_id);
    try { await recalculateReputation(adminClient, question.expert_id); } catch { /* best-effort */ }

    // Notify expert about the review
    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('user_id')
      .eq('id', question.expert_id)
      .single();

    if (expertProfile) {
      await createNotification({
        userId: expertProfile.user_id,
        type: 'qa_review_received',
        title: 'You received a new review',
        body: `${parsed.data.rating} star${parsed.data.rating !== 1 ? 's' : ''} - ${parsed.data.title || 'No title'}`,
        link: `/experts/dashboard`,
      });
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ id: review.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A review error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
