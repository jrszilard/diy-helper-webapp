import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { chargeQAQuestion } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { TIER_DEFINITIONS, MAX_TIER } from '@/lib/marketplace/tier-gate';
import { marketplace as marketplaceConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const TierUpgradeSchema = z.object({
  targetTier: z.number().int().min(2).max(MAX_TIER),
});

// POST /api/qa/[id]/tier-upgrade — charge DIYer for tier upgrade
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
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = TierUpgradeSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { targetTier } = parsed.data;
    const adminClient = getAdminClient();

    // Fetch question
    const { data: question, error: qErr } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, expert_id, status, current_tier, tier_payments, price_cents, payment_method_id, stripe_customer_id')
      .eq('id', id)
      .single();

    if (qErr || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Only DIYer can upgrade
    if (question.diyer_user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the question owner can upgrade tiers' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Must be in an active conversation
    const allowedStatuses = ['claimed', 'answered', 'in_conversation', 'resolve_proposed'];
    if (!allowedStatuses.includes(question.status)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Cannot upgrade tier in current status' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Validate tier progression
    if (targetTier <= question.current_tier) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Already at or above target tier' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Calculate total upgrade cost (may skip tiers, e.g., 1 -> 3)
    let totalUpgradeCents = 0;
    for (let t = question.current_tier + 1; t <= targetTier; t++) {
      const tierDef = TIER_DEFINITIONS[t as keyof typeof TIER_DEFINITIONS];
      if (tierDef) {
        totalUpgradeCents += tierDef.additionalCents;
      }
    }

    if (totalUpgradeCents <= 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No charge required for this upgrade' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Charge the DIYer
    let paymentIntentId: string;

    if (!question.stripe_customer_id || !question.payment_method_id) {
      // Free question or missing payment info — shouldn't get here, but handle gracefully
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No payment method on file. Please update your payment method.' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    try {
      const chargeResult = await chargeQAQuestion({
        amountCents: totalUpgradeCents,
        customerId: question.stripe_customer_id,
        paymentMethodId: question.payment_method_id,
        metadata: {
          qa_question_id: id,
          type: 'tier_upgrade',
          from_tier: String(question.current_tier),
          to_tier: String(targetTier),
        },
      });
      paymentIntentId = chargeResult.paymentIntentId;
    } catch (chargeErr) {
      logger.error('Tier upgrade charge failed', chargeErr, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Payment failed. Please check your payment method.' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Update question with new tier and payment record
    const now = new Date().toISOString();
    const existingPayments = (question.tier_payments as Array<Record<string, unknown>>) || [];
    const newPayment = {
      tier: targetTier,
      amount_cents: totalUpgradeCents,
      payment_intent_id: paymentIntentId,
      charged_at: now,
    };

    // Calculate new expert payout amounts
    const platformFeeCents = Math.round(totalUpgradeCents * marketplaceConfig.platformFeeRate);
    const additionalExpertPayoutCents = totalUpgradeCents - platformFeeCents;

    await adminClient
      .from('qa_questions')
      .update({
        current_tier: targetTier,
        tier_payments: [...existingPayments, newPayment],
        // Accumulate total price and expert payout
        price_cents: question.price_cents + totalUpgradeCents,
        platform_fee_cents: Math.round((question.price_cents + totalUpgradeCents) * marketplaceConfig.platformFeeRate),
        expert_payout_cents: (question.price_cents + totalUpgradeCents) - Math.round((question.price_cents + totalUpgradeCents) * marketplaceConfig.platformFeeRate),
        updated_at: now,
      })
      .eq('id', id);

    // Notify expert
    if (question.expert_id) {
      const { data: ep } = await adminClient
        .from('expert_profiles')
        .select('user_id')
        .eq('id', question.expert_id)
        .single();

      if (ep?.user_id) {
        await createNotification({
          userId: ep.user_id,
          type: 'qa_tier_upgraded',
          title: `Conversation upgraded to ${TIER_DEFINITIONS[targetTier as keyof typeof TIER_DEFINITIONS]?.label || `Tier ${targetTier}`}`,
          body: `You'll earn an additional $${(additionalExpertPayoutCents / 100).toFixed(2)} for this conversation.`,
          link: `/marketplace/qa/${id}`,
        });
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        success: true,
        currentTier: targetTier,
        chargedCents: totalUpgradeCents,
        paymentIntentId,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Tier upgrade error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
