import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { UpdateProfileSchema } from '@/lib/profile-validation';
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'general');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { data: { user }, error } = await auth.supabaseClient.auth.getUser();
    if (error || !user) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        profile: {
          email: user.email ?? null,
          displayName: user.user_metadata?.display_name ?? null,
          phone: user.user_metadata?.phone ?? user.phone ?? null,
          createdAt: user.created_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Profile GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'general');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const body = await req.json();
    const parsed = parseRequestBody(UpdateProfileSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const updateData: Record<string, string> = {};
    if (parsed.data.displayName !== undefined) updateData.display_name = parsed.data.displayName;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

    const { data: { user }, error } = await auth.supabaseClient.auth.updateUser({
      data: updateData,
    });

    if (error || !user) {
      logger.error('Failed to update user profile', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        profile: {
          email: user.email ?? null,
          displayName: user.user_metadata?.display_name ?? null,
          phone: user.user_metadata?.phone ?? user.phone ?? null,
          createdAt: user.created_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Profile PUT error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
