import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { SubmitQuestionSchema } from '@/lib/marketplace/validation';
import { calculateQAPrice, isFirstQuestionFree } from '@/lib/marketplace/qa-helpers';
import { buildExpertContext } from '@/lib/marketplace/context-builder';
import { createQAPaymentIntent } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = parseRequestBody(SubmitQuestionSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { priceCents, platformFeeCents, expertPayoutCents } = calculateQAPrice(parsed.data.category);

    // Check if first question is free
    const firstFree = await isFirstQuestionFree(auth.supabaseClient, auth.userId);

    let paymentIntentId: string | null = null;

    if (!firstFree) {
      // Get user email for payment
      const { data: { user } } = await auth.supabaseClient.auth.getUser();
      const paymentIntent = await createQAPaymentIntent({
        amountCents: priceCents,
        customerEmail: user?.email || '',
        metadata: {
          userId: auth.userId,
          category: parsed.data.category,
          type: 'qa_question',
        },
      });
      paymentIntentId = paymentIntent.id;
    }

    // Build AI context if reportId provided
    let aiContext = null;
    if (parsed.data.reportId) {
      aiContext = await buildExpertContext(auth.supabaseClient, parsed.data.reportId);
    }

    // Insert the question
    const { data: question, error: insertError } = await auth.supabaseClient
      .from('qa_questions')
      .insert({
        diyer_user_id: auth.userId,
        report_id: parsed.data.reportId || null,
        project_id: parsed.data.projectId || null,
        question_text: parsed.data.questionText,
        category: parsed.data.category,
        ai_context: aiContext,
        photo_urls: parsed.data.photoUrls,
        price_cents: firstFree ? 0 : priceCents,
        platform_fee_cents: firstFree ? 0 : platformFeeCents,
        expert_payout_cents: firstFree ? 0 : expertPayoutCents,
        status: 'open',
        payment_intent_id: paymentIntentId,
        payout_status: firstFree ? 'free' : 'pending',
        diyer_city: parsed.data.diyerCity || null,
        diyer_state: parsed.data.diyerState || null,
      })
      .select('id')
      .single();

    if (insertError || !question) {
      logger.error('Failed to create Q&A question', insertError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to submit question' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify matching experts
    const adminClient = getAdminClient();
    const { data: matchingExperts } = await adminClient
      .from('expert_specialties')
      .select('expert_id, expert_profiles!inner(user_id, is_active, is_available)')
      .eq('specialty', parsed.data.category)
      .eq('expert_profiles.is_active', true)
      .eq('expert_profiles.is_available', true);

    if (matchingExperts) {
      for (const expert of matchingExperts) {
        const expertProfile = expert.expert_profiles as unknown as { user_id: string };
        if (expertProfile.user_id !== auth.userId) {
          await createNotification({
            userId: expertProfile.user_id,
            type: 'qa_question_posted',
            title: 'New question in your specialty',
            body: parsed.data.questionText.slice(0, 100),
            link: `/experts/qa/${question.id}`,
          });
        }
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        id: question.id,
        paymentIntentId,
        isFree: firstFree,
        priceCents: firstFree ? 0 : priceCents,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A submit error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

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

    const { data: questions, error } = await auth.supabaseClient
      .from('qa_questions')
      .select('*')
      .eq('diyer_user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch Q&A questions', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        questions: (questions || []).map(q => ({
          id: q.id,
          questionText: q.question_text,
          category: q.category,
          status: q.status,
          priceCents: q.price_cents,
          expertId: q.expert_id,
          answerText: q.answer_text,
          answeredAt: q.answered_at,
          createdAt: q.created_at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A list error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
