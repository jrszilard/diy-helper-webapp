import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { createConnectAccount, createOnboardingLink, isTestMode } from '@/lib/stripe';
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'experts');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = `${origin}/experts/dashboard`;

    let accountId = expert.stripeConnectAccountId;

    if (!accountId) {
      // Get user email
      const { data: { user } } = await auth.supabaseClient.auth.getUser();
      const email = user?.email || '';

      const account = await createConnectAccount(email);
      accountId = account.id;

      // Save account ID to profile
      const updateData: Record<string, unknown> = { stripe_connect_account_id: accountId };
      if (isTestMode()) {
        updateData.stripe_onboarding_complete = true;
      }
      await auth.supabaseClient
        .from('expert_profiles')
        .update(updateData)
        .eq('id', expert.id);
    }

    const testMode = isTestMode();

    // In test mode, auto-complete onboarding for existing accounts too
    if (testMode) {
      await auth.supabaseClient
        .from('expert_profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', expert.id);
    }

    const onboardingUrl = await createOnboardingLink(accountId, returnUrl);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ url: onboardingUrl, testMode }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Stripe onboard error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
