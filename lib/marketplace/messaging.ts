import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';
import { sanitizeContentDetailed } from '@/lib/marketplace/messaging-utils';
import { logActivity } from '@/lib/marketplace/fraud-detection';

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
