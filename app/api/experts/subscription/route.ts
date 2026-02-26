import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { getStripeClient, createOrGetStripeCustomer } from '@/lib/stripe';
import { expertSubscriptions } from '@/lib/config';
import { logger } from '@/lib/logger';

type SubscriptionTier = 'free' | 'pro' | 'premium';

/**
 * GET /api/experts/subscription — Get current expert subscription info.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('id, subscription_tier, subscription_stripe_id, subscription_expires_at, subscription_started_at')
      .eq('user_id', auth.userId)
      .single();

    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const tier = (expert.subscription_tier || 'free') as SubscriptionTier;
    const tierConfig = expertSubscriptions.tiers[tier];

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        currentTier: tier,
        platformFeeRate: tierConfig.platformFeeRate,
        features: tierConfig.features,
        subscriptionStripeId: expert.subscription_stripe_id,
        expiresAt: expert.subscription_expires_at,
        startedAt: expert.subscription_started_at,
        availableTiers: Object.entries(expertSubscriptions.tiers).map(([key, config]) => ({
          tier: key,
          label: config.label,
          priceCents: config.priceCents,
          platformFeeRate: config.platformFeeRate,
          features: config.features,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert subscription GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

/**
 * POST /api/experts/subscription — Create or change subscription tier.
 * Body: { tier: 'pro' | 'premium', successUrl: string, cancelUrl: string }
 */
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
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body = await req.json();
    const { tier, successUrl, cancelUrl } = body as {
      tier: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!tier || !['pro', 'premium'].includes(tier)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid tier. Must be "pro" or "premium".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!successUrl || !cancelUrl) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'successUrl and cancelUrl are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Get expert profile
    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('id, subscription_stripe_id')
      .eq('user_id', auth.userId)
      .single();

    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const tierConfig = expertSubscriptions.tiers[tier as SubscriptionTier];
    const stripe = getStripeClient();

    // If expert already has an active subscription, create a billing portal session to manage it
    if (expert.subscription_stripe_id) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(expert.subscription_stripe_id);
        if (existingSub.status === 'active' || existingSub.status === 'trialing') {
          // Create billing portal for plan change
          const { data: user } = await adminClient
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', auth.userId)
            .single();

          if (user?.stripe_customer_id) {
            const portalSession = await stripe.billingPortal.sessions.create({
              customer: user.stripe_customer_id,
              return_url: successUrl,
            });

            return applyCorsHeaders(req, new Response(
              JSON.stringify({ portalUrl: portalSession.url }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            ));
          }
        }
      } catch {
        // Subscription may no longer exist, fall through to create new one
      }
    }

    // Get or create Stripe customer
    const { data: userData } = await adminClient
      .from('auth.users')
      .select('email')
      .eq('id', auth.userId)
      .single();

    const customerId = await createOrGetStripeCustomer(
      auth.userId,
      userData?.email || '',
      adminClient,
    );

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `DIY Helper Expert ${tierConfig.label}`,
            description: tierConfig.features.join(' | '),
          },
          unit_amount: tierConfig.priceCents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        expert_id: expert.id,
        user_id: auth.userId,
        tier,
        type: 'expert_subscription',
      },
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert subscription POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

/**
 * DELETE /api/experts/subscription — Cancel subscription (downgrade to free).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('id, subscription_stripe_id')
      .eq('user_id', auth.userId)
      .single();

    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Cancel Stripe subscription if it exists
    if (expert.subscription_stripe_id) {
      try {
        await getStripeClient().subscriptions.cancel(expert.subscription_stripe_id);
      } catch {
        // Subscription may already be cancelled
      }
    }

    // Update expert profile to free tier
    await adminClient
      .from('expert_profiles')
      .update({
        subscription_tier: 'free',
        subscription_stripe_id: null,
        subscription_expires_at: null,
      })
      .eq('id', expert.id);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ tier: 'free', message: 'Subscription cancelled' }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert subscription DELETE error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
