import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

// Migration required: add to beta_feedback table:
//   user_type    TEXT          CHECK (user_type IN ('diyer', 'expert'))
//   usage_score  SMALLINT      CHECK (usage_score BETWEEN 1 AND 5)
//   price_option TEXT

const VALID_USER_TYPES = ['diyer', 'expert'];

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body = await req.json();
    const { userType, usageScore, priceOption, message, pageUrl } = body;

    if (!VALID_USER_TYPES.includes(userType)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid user type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (typeof usageScore !== 'number' || usageScore < 1 || usageScore > 5) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Usage score must be 1–5' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!priceOption || typeof priceOption !== 'string' || priceOption.trim().length === 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Price option is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const trimmedMessage = typeof message === 'string' ? message.trim().slice(0, 2000) : null;

    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from('beta_feedback')
      .insert({
        user_id: auth.userId || null,
        user_type: userType,
        usage_score: usageScore,
        price_option: priceOption.trim().slice(0, 50),
        message: trimmedMessage || null,
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
