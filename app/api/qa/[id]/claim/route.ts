import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { applyCredits } from '@/lib/marketplace/qa-helpers';
import { chargeQAQuestion } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { getAdminClient } from '@/lib/supabase-admin';
import { CLAIM_EXPIRY_HOURS } from '@/lib/marketplace/constants';
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
    const adminClient = getAdminClient();

    // Verify user is an expert
    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Fetch full question data (use admin client for complete access)
    const { data: question, error: fetchError } = await adminClient
      .from('qa_questions')
      .select('id, status, diyer_user_id, payment_method_id, stripe_customer_id, price_cents, question_mode, target_expert_id, payout_status, credit_applied_cents')
      .eq('id', id)
      .single();

    if (fetchError || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.status !== 'open') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question is no longer available' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.diyer_user_id === auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Cannot claim your own question' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // For direct mode: verify claiming expert matches target
    if (question.question_mode === 'direct' && question.target_expert_id) {
      if (expert.id !== question.target_expert_id) {
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'This question is directed to a specific expert' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

    let paymentIntentId: string | null = null;

    // Charge the DIYer if this is a paid question
    if (question.payout_status !== 'free' && question.price_cents > 0) {
      // Apply credits first
      const { effectiveChargeCents } = await applyCredits(
        adminClient,
        question.diyer_user_id,
        id,
        question.price_cents,
      );

      // Only charge if there's still an amount after credits
      if (effectiveChargeCents > 0) {
        if (!question.payment_method_id || !question.stripe_customer_id) {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Payment method not saved. DIYer needs to re-submit with payment.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        try {
          const chargeResult = await chargeQAQuestion({
            amountCents: effectiveChargeCents,
            customerId: question.stripe_customer_id,
            paymentMethodId: question.payment_method_id,
            metadata: {
              qa_question_id: id,
              diyer_user_id: question.diyer_user_id,
              type: 'qa_question',
            },
          });
          paymentIntentId = chargeResult.paymentIntentId;
        } catch (chargeError) {
          logger.error('Failed to charge DIYer on claim', chargeError, { questionId: id });
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Payment failed. The question remains open.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      }
    }

    const now = new Date();
    const claimExpiresAt = new Date(now.getTime() + CLAIM_EXPIRY_HOURS * 60 * 60 * 1000);

    const { error: updateError } = await adminClient
      .from('qa_questions')
      .update({
        expert_id: expert.id,
        status: 'claimed',
        claimed_at: now.toISOString(),
        claim_expires_at: claimExpiresAt.toISOString(),
        payment_intent_id: paymentIntentId,
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .eq('status', 'open');

    if (updateError) {
      logger.error('Failed to claim question', updateError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to claim question' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify DIYer
    await createNotification({
      userId: question.diyer_user_id,
      type: 'qa_question_claimed',
      title: 'An expert has claimed your question',
      body: `${expert.displayName} is working on your answer`,
      link: `/marketplace/qa/${id}`,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        success: true,
        claimExpiresAt: claimExpiresAt.toISOString(),
        paymentIntentId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A claim error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
