import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';
import { sanitizeContentDetailed } from '@/lib/marketplace/messaging-utils';
import { logActivity } from '@/lib/marketplace/fraud-detection';

// Max distinct recipients a sender may open NEW, context-free conversations with
// per rolling 24h. Bounds the "mass-DM every harvested expert" spam/phishing vector.
const COLD_DM_NEW_RECIPIENT_DAILY_CAP = 10;

export class ColdDmLimitError extends Error {
  constructor(message = 'Daily new-conversation limit reached. Please try again tomorrow.') {
    super(message);
    this.name = 'ColdDmLimitError';
  }
}

/**
 * Pure decision: should a message be blocked by the cold-DM cap?
 * Contextual messages (tied to a Q&A/consultation/RFP/bid) and replies within an
 * existing conversation are ALWAYS allowed; only context-free first-contact
 * messages to brand-new recipients count against the daily cap.
 */
export function exceedsColdDmCap(opts: {
  hasContext: boolean;
  hasExistingRelationship: boolean;
  distinctNewRecipientsToday: number;
  cap: number;
}): boolean {
  if (opts.hasContext) return false;
  if (opts.hasExistingRelationship) return false;
  return opts.distinctNewRecipientsToday >= opts.cap;
}

/** Map expert_profiles.id[] -> user_id[]. */
async function expertUserIds(
  adminClient: SupabaseClient,
  expertIds: (string | null | undefined)[],
): Promise<string[]> {
  const ids = expertIds.filter((x): x is string => !!x);
  if (ids.length === 0) return [];
  const { data } = await adminClient
    .from('expert_profiles')
    .select('user_id')
    .in('id', ids);
  return (data || []).map((r: { user_id: string }) => r.user_id);
}

/**
 * A context id (qa/consultation/rfp/bid) only EXEMPTS a message from the cold-DM cap
 * if it is real AND links BOTH the sender and the recipient. Without this check the
 * exemption is trivially bypassed: attach any UUID -> `hasContext` was true -> cap
 * skipped -> mass-DM every harvested expert. The participant set for each context is
 * the DIYer plus every expert who engaged (claimed or bid), resolved to user ids.
 * Uses the admin client deliberately — this is an authorization check that must see
 * rows regardless of the caller's RLS scope.
 */
export async function contextLinksBothParties(
  adminClient: SupabaseClient,
  p: {
    senderUserId: string;
    recipientUserId: string;
    qaQuestionId?: string;
    consultationId?: string;
    rfpId?: string;
    bidId?: string;
  },
): Promise<boolean> {
  if (p.senderUserId === p.recipientUserId) return false;
  const involvesBoth = (participants: (string | null | undefined)[]) => {
    const set = new Set(participants.filter(Boolean) as string[]);
    return set.has(p.senderUserId) && set.has(p.recipientUserId);
  };

  // Q&A question: DIYer + claimed expert + every bidding expert.
  if (p.qaQuestionId) {
    const { data: q } = await adminClient
      .from('qa_questions')
      .select('diyer_user_id, expert_id')
      .eq('id', p.qaQuestionId)
      .maybeSingle();
    if (q) {
      const { data: bids } = await adminClient
        .from('qa_bids')
        .select('expert_id')
        .eq('question_id', p.qaQuestionId);
      const experts = await expertUserIds(adminClient, [
        q.expert_id,
        ...(bids || []).map((b: { expert_id: string }) => b.expert_id),
      ]);
      if (involvesBoth([q.diyer_user_id, ...experts])) return true;
    }
  }

  // Consultation: DIYer + booked expert.
  if (p.consultationId) {
    const { data: c } = await adminClient
      .from('consultations')
      .select('diyer_user_id, expert_id')
      .eq('id', p.consultationId)
      .maybeSingle();
    if (c) {
      const experts = await expertUserIds(adminClient, [c.expert_id]);
      if (involvesBoth([c.diyer_user_id, ...experts])) return true;
    }
  }

  // RFP: DIYer + every bidding expert.
  if (p.rfpId) {
    const { data: r } = await adminClient
      .from('project_rfps')
      .select('diyer_user_id')
      .eq('id', p.rfpId)
      .maybeSingle();
    if (r) {
      const { data: pbids } = await adminClient
        .from('project_bids')
        .select('expert_id')
        .eq('rfp_id', p.rfpId);
      const experts = await expertUserIds(
        adminClient,
        (pbids || []).map((b: { expert_id: string }) => b.expert_id),
      );
      if (involvesBoth([r.diyer_user_id, ...experts])) return true;
    }
  }

  // Bid: resolve to its parent question/RFP DIYer + the bidding expert (qa or project).
  if (p.bidId) {
    const { data: qb } = await adminClient
      .from('qa_bids')
      .select('question_id, expert_id')
      .eq('id', p.bidId)
      .maybeSingle();
    if (qb) {
      const { data: q } = await adminClient
        .from('qa_questions')
        .select('diyer_user_id')
        .eq('id', qb.question_id)
        .maybeSingle();
      const experts = await expertUserIds(adminClient, [qb.expert_id]);
      if (q && involvesBoth([q.diyer_user_id, ...experts])) return true;
    }
    const { data: pb } = await adminClient
      .from('project_bids')
      .select('rfp_id, expert_id')
      .eq('id', p.bidId)
      .maybeSingle();
    if (pb) {
      const { data: r } = await adminClient
        .from('project_rfps')
        .select('diyer_user_id')
        .eq('id', pb.rfp_id)
        .maybeSingle();
      const experts = await expertUserIds(adminClient, [pb.expert_id]);
      if (r && involvesBoth([r.diyer_user_id, ...experts])) return true;
    }
  }

  return false;
}

