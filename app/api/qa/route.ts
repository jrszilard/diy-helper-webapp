import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { SubmitQuestionSchema } from '@/lib/marketplace/validation';
import { calculateQAPrice, isFirstQuestionFree, releaseExpiredClaims } from '@/lib/marketplace/qa-helpers';
import { buildExpertContext } from '@/lib/marketplace/context-builder';
import { scoreDifficulty } from '@/lib/marketplace/difficulty-scorer';
import { getQuestionPricing } from '@/lib/marketplace/pricing-engine';
import { shouldEnterBiddingMode, calculateBidDeadline } from '@/lib/marketplace/bidding';
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

    // Determine question mode
    const questionMode = parsed.data.targetExpertId ? 'direct' : 'pool';

    // Build AI context if reportId provided
    let aiContext = null;
    if (parsed.data.reportId) {
      aiContext = await buildExpertContext(auth.supabaseClient, parsed.data.reportId);
    }

    // Score difficulty and check for bidding mode
    const difficulty = scoreDifficulty({
      context: aiContext as import('@/lib/marketplace/types').ExpertContext | null,
      category: parsed.data.category,
      questionText: parsed.data.questionText,
      photoCount: parsed.data.photoUrls?.length || 0,
    });

    const isBiddingMode = !firstFree && questionMode === 'pool' && shouldEnterBiddingMode(difficulty, auth.userId);

    // If dynamic pricing is on, use it for the initial price (even for bidding mode as a reference)
    let dynamicPricing: { priceCents: number; platformFeeCents: number; expertPayoutCents: number } | null = null;
    if (aiContext) {
      const pricing = getQuestionPricing({
        context: aiContext as import('@/lib/marketplace/types').ExpertContext,
        category: parsed.data.category,
        questionText: parsed.data.questionText,
        photoCount: parsed.data.photoUrls?.length || 0,
        userId: auth.userId,
      });
      if (pricing.tier !== 'legacy') {
        dynamicPricing = {
          priceCents: pricing.priceCents,
          platformFeeCents: pricing.platformFeeCents,
          expertPayoutCents: pricing.expertPayoutCents,
        };
      }
    }

    // Get Stripe customer ID from the user's subscription record (set during setup-payment)
    let stripeCustomerId: string | null = null;
    if (!firstFree && parsed.data.paymentMethodId) {
      const adminClient = getAdminClient();
      const { data: sub } = await adminClient
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', auth.userId)
        .single();
      stripeCustomerId = sub?.stripe_customer_id || null;
    }

    // Determine final pricing (dynamic > legacy)
    const finalPrice = firstFree ? 0 : (dynamicPricing?.priceCents ?? priceCents);
    const finalPlatformFee = firstFree ? 0 : (dynamicPricing?.platformFeeCents ?? platformFeeCents);
    const finalExpertPayout = firstFree ? 0 : (dynamicPricing?.expertPayoutCents ?? expertPayoutCents);

    // Insert the question — NO charge at submission. Charge happens at claim (or bid select).
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
        price_cents: finalPrice,
        platform_fee_cents: finalPlatformFee,
        expert_payout_cents: finalExpertPayout,
        status: 'open',
        payment_intent_id: null, // charge happens at claim time (or bid select)
        payment_method_id: firstFree ? null : (parsed.data.paymentMethodId || null),
        stripe_customer_id: firstFree ? null : stripeCustomerId,
        question_mode: questionMode,
        target_expert_id: parsed.data.targetExpertId || null,
        payout_status: firstFree ? 'free' : 'pending',
        diyer_city: parsed.data.diyerCity || null,
        diyer_state: parsed.data.diyerState || null,
        // Bidding mode fields
        pricing_mode: isBiddingMode ? 'bidding' : 'fixed',
        bid_deadline: isBiddingMode ? calculateBidDeadline() : null,
        difficulty_score: difficulty.score,
        price_tier: difficulty.tier,
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

    // Notify experts based on mode
    const adminClient = getAdminClient();

    if (questionMode === 'direct' && parsed.data.targetExpertId) {
      // Direct mode: notify only the target expert
      const { data: targetExpert } = await adminClient
        .from('expert_profiles')
        .select('user_id')
        .eq('id', parsed.data.targetExpertId)
        .single();

      if (targetExpert) {
        await createNotification({
          userId: targetExpert.user_id,
          type: 'qa_question_posted',
          title: 'You have a direct question',
          body: parsed.data.questionText.slice(0, 100),
          link: `/experts/dashboard/qa`,
        });
      }
    } else {
      // Pool mode: notify all matching experts
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
              type: isBiddingMode ? 'qa_bidding_open' : 'qa_question_posted',
              title: isBiddingMode ? 'New specialist question — submit your proposal' : 'New question in your specialty',
              body: parsed.data.questionText.slice(0, 100),
              link: `/experts/dashboard/qa`,
            });
          }
        }
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        id: question.id,
        isFree: firstFree,
        priceCents: firstFree ? 0 : finalPrice,
        questionMode,
        pricingMode: isBiddingMode ? 'bidding' : 'fixed',
        difficultyScore: difficulty.score,
        priceTier: difficulty.tier,
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

    // Release any expired claims on-demand
    try { await releaseExpiredClaims(getAdminClient()); } catch { /* best-effort */ }

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
          questionMode: q.question_mode,
          targetExpertId: q.target_expert_id,
          markedNotHelpful: q.marked_not_helpful,
          refundId: q.refund_id,
          creditAppliedCents: q.credit_applied_cents,
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
