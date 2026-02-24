import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { ThreadMessageSchema } from '@/lib/marketplace/validation';
import { sendMessage } from '@/lib/marketplace/messaging';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

/**
 * Resolve display names for a set of user IDs.
 * Checks expert_profiles first, then falls back to auth admin email.
 */
async function resolveDisplayNames(
  adminClient: ReturnType<typeof getAdminClient>,
  userIds: string[]
): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  if (userIds.length === 0) return names;

  const uniqueIds = [...new Set(userIds)];

  // Try expert_profiles first for display names
  const { data: experts } = await adminClient
    .from('expert_profiles')
    .select('user_id, display_name')
    .in('user_id', uniqueIds);

  if (experts) {
    for (const expert of experts) {
      names[expert.user_id] = expert.display_name;
    }
  }

  // For any users not found in expert_profiles, fall back to auth email
  const missingIds = uniqueIds.filter(id => !names[id]);
  for (const userId of missingIds) {
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        names[userId] = userData.user.email.split('@')[0];
      } else {
        names[userId] = 'Unknown User';
      }
    } catch {
      names[userId] = 'Unknown User';
    }
  }

  return names;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'messages');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { threadId } = await params;

    // Query messages where any context field matches the threadId
    const { data: messages, error } = await auth.supabaseClient
      .from('marketplace_messages')
      .select('*')
      .or(`qa_question_id.eq.${threadId},consultation_id.eq.${threadId},rfp_id.eq.${threadId},bid_id.eq.${threadId}`)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch thread messages', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!messages || messages.length === 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify user is a participant
    const isParticipant = messages.some(
      m => m.sender_user_id === auth.userId || m.recipient_user_id === auth.userId
    );

    if (!isParticipant) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Mark messages as read where user is recipient
    const unreadIds = messages
      .filter(m => m.recipient_user_id === auth.userId && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await auth.supabaseClient
        .from('marketplace_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }

    // Resolve display names for all participants
    const allUserIds = messages.flatMap(m => [m.sender_user_id, m.recipient_user_id]);
    const adminClient = getAdminClient();
    const displayNames = await resolveDisplayNames(adminClient, allUserIds);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        messages: messages.map(m => ({
          id: m.id,
          senderUserId: m.sender_user_id,
          senderName: displayNames[m.sender_user_id] || 'Unknown User',
          recipientUserId: m.recipient_user_id,
          recipientName: displayNames[m.recipient_user_id] || 'Unknown User',
          content: m.content,
          attachments: m.attachments || [],
          isRead: m.is_read,
          readAt: m.read_at,
          createdAt: m.created_at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Thread messages GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'messages');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { threadId } = await params;

    const body = await req.json();
    const parsed = parseRequestBody(ThreadMessageSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Look up an existing message in the thread to find the other participant and context fields
    const { data: existingMessages, error: lookupError } = await adminClient
      .from('marketplace_messages')
      .select('*')
      .or(`qa_question_id.eq.${threadId},consultation_id.eq.${threadId},rfp_id.eq.${threadId},bid_id.eq.${threadId}`)
      .limit(1);

    if (lookupError || !existingMessages || existingMessages.length === 0) {
      logger.error('Thread lookup failed', lookupError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const existingMsg = existingMessages[0];

    // Verify user is a participant in this thread
    const isSender = existingMsg.sender_user_id === auth.userId;
    const isRecipient = existingMsg.recipient_user_id === auth.userId;

    if (!isSender && !isRecipient) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // The recipient of the new message is the other participant
    const recipientUserId = isSender
      ? existingMsg.recipient_user_id
      : existingMsg.sender_user_id;

    await sendMessage({
      adminClient,
      senderUserId: auth.userId,
      recipientUserId,
      content: parsed.data.content,
      attachments: parsed.data.attachments,
      qaQuestionId: existingMsg.qa_question_id || undefined,
      consultationId: existingMsg.consultation_id || undefined,
      rfpId: existingMsg.rfp_id || undefined,
      bidId: existingMsg.bid_id || undefined,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Thread messages POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
