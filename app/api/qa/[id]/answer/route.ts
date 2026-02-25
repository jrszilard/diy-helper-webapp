import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { AnswerQuestionSchema } from '@/lib/marketplace/validation';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { createNotification } from '@/lib/notifications';
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
    const parsed = parseRequestBody(AnswerQuestionSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Get the question and verify expert is the claimer
    const { data: question, error: fetchError } = await auth.supabaseClient
      .from('qa_questions')
      .select('id, status, expert_id, diyer_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.expert_id !== expert.id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'You are not the assigned expert for this question' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.status !== 'claimed') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question is not in claimed status' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const now = new Date().toISOString();

    const { error: updateError } = await auth.supabaseClient
      .from('qa_questions')
      .update({
        answer_text: parsed.data.answerText,
        answer_photos: parsed.data.answerPhotos,
        recommends_professional: parsed.data.recommendsProfessional,
        pro_recommendation_reason: parsed.data.proRecommendationReason || null,
        status: 'answered',
        answered_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('expert_id', expert.id);

    if (updateError) {
      logger.error('Failed to submit answer', updateError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to submit answer' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify DIYer
    await createNotification({
      userId: question.diyer_user_id,
      type: 'qa_answer_received',
      title: 'Your question has been answered',
      body: `${expert.displayName} has answered your question`,
      link: `/marketplace/qa/${id}`,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A answer error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
