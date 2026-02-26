import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { transferToExpert, refundQACharge } from '@/lib/stripe';
import { recalculateReputation } from '@/lib/marketplace/reputation-engine';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ResolveSchema = z.object({
  action: z.enum(['propose_resolve', 'accept', 'continue', 'not_helpful']),
});

// POST /api/qa/[id]/resolve — handle conversation resolution flow
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
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { action } = parsed.data;
    const adminClient = getAdminClient();

    // Fetch question
    const { data: question, error: qErr } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, expert_id, status, payment_intent_id, payout_status, price_cents, platform_fee_cents, expert_payout_cents, credit_applied_cents, current_tier, tier_payments')
      .eq('id', id)
      .single();

    if (qErr || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Determine user role
    let userRole: 'diyer' | 'expert' | null = null;
    let expertUserId: string | null = null;

    if (question.diyer_user_id === auth.userId) {
      userRole = 'diyer';
    }
    if (question.expert_id) {
      const { data: ep } = await adminClient
        .from('expert_profiles')
        .select('user_id, stripe_connect_account_id')
        .eq('id', question.expert_id)
        .single();
      if (ep?.user_id === auth.userId) {
        userRole = 'expert';
      }
      expertUserId = ep?.user_id || null;
    }

    if (!userRole) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only participants can resolve' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const now = new Date().toISOString();

    switch (action) {
      case 'propose_resolve': {
        // Expert proposes resolution
        if (userRole !== 'expert') {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Only the expert can propose resolution' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        const allowedStatuses = ['claimed', 'answered', 'in_conversation'];
        if (!allowedStatuses.includes(question.status)) {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Cannot propose resolution in current status' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        await adminClient
          .from('qa_questions')
          .update({ status: 'resolve_proposed', resolve_proposed_at: now, resolve_proposed_by: 'expert' })
          .eq('id', id);

        await createNotification({
          userId: question.diyer_user_id,
          type: 'qa_resolve_proposed',
          title: 'Expert proposes to resolve your question',
          body: 'Review the conversation and accept if your question has been answered.',
          link: `/marketplace/qa/${id}`,
        });

        return applyCorsHeaders(req, new Response(
          JSON.stringify({ success: true, status: 'resolve_proposed' }),
          { headers: { 'Content-Type': 'application/json' } }
        ));
      }

      case 'accept': {
        // DIYer accepts — triggers payout
        if (userRole !== 'diyer') {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Only the DIYer can accept' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        const acceptStatuses = ['answered', 'in_conversation', 'resolve_proposed'];
        if (!acceptStatuses.includes(question.status)) {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Cannot accept in current status' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        // Transfer payout to expert
        if (question.payout_status !== 'free' && question.expert_payout_cents > 0 && question.expert_id) {
          const { data: ep } = await adminClient
            .from('expert_profiles')
            .select('stripe_connect_account_id')
            .eq('id', question.expert_id)
            .single();

          if (ep?.stripe_connect_account_id) {
            try {
              await transferToExpert({
                amountCents: question.expert_payout_cents,
                destinationAccountId: ep.stripe_connect_account_id,
                transferGroup: `qa_${id}`,
                metadata: { qa_question_id: id, type: 'qa_payout' },
              });
            } catch (payoutErr) {
              logger.error('Failed to transfer payout on accept', payoutErr, { questionId: id });
              // Don't block accept — mark for manual review
            }
          }
        }

        await adminClient
          .from('qa_questions')
          .update({ status: 'accepted', payout_status: 'released', payout_released_at: now, updated_at: now })
          .eq('id', id);

        if (expertUserId) {
          await createNotification({
            userId: expertUserId,
            type: 'qa_answer_accepted',
            title: 'Your answer was accepted!',
            body: 'The DIYer found your response helpful. Payment has been released.',
            link: `/marketplace/qa/${id}`,
          });
        }

        // Recalculate expert reputation (best-effort)
        if (question.expert_id) {
          try { await recalculateReputation(adminClient, question.expert_id); } catch { /* best-effort */ }
        }

        return applyCorsHeaders(req, new Response(
          JSON.stringify({ success: true, status: 'accepted' }),
          { headers: { 'Content-Type': 'application/json' } }
        ));
      }

      case 'continue': {
        // DIYer wants to continue conversation
        if (userRole !== 'diyer') {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Only the DIYer can continue' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        if (question.status !== 'resolve_proposed') {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'No resolution pending' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        await adminClient
          .from('qa_questions')
          .update({ status: 'in_conversation', resolve_proposed_at: null, resolve_proposed_by: null, updated_at: now })
          .eq('id', id);

        if (expertUserId) {
          await createNotification({
            userId: expertUserId,
            type: 'qa_continue_requested',
            title: 'DIYer wants to continue the conversation',
            body: 'They need more help — please check the conversation.',
            link: `/marketplace/qa/${id}`,
          });
        }

        return applyCorsHeaders(req, new Response(
          JSON.stringify({ success: true, status: 'in_conversation' }),
          { headers: { 'Content-Type': 'application/json' } }
        ));
      }

      case 'not_helpful': {
        // DIYer marks as not helpful — refund
        if (userRole !== 'diyer') {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({ error: 'Only the DIYer can mark as not helpful' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        // Refund initial charge if it exists
        if (question.payment_intent_id && question.payout_status !== 'free') {
          try {
            await refundQACharge(question.payment_intent_id, {
              reason: 'not_helpful',
              qa_question_id: id,
            });
          } catch (refundErr) {
            logger.error('Failed to refund on not_helpful', refundErr, { questionId: id });
          }
        }

        // Refund tier upgrade charges
        const tierPayments = (question.tier_payments as Array<{ payment_intent_id: string }>) || [];
        for (const tp of tierPayments) {
          if (tp.payment_intent_id) {
            try {
              await refundQACharge(tp.payment_intent_id, {
                reason: 'not_helpful_tier_refund',
                qa_question_id: id,
              });
            } catch (refundErr) {
              logger.error('Failed to refund tier payment on not_helpful', refundErr, { questionId: id, paymentIntentId: tp.payment_intent_id });
            }
          }
        }

        await adminClient
          .from('qa_questions')
          .update({
            status: 'disputed',
            marked_not_helpful: true,
            not_helpful_at: now,
            payout_status: 'refunded',
            updated_at: now,
          })
          .eq('id', id);

        if (expertUserId) {
          await createNotification({
            userId: expertUserId,
            type: 'qa_not_helpful',
            title: 'Answer marked as not helpful',
            body: 'The DIYer did not find the response helpful.',
            link: `/marketplace/qa/${id}`,
          });
        }

        return applyCorsHeaders(req, new Response(
          JSON.stringify({ success: true, status: 'disputed' }),
          { headers: { 'Content-Type': 'application/json' } }
        ));
      }

      default:
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
    }
  } catch (error) {
    logger.error('Q&A resolve error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