export async function sendMessage(params: {
  adminClient: SupabaseClient;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  attachments?: string[];
  qaQuestionId?: string;
  consultationId?: string;
  rfpId?: string;
  bidId?: string;
}): Promise<void> {
  // Anti-spam: throttle context-free first-contact messages so a single account
  // can't mass-DM every expert. A message is exempt from the cap only if it is tied
  // to a marketplace interaction (qa/consultation/rfp/bid) that ACTUALLY links the
  // sender and recipient, or if it's a reply within an existing thread. A claimed
  // context id that doesn't link both parties (e.g. an attacker attaching a random
  // or self-owned UUID to spam strangers) does NOT exempt — it's treated as a cold DM.
  const claimsContext = !!(params.qaQuestionId || params.consultationId || params.rfpId || params.bidId);
  const hasVerifiedContext = claimsContext && await contextLinksBothParties(params.adminClient, {
    senderUserId: params.senderUserId,
    recipientUserId: params.recipientUserId,
    qaQuestionId: params.qaQuestionId,
    consultationId: params.consultationId,
    rfpId: params.rfpId,
    bidId: params.bidId,
  });
  if (!hasVerifiedContext) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: priorWithRecipient }, { data: recentSent }] = await Promise.all([
      params.adminClient
        .from('marketplace_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_user_id', params.senderUserId)
        .eq('recipient_user_id', params.recipientUserId),
      params.adminClient
        .from('marketplace_messages')
        .select('recipient_user_id')
        .eq('sender_user_id', params.senderUserId)
        .gte('created_at', since),
    ]);
    const distinctNewRecipientsToday = new Set(
      (recentSent || []).map((r: { recipient_user_id: string }) => r.recipient_user_id),
    ).size;
    if (
      exceedsColdDmCap({
        hasContext: false,
        hasExistingRelationship: (priorWithRecipient ?? 0) > 0,
        distinctNewRecipientsToday,
        cap: COLD_DM_NEW_RECIPIENT_DAILY_CAP,
      })
    ) {
      throw new ColdDmLimitError();
    }
  }

  const result = sanitizeContentDetailed(params.content);

  await params.adminClient
    .from('marketplace_messages')
    .insert({
      sender_user_id: params.senderUserId,
      recipient_user_id: params.recipientUserId,
      content: result.sanitized,
      qa_question_id: params.qaQuestionId || null,
      consultation_id: params.consultationId || null,
      rfp_id: params.rfpId || null,
      bid_id: params.bidId || null,
      attachments: params.attachments || [],
      is_read: false,
    });

  // Log sanitization events for fraud review
  if (result.wasFlagged) {
    try {
      await logActivity(params.adminClient, {
        eventType: 'sanitization_trigger',
        severity: result.flags.length >= 3 ? 'high' : result.flags.length >= 2 ? 'medium' : 'low',
        userId: params.senderUserId,
        questionId: params.qaQuestionId,
        consultationId: params.consultationId,
        description: `Contact info detected and sanitized: ${result.flags.map(f => f.type).join(', ')}`,
        originalContent: params.content,
        metadata: { flags: result.flags, context: 'marketplace_message' },
      });
    } catch {
      // Best-effort logging — don't block the message
    }
  }

  await createNotification({
    userId: params.recipientUserId,
    type: 'message_received',
    title: 'You have a new message',
    body: result.sanitized.length > 100 ? result.sanitized.slice(0, 100) + '...' : result.sanitized,
    link: '/messages',
  });
}
