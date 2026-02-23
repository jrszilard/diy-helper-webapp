import { NextRequest } from 'next/server';
import { stripeClient } from '@/lib/stripe';
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
      event = stripeClient.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.subscriptionWebhookSecret,
      );
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getAdminClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) {
          logger.warn('Checkout session missing userId metadata', { sessionId: session.id });
          break;
        }

        const { error } = await adminClient
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            tier: 'pro',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
            current_period_end: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) {
          logger.error('Failed to upsert subscription on checkout', error);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const { data: existingSub } = await adminClient
          .from('user_subscriptions')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          const status = subscription.cancel_at_period_end ? 'canceled' : subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : subscription.status === 'trialing' ? 'trialing' : 'canceled';

          const subData = subscription as unknown as Record<string, unknown>;
          const periodStart = typeof subData.current_period_start === 'number'
            ? new Date(subData.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const periodEnd = typeof subData.current_period_end === 'number'
            ? new Date(subData.current_period_end * 1000).toISOString()
            : null;

          const { error } = await adminClient
            .from('user_subscriptions')
            .update({
              status,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);

          if (error) {
            logger.error('Failed to update subscription', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const { error } = await adminClient
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          logger.error('Failed to handle subscription deletion', error);
        }
        break;
      }

      default:
        logger.info('Unhandled subscription webhook event', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Subscription webhook error', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
