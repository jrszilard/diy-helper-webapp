import { SupabaseClient } from '@supabase/supabase-js';
import { QA_PRICING } from '@/lib/marketplace/constants';

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

export async function releaseExpiredClaims(adminClient: SupabaseClient): Promise<void> {
  await adminClient
    .from('qa_questions')
    .update({
      status: 'open',
      expert_id: null,
      claimed_at: null,
      claim_expires_at: null,
    })
    .eq('status', 'claimed')
    .lt('claim_expires_at', new Date().toISOString());
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
  const autoAcceptDeadline = new Date(answeredAt.getTime() + 24 * 60 * 60 * 1000);

  if (new Date() < autoAcceptDeadline) return false;

  const { error } = await adminClient
    .from('qa_questions')
    .update({ status: 'accepted' })
    .eq('id', questionId)
    .eq('status', 'answered');

  return !error;
}
