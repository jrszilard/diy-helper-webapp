import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

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

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        messages: messages.map(m => ({
          id: m.id,
          senderUserId: m.sender_user_id,
          recipientUserId: m.recipient_user_id,
          content: m.content,
          attachments: m.attachments,
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

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
