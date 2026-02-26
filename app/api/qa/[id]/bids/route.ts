import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { chargeQAQuestion } from '@/lib/stripe';
import { applyCredits } from '@/lib/marketplace/qa-helpers';
import { createNotification } from '@/lib/notifications';
import { validateBidPrice, calculateBidPricing, checkBidWindowStatus } from '@/lib/marketplace/bidding';
import { CLAIM_EXPIRY_HOURS } from '@/lib/marketplace/constants';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SubmitBidSchema = z.object({
  proposedPriceCents: z.number().int().min(1500).max(15000),
  pitch: z.string().min(20).max(2000),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  relevantExperience: z.string().max(500).optional(),
});

const SelectBidSchema = z.object({
  action: z.literal('select'),
  bidId: z.string().uuid(),
});

// GET /api/qa/[id]/bids — list bids for a bidding-mode question
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

    const { id } = await params;
    const adminClient = getAdminClient();

    // Get question to verify access
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, pricing_mode, bid_deadline, bid_count, accepted_bid_id, status')
      .eq('id', id)
      .single();

    if (!question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Fetch bids with expert info
    const { data: bids, error } = await adminClient
      .from('qa_bids')
      .select(`
        id, question_id, expert_id, proposed_price_cents, platform_fee_cents, expert_payout_cents,
        pitch, estimated_minutes, relevant_experience, status, created_at, updated_at
      `)
      .eq('question_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch bids', error, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to load bids' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Fetch expert profiles for all bidders
    const expertIds = [...new Set((bids || []).map(b => b.expert_id))];
    let experts: Record<string, { displayName: string; profilePhotoUrl: string | null; avgRating: number; totalReviews: number; specialties: Array<{ specialty: string; yearsExperience: number | null; isPrimary: boolean }> }> = {};

    if (expertIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('expert_profiles')
        .select('id, display_name, profile_photo_url, avg_rating, total_reviews, expert_specialties(specialty, years_experience, is_primary)')
        .in('id', expertIds);

      if (profiles) {
        for (const p of profiles) {
          const specialties = (p.expert_specialties as Array<{ specialty: string; years_experience: number | null; is_primary: boolean }>) || [];
          experts[p.id] = {
            displayName: p.display_name,
            profilePhotoUrl: p.profile_photo_url,
            avgRating: Number(p.avg_rating),
            totalReviews: p.total_reviews,
            specialties: specialties.map(s => ({
              specialty: s.specialty,
              yearsExperience: s.years_experience,
              isPrimary: s.is_primary,
            })),
          };
        }
      }
    }

    const windowStatus = checkBidWindowStatus({
      bidDeadline: question.bid_deadline,
      bidCount: question.bid_count,
      acceptedBidId: question.accepted_bid_id,
      status: question.status,
    });

    const formattedBids = (bids || []).map(b => ({
      id: b.id,
      questionId: b.question_id,
      expertId: b.expert_id,
      proposedPriceCents: b.proposed_price_cents,
      platformFeeCents: b.platform_fee_cents,
      expertPayoutCents: b.expert_payout_cents,
      pitch: b.pitch,
      estimatedMinutes: b.estimated_minutes,
      relevantExperience: b.relevant_experience,
      status: b.status,
      createdAt: b.created_at,
      expert: experts[b.expert_id] || null,
    }));

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        bids: formattedBids,
        windowStatus,
        acceptedBidId: question.accepted_bid_id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Bids GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// POST /api/qa/[id]/bids — submit a bid (expert) or select a bid (DIYer)
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
    const adminClient = getAdminClient();

    // Check if this is a select-bid action (DIYer)
    const selectParsed = SelectBidSchema.safeParse(body);
    if (selectParsed.success) {
      return handleSelectBid(req, auth.userId, id, selectParsed.data.bidId, adminClient);
    }

    // Otherwise it's a submit-bid action (expert)
    const parsed = SubmitBidSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid bid', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return handleSubmitBid(req, auth.userId, id, parsed.data, adminClient);
  } catch (error) {
    logger.error('Bids POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// ── Submit bid (expert) ─────────────────────────────────────────────────────

async function handleSubmitBid(
  req: NextRequest,
  userId: string,
  questionId: string,
  data: z.infer<typeof SubmitBidSchema>,
  adminClient: ReturnType<typeof getAdminClient>,
) {
  // Verify user is an expert
  const { data: expertProfile } = await adminClient
    .from('expert_profiles')
    .select('id, user_id')
    .eq('user_id', userId)
    .single();

  if (!expertProfile) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Expert profile required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Fetch question
  const { data: question } = await adminClient
    .from('qa_questions')
    .select('id, diyer_user_id, pricing_mode, status, bid_deadline, bid_count, accepted_bid_id')
    .eq('id', questionId)
    .single();

  if (!question) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Question not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Validate bidding mode
  if (question.pricing_mode !== 'bidding') {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'This question is not in bidding mode. Use claim instead.' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  if (question.diyer_user_id === userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Cannot bid on your own question' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Check bid window
  const windowStatus = checkBidWindowStatus({
    bidDeadline: question.bid_deadline,
    bidCount: question.bid_count,
    acceptedBidId: question.accepted_bid_id,
    status: question.status,
  });

  if (!windowStatus.isOpen) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Bidding window has closed', reason: windowStatus.reason }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Validate price
  const priceValidation = validateBidPrice(data.proposedPriceCents);
  if (!priceValidation.valid) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: priceValidation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Check for existing bid by this expert
  const { data: existingBid } = await adminClient
    .from('qa_bids')
    .select('id')
    .eq('question_id', questionId)
    .eq('expert_id', expertProfile.id)
    .single();

  if (existingBid) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'You have already submitted a bid for this question' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { platformFeeCents, expertPayoutCents } = calculateBidPricing(data.proposedPriceCents);

  // Insert bid
  const { data: bid, error: insertErr } = await adminClient
    .from('qa_bids')
    .insert({
      question_id: questionId,
      expert_id: expertProfile.id,
      proposed_price_cents: data.proposedPriceCents,
      platform_fee_cents: platformFeeCents,
      expert_payout_cents: expertPayoutCents,
      pitch: data.pitch,
      estimated_minutes: data.estimatedMinutes || null,
      relevant_experience: data.relevantExperience || null,
    })
    .select('id, proposed_price_cents, status, created_at')
    .single();

  if (insertErr) {
    logger.error('Failed to insert bid', insertErr, { questionId });
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to submit bid' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Notify DIYer
  await createNotification({
    userId: question.diyer_user_id,
    type: 'qa_bid_received',
    title: 'New expert proposal received',
    body: `An expert has proposed to answer your question for $${(data.proposedPriceCents / 100).toFixed(0)}`,
    link: `/marketplace/qa/${questionId}`,
  });

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ bid }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  ));
}

// ── Select bid (DIYer) ──────────────────────────────────────────────────────

async function handleSelectBid(
  req: NextRequest,
  userId: string,
  questionId: string,
  bidId: string,
  adminClient: ReturnType<typeof getAdminClient>,
) {
  // Fetch question
  const { data: question } = await adminClient
    .from('qa_questions')
    .select('id, diyer_user_id, pricing_mode, status, accepted_bid_id, payment_method_id, stripe_customer_id, payout_status')
    .eq('id', questionId)
    .single();

  if (!question) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Question not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Only DIYer can select
  if (question.diyer_user_id !== userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Only the question owner can select a bid' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  if (question.accepted_bid_id) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'A bid has already been selected' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Fetch the bid
  const { data: bid } = await adminClient
    .from('qa_bids')
    .select('id, expert_id, proposed_price_cents, platform_fee_cents, expert_payout_cents, status')
    .eq('id', bidId)
    .eq('question_id', questionId)
    .single();

  if (!bid || bid.status !== 'pending') {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Bid not found or no longer available' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Charge the DIYer at the bid price
  let paymentIntentId: string | null = null;

  if (question.payout_status !== 'free' && bid.proposed_price_cents > 0) {
    // Apply credits first
    const { effectiveChargeCents } = await applyCredits(
      adminClient,
      userId,
      questionId,
      bid.proposed_price_cents,
    );

    if (effectiveChargeCents > 0) {
      if (!question.payment_method_id || !question.stripe_customer_id) {
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Payment method not saved. Please update your payment method.' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      try {
        const chargeResult = await chargeQAQuestion({
          amountCents: effectiveChargeCents,
          customerId: question.stripe_customer_id,
          paymentMethodId: question.payment_method_id,
          metadata: {
            qa_question_id: questionId,
            qa_bid_id: bidId,
            type: 'qa_bid_accepted',
          },
        });
        paymentIntentId = chargeResult.paymentIntentId;
      } catch (chargeErr) {
        logger.error('Failed to charge on bid select', chargeErr, { questionId, bidId });
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Payment failed. Please check your payment method.' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }
  }

  const now = new Date();
  const claimExpiresAt = new Date(now.getTime() + CLAIM_EXPIRY_HOURS * 60 * 60 * 1000);

  // Accept the bid and claim the question
  await adminClient
    .from('qa_bids')
    .update({ status: 'accepted', updated_at: now.toISOString() })
    .eq('id', bidId);

  // Reject other pending bids
  await adminClient
    .from('qa_bids')
    .update({ status: 'rejected', updated_at: now.toISOString() })
    .eq('question_id', questionId)
    .neq('id', bidId)
    .eq('status', 'pending');

  // Update question: assign expert, set price from bid, mark claimed
  await adminClient
    .from('qa_questions')
    .update({
      expert_id: bid.expert_id,
      accepted_bid_id: bidId,
      status: 'claimed',
      claimed_at: now.toISOString(),
      claim_expires_at: claimExpiresAt.toISOString(),
      price_cents: bid.proposed_price_cents,
      platform_fee_cents: bid.platform_fee_cents,
      expert_payout_cents: bid.expert_payout_cents,
      payment_intent_id: paymentIntentId,
      updated_at: now.toISOString(),
    })
    .eq('id', questionId);

  // Notify accepted expert
  const { data: acceptedExpert } = await adminClient
    .from('expert_profiles')
    .select('user_id')
    .eq('id', bid.expert_id)
    .single();

  if (acceptedExpert) {
    await createNotification({
      userId: acceptedExpert.user_id,
      type: 'qa_bid_accepted',
      title: 'Your proposal was accepted!',
      body: `You've been selected to answer this question. You'll earn $${(bid.expert_payout_cents / 100).toFixed(2)}.`,
      link: `/marketplace/qa/${questionId}`,
    });
  }

  // Notify rejected experts
  const { data: rejectedBids } = await adminClient
    .from('qa_bids')
    .select('expert_id')
    .eq('question_id', questionId)
    .eq('status', 'rejected');

  if (rejectedBids) {
    for (const rb of rejectedBids) {
      const { data: rejectedExpert } = await adminClient
        .from('expert_profiles')
        .select('user_id')
        .eq('id', rb.expert_id)
        .single();

      if (rejectedExpert) {
        await createNotification({
          userId: rejectedExpert.user_id,
          type: 'qa_bid_rejected',
          title: 'Another expert was selected',
          body: 'The DIYer chose a different proposal for this question.',
          link: `/experts/dashboard/qa`,
        });
      }
    }
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({
      success: true,
      acceptedBidId: bidId,
      expertId: bid.expert_id,
      priceCents: bid.proposed_price_cents,
      paymentIntentId,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
