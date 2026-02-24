import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { createOrGetStripeCustomer, createQASetupIntent } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { data: { user } } = await auth.supabaseClient.auth.getUser();
    if (!user?.email) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();
    const customerId = await createOrGetStripeCustomer(user.email, auth.userId, adminClient);
    const { clientSecret, setupIntentId } = await createQASetupIntent(customerId, {
      user_id: auth.userId,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ clientSecret, customerId, setupIntentId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Setup payment error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to set up payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
