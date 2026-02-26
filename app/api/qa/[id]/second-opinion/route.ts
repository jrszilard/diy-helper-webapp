import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { chargeQAQuestion } from '@/lib/stripe';
import { applyCredits } from '@/lib/marketplace/qa-helpers';
import { createNotification } from '@/lib/notifications';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

const SECOND_OPINION_PRICE_CENTS = 1500; // $15
const SECOND_OPINION_PLATFORM_FEE_CENTS = 270; // 18%
const SECOND_OPINION_EXPERT_PAYOUT_CENTS = 1230;

/**
 * POST /api/qa/[id]/second-opinion — Request a second expert opinion.
 * Creates a linked child question that another expert can claim.
 */
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

    // Fetch the original question
    const { data: original } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, expert_id, question_text, category, ai_context, photo_urls, report_id, project_id, status, payment_method_id, stripe_customer_id, answer_text, price_tier')
      .eq('id', id)
      .single();

    if (!original) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Only the DIYer can request a second opinion
    if (original.diyer_user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the question owner can request a second opinion' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Must have an answer already
    if (!['answered', 'in_conversation', 'resolve_proposed', 'accepted', 'resolved'].includes(original.status)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'You need an answer first before requesting a second opinion' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check for existing second opinion
    const { data: existing } = await adminClient
      .from('qa_questions')
      .select('id')
      .eq('parent_question_id', id)
      .eq('is_second_opinion', true)
      .single();

    if (existing) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'A second opinion has already been requested', secondOpinionId: existing.id }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Charge for second opinion
    let paymentIntentId: string | null = null;

    // Apply credits first
    const { effectiveChargeCents } = await applyCredits(
      adminClient,
      auth.userId,
      'second_opinion',
      SECOND_OPINION_PRICE_CENTS,
    );

    if (effectiveChargeCents > 0) {
      if (!original.payment_method_id || !original.stripe_customer_id) {
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Payment method required for second opinion' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      try {
        const charge = await chargeQAQuestion({
          amountCents: effectiveChargeCents,
          customerId: original.stripe_customer_id,
          paymentMethodId: original.payment_method_id,
          metadata: {
            type: 'qa_second_opinion',
            parent_question_id: id,
          },
        });
        paymentIntentId = charge.paymentIntentId;
      } catch (chargeErr) {
        logger.error('Failed to charge for second opinion', chargeErr, { questionId: id });
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Payment failed. Please check your payment method.' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

    // Create the second opinion question (linked to parent)
    const { data: secondOpinion, error: insertErr } = await adminClient
      .from('qa_questions')
      .insert({
        diyer_user_id: auth.userId,
        report_id: original.report_id,
        project_id: original.project_id,
        question_text: original.question_text,
        category: original.category,
        ai_context: original.ai_context,
        photo_urls: original.photo_urls,
        price_cents: SECOND_OPINION_PRICE_CENTS,
        platform_fee_cents: SECOND_OPINION_PLATFORM_FEE_CENTS,
        expert_payout_cents: SECOND_OPINION_EXPERT_PAYOUT_CENTS,
        status: 'open',
        question_mode: 'pool',
        payment_intent_id: paymentIntentId,
        payment_method_id: original.payment_method_id,
        stripe_customer_id: original.stripe_customer_id,
        payout_status: 'pending',
        parent_question_id: id,
        is_second_opinion: true,
        pricing_mode: 'fixed',
        price_tier: 'standard',
      })
      .select('id')
      .single();

    if (insertErr || !secondOpinion) {
      logger.error('Failed to create second opinion', insertErr, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to create second opinion request' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify matching experts (exclude the original expert)
    const { data: matchingExperts } = await adminClient
      .from('expert_specialties')
      .select('expert_id, expert_profiles!inner(user_id, is_active, is_available)')
      .eq('specialty', original.category)
      .eq('expert_profiles.is_active', true)
      .eq('expert_profiles.is_available', true);

    if (matchingExperts) {
      for (const exp of matchingExperts) {
        const expProfile = exp.expert_profiles as unknown as { user_id: string };
        // Skip DIYer and original expert
        if (expProfile.user_id !== auth.userId && exp.expert_id !== original.expert_id) {
          await createNotification({
            userId: expProfile.user_id,
            type: 'qa_question_posted',
            title: 'Second opinion requested — expert context included',
            body: original.question_text.slice(0, 100),
            link: `/experts/dashboard/qa`,
          });
        }
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        secondOpinionId: secondOpinion.id,
        priceCents: SECOND_OPINION_PRICE_CENTS,
        paymentIntentId,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Second opinion error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
