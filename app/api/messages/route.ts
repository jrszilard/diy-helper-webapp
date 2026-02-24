import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { SendMessageSchema } from '@/lib/marketplace/validation';
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

export async function GET(req: NextRequest) {
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

    // Get all messages where user is sender or recipient, grouped by thread context
    const { data: messages, error } = await auth.supabaseClient
      .from('marketplace_messages')
      .select('*')
      .or(`sender_user_id.eq.${auth.userId},recipient_user_id.eq.${auth.userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch messages', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Group by thread (using the first non-null context field as thread identifier)
    const threadMap = new Map<string, {
      threadId: string;
      contextType: string;
      latestMessage: typeof messages[0];
      messageCount: number;
      unreadCount: number;
      otherUserId: string;
    }>();

    for (const msg of messages || []) {
      const otherUserId = msg.sender_user_id === auth.userId ? msg.recipient_user_id : msg.sender_user_id;
      const threadId = msg.qa_question_id || msg.consultation_id || msg.rfp_id || msg.bid_id || otherUserId;
      const contextType = msg.qa_question_id ? 'qa' : msg.consultation_id ? 'consultation' : msg.rfp_id ? 'rfp' : msg.bid_id ? 'bid' : 'direct';

      const existing = threadMap.get(threadId);
      if (!existing) {
        threadMap.set(threadId, {
          threadId,
          contextType,
          latestMessage: msg,
          messageCount: 1,
          unreadCount: (!msg.is_read && msg.recipient_user_id === auth.userId) ? 1 : 0,
          otherUserId,
        });
      } else {
        existing.messageCount++;
        if (!msg.is_read && msg.recipient_user_id === auth.userId) {
          existing.unreadCount++;
        }
      }
    }

    // Resolve display names for all other-user IDs
    const otherUserIds = [...new Set(Array.from(threadMap.values()).map(t => t.otherUserId))];
    const adminClient = getAdminClient();
    const displayNames = await resolveDisplayNames(adminClient, otherUserIds);

    const threads = Array.from(threadMap.values()).map(t => ({
      threadId: t.threadId,
      contextType: t.contextType,
      otherUserId: t.otherUserId,
      otherUserName: displayNames[t.otherUserId] || 'Unknown User',
      messageCount: t.messageCount,
      unreadCount: t.unreadCount,
      lastMessage: {
        id: t.latestMessage.id,
        content: t.latestMessage.content,
        attachments: t.latestMessage.attachments || [],
        senderUserId: t.latestMessage.sender_user_id,
        createdAt: t.latestMessage.created_at,
      },
    }));

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ threads }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Messages GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = parseRequestBody(SendMessageSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    await sendMessage({
      adminClient,
      senderUserId: auth.userId,
      recipientUserId: parsed.data.recipientUserId,
      content: parsed.data.content,
      attachments: parsed.data.attachments,
      qaQuestionId: parsed.data.qaQuestionId,
      consultationId: parsed.data.consultationId,
      rfpId: parsed.data.rfpId,
      bidId: parsed.data.bidId,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Messages POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
