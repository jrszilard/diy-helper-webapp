import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertById } from '@/lib/marketplace/expert-helpers';
import { transferToExpert } from '@/lib/stripe';
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
    const adminClient = getAdminClient();

    // Get the question
    const { data: question, error: fetchError } = await adminClient
      .from('qa_questions')
      .select('*')
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
        JSON.stringify({ error: 'Only the question owner can mark as not helpful' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.status !== 'answered') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question must be in answered status' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.marked_not_helpful) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Already marked as not helpful' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const now = new Date().toISOString();

    // Credit = what the DIYer actually paid (price minus any credits already used)
    const creditAmountCents = question.price_cents - (question.credit_applied_cents || 0);

    // Update question
    await adminClient
      .from('qa_questions')
      .update({
        marked_not_helpful: true,
        not_helpful_at: now,
        status: 'accepted', // close out the question
        updated_at: now,
      })
      .eq('id', id);

    // Give DIYer platform credit
    if (creditAmountCents > 0) {
      // Upsert user_credits
      const { data: existing } = await adminClient
        .from('user_credits')
        .select('balance_cents')
        .eq('user_id', auth.userId)
        .single();

      if (existing) {
        await adminClient
          .from('user_credits')
          .update({
            balance_cents: existing.balance_cents + creditAmountCents,
            updated_at: now,
          })
          .eq('user_id', auth.userId);
      } else {
        await adminClient
          .from('user_credits')
          .insert({
            user_id: auth.userId,
            balance_cents: creditAmountCents,
            updated_at: now,
          });
      }

      // Record credit transaction
      await adminClient
        .from('credit_transactions')
        .insert({
          user_id: auth.userId,
          amount_cents: creditAmountCents,
          reason: 'not_helpful',
          qa_question_id: id,
        });
    }

    // Transfer 50% of expert payout (partial pay for work done)
    if (question.expert_id && question.expert_payout_cents > 0) {
      const partialPayout = Math.round(question.expert_payout_cents * 0.5);
      const expertProfile = await getExpertById(adminClient, question.expert_id);

      if (expertProfile?.stripeConnectAccountId && expertProfile.stripeOnboardingComplete && partialPayout > 0) {
        try {
          await transferToExpert({
            amountCents: partialPayout,
            destinationAccountId: expertProfile.stripeConnectAccountId,
            transferGroup: `qa_${id}_not_helpful`,
            metadata: { qa_question_id: id, reason: 'not_helpful_partial' },
          });
        } catch (transferError) {
          logger.error('Failed to transfer partial payment for not-helpful', transferError, { questionId: id });
        }
      }

      // Notify expert
      if (expertProfile) {
        await createNotification({
          userId: expertProfile.userId,
          type: 'qa_not_helpful',
          title: 'Answer marked as not helpful',
          body: partialPayout > 0
            ? `You received a partial payment of $${(partialPayout / 100).toFixed(2)}`
            : 'The DIYer found your answer unhelpful.',
          link: `/marketplace/qa/${id}`,
        });
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ creditAddedCents: creditAmountCents }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Not helpful error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
