import { NextRequest } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { stripe as stripeConfig } from '@/lib/config';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let event;
    try {
      event = getStripeClient().webhooks.constructEvent(
        body,
        signature,
        stripeConfig.connectWebhookSecret,
      );
    } catch (err) {
      logger.error('Stripe Connect webhook signature verification failed', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getAdminClient();

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        const accountId = account.id;
        const chargesEnabled = account.charges_enabled;

        if (chargesEnabled) {
          const { error } = await adminClient
            .from('expert_profiles')
            .update({
              stripe_onboarding_complete: true,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_connect_account_id', accountId);

          if (error) {
            logger.error('Failed to update stripe onboarding status', error);
          } else {
            logger.info('Expert Stripe onboarding complete', { accountId });
          }
        }
        break;
      }

      default:
        logger.info('Unhandled Connect webhook event', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Stripe Connect webhook error', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
