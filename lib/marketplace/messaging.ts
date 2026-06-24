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
  // can't mass-DM every expert. Messages attached to a marketplace interaction
  // (qa/consultation/rfp/bid) are exempt, as are replies to an existing thread.
  const hasContext = !!(params.qaQuestionId || params.consultationId || params.rfpId || params.bidId);
  if (!hasContext) {
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
