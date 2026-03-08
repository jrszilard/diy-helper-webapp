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
        stripeConfig.paymentWebhookSecret,
      );
    } catch (err) {
      logger.error('Payment webhook signature verification failed', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getAdminClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { error } = await adminClient
          .from('payment_transactions')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (error) {
          logger.error('Failed to update payment transaction', error, { paymentIntentId: paymentIntent.id });
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        const qaQuestionId = transfer.metadata?.qa_question_id;

        if (qaQuestionId) {
          const { error } = await adminClient
            .from('qa_questions')
            .update({
              payout_status: 'transferred',
              payout_released_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', qaQuestionId);

          if (error) {
            logger.error('Failed to update Q&A payout status', error, { qaQuestionId });
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          // Update payment_transactions status
          await adminClient
            .from('payment_transactions')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntentId);

          // Update qa_questions payout_status
          await adminClient
            .from('qa_questions')
            .update({
              payout_status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('payment_intent_id', paymentIntentId);
        }
        break;
      }

      default:
        logger.info('Unhandled payment webhook event', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Payment webhook error', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
