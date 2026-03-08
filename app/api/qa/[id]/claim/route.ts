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
import { isValidUUID } from '@/lib/validation';
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

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;

    if (!isValidUUID(id)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

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

    const now = new Date();
    const claimExpiresAt = new Date(now.getTime() + CLAIM_EXPIRY_HOURS * 60 * 60 * 1000);

    // STEP 1: Atomically claim the question BEFORE charging.
    // The .eq('status', 'open') acts as an optimistic lock — only one concurrent
    // request can succeed. This prevents the double-charge race condition where
    // two experts both pass the status check and both charge the DIYer.
    const { data: claimed, error: claimError } = await adminClient
      .from('qa_questions')
      .update({
        expert_id: expert.id,
        status: 'claimed',
        claimed_at: now.toISOString(),
        claim_expires_at: claimExpiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .eq('status', 'open')
      .select('id')
      .single();

    if (claimError || !claimed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question was claimed by another expert' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // STEP 2: Now charge — only one expert reaches here per question.
    let paymentIntentId: string | null = null;

    if (question.payout_status !== 'free' && question.price_cents > 0) {
      // Apply credits first (atomic deduction)
      const { effectiveChargeCents } = await applyCredits(
        adminClient,
        question.diyer_user_id,
        id,
        question.price_cents,
      );

      if (effectiveChargeCents > 0) {
        if (!question.payment_method_id || !question.stripe_customer_id) {
          // ROLLBACK: release the claim so the question returns to open
          await adminClient
            .from('qa_questions')
            .update({
              status: 'open',
              expert_id: null,
              claimed_at: null,
              claim_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

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
          // ROLLBACK: release the claim so another expert can try
          await adminClient
            .from('qa_questions')
            .update({
              status: 'open',
              expert_id: null,
              claimed_at: null,
              claim_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          logger.error('Failed to charge DIYer on claim', chargeError, { questionId: id });
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Payment failed. The question remains open.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      }
    }

    // STEP 3: Update with payment intent ID (claim already set in step 1)
    if (paymentIntentId) {
      await adminClient
        .from('qa_questions')
        .update({ payment_intent_id: paymentIntentId })
        .eq('id', id);
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
