import Stripe from 'stripe';
import { stripe as stripeConfig } from '@/lib/config';

let _stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripeClient) {
    if (!stripeConfig.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripeClient = new Stripe(stripeConfig.secretKey);
  }
  return _stripeClient;
}

export async function createConnectAccount(email: string): Promise<Stripe.Account> {
  return getStripeClient().accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createOnboardingLink(accountId: string, returnUrl: string): Promise<string> {
  const link = await getStripeClient().accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  priceAmountCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'DIY Helper Pro' },
        unit_amount: params.priceAmountCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });
}

export async function createQAPaymentIntent(params: {
  amountCents: number;
  customerEmail: string;
  metadata: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  return getStripeClient().paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    receipt_email: params.customerEmail,
    metadata: params.metadata,
  });
}

export async function transferToExpert(params: {
  amountCents: number;
  destinationAccountId: string;
  transferGroup?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Transfer> {
  return getStripeClient().transfers.create({
    amount: params.amountCents,
    currency: 'usd',
    destination: params.destinationAccountId,
    transfer_group: params.transferGroup,
    metadata: params.metadata,
  });
}
