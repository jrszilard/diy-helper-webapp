import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const VALID_TYPES = ['bug', 'suggestion', 'praise', 'other'];

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body = await req.json();
    const { feedbackType, message, pageUrl } = body;

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Message must be at least 5 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!VALID_TYPES.includes(feedbackType)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid feedback type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { error } = await auth.supabaseClient
      .from('beta_feedback')
      .insert({
        user_id: auth.userId,
        feedback_type: feedbackType,
        message: message.trim().slice(0, 2000),
        page_url: typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : null,
        user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
      });

    if (error) {
      logger.error('Failed to save feedback', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to save feedback' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Feedback error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
