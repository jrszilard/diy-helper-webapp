import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import type { NotificationType } from '@/lib/marketplace/types';
import * as emailTemplates from '@/lib/email-templates';

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
      metadata: params.metadata || {},
      is_read: false,
    });

  if (error) {
    logger.error('Failed to create notification', error, { userId: params.userId, type: params.type });
    return;
  }

  // Send email notification (non-blocking)
  if (process.env.RESEND_API_KEY) {
    sendEmailNotification(params).catch(err => {
      logger.error('Failed to send email notification', err, { userId: params.userId, type: params.type });
    });
  }
}

async function sendEmailNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const adminClient = getAdminClient();

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(params.userId);
  if (userError || !userData?.user?.email) return;

  const email = userData.user.email;
  const templateParams = { title: params.title, body: params.body, link: params.link };

  let content: { subject: string; html: string } | null = null;

  switch (params.type) {
    case 'qa_question_claimed':
      content = emailTemplates.qaQuestionClaimed(templateParams);
      break;
    case 'qa_answer_received':
      content = emailTemplates.qaAnswerReceived(templateParams);
      break;
    case 'qa_answer_accepted':
      content = emailTemplates.qaAnswerAccepted(templateParams);
      break;
    case 'message_received':
      content = emailTemplates.messageReceived(templateParams);
      break;
    case 'payment_received':
      content = emailTemplates.paymentReceived(templateParams);
      break;
    default:
      return;
  }

  if (!content) return;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'DIY Helper <notifications@diyhelper.com>',
      to: email,
      subject: content.subject,
      html: content.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.warn('Resend API error', { status: res.status, body: text });
  }
}
