import Stripe from 'stripe';
import { stripe as stripeConfig, marketplace as marketplaceConfig } from '@/lib/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

function isTestMode(): boolean {
  return marketplaceConfig.testMode;
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
  if (isTestMode()) {
    return { id: `tr_test_${randomUUID()}`, amount: params.amountCents, currency: 'usd' } as unknown as Stripe.Transfer;
  }
  return getStripeClient().transfers.create({
    amount: params.amountCents,
    currency: 'usd',
    destination: params.destinationAccountId,
    transfer_group: params.transferGroup,
    metadata: params.metadata,
  });
}

// ── Q&A Payment Flow v2 ────────────────────────────────────────────────────

/**
 * Get or create a Stripe Customer for a user.
 * Checks user_subscriptions first; creates a new customer if none exists.
 */
export async function createOrGetStripeCustomer(
  email: string,
  userId: string,
  adminClient: SupabaseClient,
): Promise<string> {
  // Check existing subscription record
  const { data: sub } = await adminClient
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (sub?.stripe_customer_id) {
    return sub.stripe_customer_id;
  }

  let customerId: string;

  if (isTestMode()) {
    customerId = `cus_test_${randomUUID().slice(0, 8)}`;
  } else {
    const customer = await getStripeClient().customers.create({
      email,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
  }

  // Upsert subscription record with customer ID
  await adminClient
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      tier: 'free',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  return customerId;
}

/**
 * Create a SetupIntent so the frontend can collect and save a card
 * without charging the customer yet.
 */
export async function createQASetupIntent(
  customerId: string,
  metadata?: Record<string, string>,
): Promise<{ clientSecret: string; setupIntentId: string }> {
  if (isTestMode()) {
    const fakeId = `seti_test_${randomUUID().slice(0, 8)}`;
    return {
      clientSecret: `${fakeId}_secret_test`,
      setupIntentId: fakeId,
    };
  }

  const setupIntent = await getStripeClient().setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: metadata || {},
  });

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Charge a Q&A question using a saved payment method (off-session).
 * This is the charge-on-claim call.
 */
export async function chargeQAQuestion(params: {
  amountCents: number;
  customerId: string;
  paymentMethodId: string;
  metadata?: Record<string, string>;
}): Promise<{ paymentIntentId: string }> {
  if (isTestMode()) {
    return { paymentIntentId: `pi_test_${randomUUID().slice(0, 8)}` };
  }

  const paymentIntent = await getStripeClient().paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    off_session: true,
    confirm: true,
    metadata: params.metadata || {},
  });

  return { paymentIntentId: paymentIntent.id };
}

/**
 * Issue a full refund on a PaymentIntent.
 */
export async function refundQACharge(
  paymentIntentId: string,
  metadata?: Record<string, string>,
): Promise<{ refundId: string }> {
  if (isTestMode()) {
    return { refundId: `re_test_${randomUUID().slice(0, 8)}` };
  }

  const refund = await getStripeClient().refunds.create({
    payment_intent: paymentIntentId,
    metadata: metadata || {},
  });

  return { refundId: refund.id };
}

// ── Destination Charges (Project Payments) ─────────────────────────────────

/**
 * Calculate the platform commission for a project payment using tiered rates.
 * Tier 1: 10% on first $10K
 * Tier 2: 7% on $10K-$25K
 * Tier 3: 5% above $25K
 */
export function calculateProjectCommission(
  amountCents: number,
  isRepeatCustomer: boolean = false,
): number {
  if (isRepeatCustomer) {
    return Math.round(amountCents * 0.05); // 5% flat for re-hires
  }

  let remaining = amountCents;
  let commission = 0;

  // Tier 1: 10% on first $10K (1,000,000 cents)
  const tier1Amount = Math.min(remaining, 1000000);
  commission += Math.round(tier1Amount * 0.10);
  remaining -= tier1Amount;

  // Tier 2: 7% on $10K-$25K
  if (remaining > 0) {
    const tier2Amount = Math.min(remaining, 1500000); // $25K - $10K = $15K
    commission += Math.round(tier2Amount * 0.07);
    remaining -= tier2Amount;
  }

  // Tier 3: 5% above $25K
  if (remaining > 0) {
    commission += Math.round(remaining * 0.05);
  }

  return commission;
}

/**
 * Create a Stripe Connect destination charge.
 * The platform collects the full amount and transfers (amount - fee) to the expert.
 * Used for project deposits and milestone payments.
 */
export async function createDestinationCharge(params: {
  amountCents: number;
  applicationFeeCents: number;
  destinationAccountId: string;
  customerId: string;
  paymentMethodId: string;
  metadata?: Record<string, string>;
}): Promise<{ paymentIntentId: string }> {
  if (isTestMode()) {
    return { paymentIntentId: `pi_test_proj_${randomUUID().slice(0, 8)}` };
  }

  const paymentIntent = await getStripeClient().paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    off_session: true,
    confirm: true,
    application_fee_amount: params.applicationFeeCents,
    transfer_data: {
      destination: params.destinationAccountId,
    },
    metadata: params.metadata || {},
  });

  return { paymentIntentId: paymentIntent.id };
}
