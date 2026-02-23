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

    // Get the question
    const { data: question, error: fetchError } = await auth.supabaseClient
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
        JSON.stringify({ error: 'Only the question owner can accept an answer' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (question.status !== 'answered') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question is not in answered status' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const now = new Date().toISOString();
    const adminClient = getAdminClient();

    // Update question status
    const { error: updateError } = await adminClient
      .from('qa_questions')
      .update({
        status: 'accepted',
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to accept answer', updateError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to accept answer' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Transfer payment to expert if they have a Stripe account
    if (question.expert_id && question.expert_payout_cents > 0) {
      const expertProfile = await getExpertById(adminClient, question.expert_id);

      if (expertProfile?.stripeConnectAccountId && expertProfile.stripeOnboardingComplete) {
        try {
          await transferToExpert({
            amountCents: question.expert_payout_cents,
            destinationAccountId: expertProfile.stripeConnectAccountId,
            transferGroup: `qa_${id}`,
            metadata: { qa_question_id: id },
          });

          // Create payment transaction record
          await adminClient
            .from('payment_transactions')
            .insert({
              qa_question_id: id,
              expert_id: question.expert_id,
              amount_cents: question.expert_payout_cents,
              type: 'expert_payout',
              status: 'succeeded',
              stripe_payment_intent_id: question.payment_intent_id,
            });
        } catch (transferError) {
          logger.error('Failed to transfer payment to expert', transferError, { questionId: id });
          // Don't fail the accept - the payout can be retried
        }
      }
    }

    // Notify expert
    if (question.expert_id) {
      const expertProfile = await getExpertById(adminClient, question.expert_id);
      if (expertProfile) {
        await createNotification({
          userId: expertProfile.userId,
          type: 'qa_answer_accepted',
          title: 'Your answer was accepted',
          body: question.expert_payout_cents > 0
            ? `You earned $${(question.expert_payout_cents / 100).toFixed(2)}`
            : 'Great job helping a fellow DIYer!',
          link: `/experts/qa/${id}`,
        });
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A accept error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
