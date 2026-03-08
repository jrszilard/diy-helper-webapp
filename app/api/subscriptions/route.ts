import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions, getSafeOrigin, validateRedirectUrl } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { CreateCheckoutSchema } from '@/lib/marketplace/validation';
import { createCheckoutSession } from '@/lib/stripe';
import { freemium, beta } from '@/lib/config';
import { getAdminClient } from '@/lib/supabase-admin';
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

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'subscriptions');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { data: sub } = await auth.supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    const subscription = sub ? {
      id: sub.id,
      tier: sub.tier,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      createdAt: sub.created_at,
    } : {
      tier: 'free',
      status: 'active',
    };

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ subscription }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Subscription GET error', error);
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

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'subscriptions');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const body = await req.json();
    const parsed = parseRequestBody(CreateCheckoutSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const origin = getSafeOrigin(req);
    const defaultSuccess = `${origin}/settings?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancel = `${origin}/settings`;
    const successUrl = parsed.data.successUrl
      ? validateRedirectUrl(parsed.data.successUrl, defaultSuccess)
      : defaultSuccess;
    const cancelUrl = parsed.data.cancelUrl
      ? validateRedirectUrl(parsed.data.cancelUrl, defaultCancel)
      : defaultCancel;

    // Check if user already has an active subscription
    const { data: existingSub } = await auth.supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id, tier, status')
      .eq('user_id', auth.userId)
      .single();

    if (existingSub?.tier === 'pro' && existingSub?.status === 'active') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'You already have an active Pro subscription' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Beta mode: auto-activate pro without Stripe
    if (beta.enabled) {
      const adminClient = getAdminClient();
      await adminClient.from('user_subscriptions').upsert({
        user_id: auth.userId,
        tier: 'pro',
        status: 'active',
        stripe_customer_id: `cus_beta_${auth.userId.slice(0, 8)}`,
        stripe_subscription_id: `sub_beta_${auth.userId.slice(0, 8)}`,
        current_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return applyCorsHeaders(req, new Response(
        JSON.stringify({ url: successUrl.replace('{CHECKOUT_SESSION_ID}', 'beta_session'), betaMode: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get user email for Stripe
    const { data: { user } } = await auth.supabaseClient.auth.getUser();

    const session = await createCheckoutSession({
      customerId: existingSub?.stripe_customer_id || undefined,
      customerEmail: user?.email,
      priceAmountCents: freemium.proPriceCents,
      successUrl,
      cancelUrl,
      metadata: { userId: auth.userId },
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Subscription POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
