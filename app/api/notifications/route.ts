import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'notifications');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { data: notifications, error } = await auth.supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Failed to fetch notifications', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Count unread
    const { count: unreadCount } = await auth.supabaseClient
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('is_read', false);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        notifications: (notifications || []).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          metadata: n.metadata,
          isRead: n.is_read,
          readAt: n.read_at,
          createdAt: n.created_at,
        })),
        unreadCount: unreadCount ?? 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Notifications API error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
