import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function sanitizeContent(content: string): string {
  return content
    .replace(PHONE_REGEX, '[phone removed]')
    .replace(EMAIL_REGEX, '[email removed]');
}

export async function sendMessage(params: {
  adminClient: SupabaseClient;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  qaQuestionId?: string;
  consultationId?: string;
  rfpId?: string;
  bidId?: string;
}): Promise<void> {
  const sanitized = sanitizeContent(params.content);

  await params.adminClient
    .from('marketplace_messages')
    .insert({
      sender_user_id: params.senderUserId,
      recipient_user_id: params.recipientUserId,
      content: sanitized,
      qa_question_id: params.qaQuestionId || null,
      consultation_id: params.consultationId || null,
      rfp_id: params.rfpId || null,
      bid_id: params.bidId || null,
      attachments: [],
      is_read: false,
    });

  await createNotification({
    userId: params.recipientUserId,
    type: 'message_received',
    title: 'You have a new message',
    body: sanitized.length > 100 ? sanitized.slice(0, 100) + '...' : sanitized,
    link: '/dashboard/messages',
  });
}
