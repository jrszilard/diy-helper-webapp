import { SupabaseClient } from '@supabase/supabase-js';
import { QA_PRICING, CLAIM_EXPIRY_HOURS, AUTO_ACCEPT_HOURS } from '@/lib/marketplace/constants';
import { refundQACharge } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

const CODE_SPECIFIC_CATEGORIES = ['electrical', 'plumbing', 'hvac', 'roofing', 'concrete'];

export function calculateQAPrice(category: string): {
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
} {
  const priceCents = CODE_SPECIFIC_CATEGORIES.includes(category)
    ? QA_PRICING.codeSpecificCents
    : QA_PRICING.generalCents;

  const platformFeeCents = Math.round(priceCents * QA_PRICING.platformFeeRate);
  const expertPayoutCents = priceCents - platformFeeCents;

  return { priceCents, platformFeeCents, expertPayoutCents };
}

export async function isFirstQuestionFree(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count } = await supabaseClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('diyer_user_id', userId);

  return (count ?? 0) === 0;
}

/**
 * Release expired claims. Handles both pool and direct modes:
 * - Pool: refund if charged, reset to 'open', re-notify experts
 * - Direct: refund if charged, set to 'expired', notify DIYer
 */
export async function releaseExpiredClaims(adminClient: SupabaseClient): Promise<{
  released: number;
  refunded: number;
  expired: number;
}> {
  const now = new Date().toISOString();
  let released = 0;
  let refunded = 0;
  let expired = 0;

  // Fetch all expired claims
  const { data: expiredClaims, error } = await adminClient
    .from('qa_questions')
    .select('id, question_mode, payment_intent_id, payout_status, diyer_user_id, category, question_text, target_expert_id')
    .eq('status', 'claimed')
    .lt('claim_expires_at', now);

  if (error || !expiredClaims) return { released, refunded, expired };

  for (const q of expiredClaims) {
    // Refund if a charge was made
    if (q.payment_intent_id && q.payout_status !== 'free') {
      try {
        const { refundId } = await refundQACharge(q.payment_intent_id, {
          reason: 'claim_expired',
          qa_question_id: q.id,
        });
        await adminClient
          .from('qa_questions')
          .update({ refund_id: refundId, refunded_at: now })
          .eq('id', q.id);
        refunded++;
      } catch (err) {
        logger.error('Failed to refund expired claim', err, { questionId: q.id });
      }
    }

    if (q.question_mode === 'direct') {
      // Direct mode: expire the question
      await adminClient
        .from('qa_questions')
        .update({
          status: 'expired',
          expert_id: null,
          claimed_at: null,
          claim_expires_at: null,
          payment_intent_id: null,
          updated_at: now,
        })
        .eq('id', q.id);

      // Notify DIYer
      await createNotification({
        userId: q.diyer_user_id,
        type: 'qa_claim_expired',
        title: 'Your direct question expired',
        body: 'The expert did not respond in time. You were not charged.',
        link: `/marketplace/qa/${q.id}`,
      });

      expired++;
    } else {
      // Pool mode: reset to open, re-notify experts
      await adminClient
        .from('qa_questions')
        .update({
          status: 'open',
          expert_id: null,
          claimed_at: null,
          claim_expires_at: null,
          payment_intent_id: null,
          updated_at: now,
        })
        .eq('id', q.id);

      // Re-notify matching experts
      const { data: matchingExperts } = await adminClient
        .from('expert_specialties')
        .select('expert_id, expert_profiles!inner(user_id, is_active, is_available)')
        .eq('specialty', q.category)
        .eq('expert_profiles.is_active', true)
        .eq('expert_profiles.is_available', true);

      if (matchingExperts) {
        for (const expert of matchingExperts) {
          const profile = expert.expert_profiles as unknown as { user_id: string };
          if (profile.user_id !== q.diyer_user_id) {
            await createNotification({
              userId: profile.user_id,
              type: 'qa_question_posted',
              title: 'Question available again',
              body: (q.question_text || '').slice(0, 100),
              link: `/experts/dashboard/qa`,
            });
          }
        }
      }

      released++;
    }
  }

  return { released, refunded, expired };
}

/**
 * Auto-accept answered questions past the deadline.
 */
export async function autoAcceptAnswered(adminClient: SupabaseClient): Promise<number> {
  const deadline = new Date(Date.now() - AUTO_ACCEPT_HOURS * 60 * 60 * 1000).toISOString();

  const { data: questions } = await adminClient
    .from('qa_questions')
    .select('id')
    .eq('status', 'answered')
    .lt('answered_at', deadline);

  if (!questions) return 0;

  let accepted = 0;
  for (const q of questions) {
    const { error } = await adminClient
      .from('qa_questions')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', q.id)
      .eq('status', 'answered');

    if (!error) accepted++;
  }
  return accepted;
}

export async function checkAutoAccept(
  adminClient: SupabaseClient,
  questionId: string,
): Promise<boolean> {
  const { data } = await adminClient
    .from('qa_questions')
    .select('status, answered_at')
    .eq('id', questionId)
    .single();

  if (!data || data.status !== 'answered' || !data.answered_at) return false;

  const answeredAt = new Date(data.answered_at);
  const autoAcceptDeadline = new Date(answeredAt.getTime() + AUTO_ACCEPT_HOURS * 60 * 60 * 1000);

  if (new Date() < autoAcceptDeadline) return false;

  const { error } = await adminClient
    .from('qa_questions')
    .update({ status: 'accepted' })
    .eq('id', questionId)
    .eq('status', 'answered');

  return !error;
}

/**
 * Apply user credits toward a question. Deducts min(balance, priceCents)
 * and records a credit transaction.
 */
export async function applyCredits(
  adminClient: SupabaseClient,
  userId: string,
  questionId: string,
  priceCents: number,
): Promise<{ effectiveChargeCents: number; creditAppliedCents: number }> {
  // Get current balance
  const { data: credits } = await adminClient
    .from('user_credits')
    .select('balance_cents')
    .eq('user_id', userId)
    .single();

  const balance = credits?.balance_cents ?? 0;
  if (balance <= 0) {
    return { effectiveChargeCents: priceCents, creditAppliedCents: 0 };
  }

  const creditAppliedCents = Math.min(balance, priceCents);
  const effectiveChargeCents = priceCents - creditAppliedCents;

  // Deduct credits
  await adminClient
    .from('user_credits')
    .update({
      balance_cents: balance - creditAppliedCents,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Record transaction
  await adminClient
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount_cents: -creditAppliedCents,
      reason: 'credit_used',
      qa_question_id: questionId,
    });

  // Store on question
  await adminClient
    .from('qa_questions')
    .update({ credit_applied_cents: creditAppliedCents })
    .eq('id', questionId);

  return { effectiveChargeCents, creditAppliedCents };
}
