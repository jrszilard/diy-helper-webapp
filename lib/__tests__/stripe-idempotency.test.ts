import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake Stripe so we can run the non-test-mode charge path and inspect the
// request options passed to paymentIntents.create.
const createPaymentIntent = vi.fn(async (_params?: unknown, _opts?: unknown) => ({ id: 'pi_real_123' }));
vi.mock('stripe', () => ({
  // Stripe is used as `new Stripe(...)`, so the mock must be constructable.
  default: class {
    paymentIntents = { create: createPaymentIntent };
  },
}));
// Force real (non-test) mode so the charge actually calls Stripe.
vi.mock('@/lib/config', () => ({
  stripe: { secretKey: 'sk_test_x' },
  marketplace: { testMode: false, platformFeeRate: 0.2 },
  beta: { enabled: false },
}));

describe('chargeQAQuestion idempotency', () => {
  beforeEach(() => createPaymentIntent.mockClear());

  it('forwards the idempotency key to Stripe as request options', async () => {
    const { chargeQAQuestion } = await import('@/lib/stripe');
    await chargeQAQuestion({
      amountCents: 500,
      customerId: 'cus_1',
      paymentMethodId: 'pm_1',
      idempotencyKey: 'qa-bid-q1-b1',
    });
    expect(createPaymentIntent).toHaveBeenCalledTimes(1);
    const [, options] = createPaymentIntent.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: 'qa-bid-q1-b1' });
  });

  it('omits request options when no key is supplied', async () => {
    const { chargeQAQuestion } = await import('@/lib/stripe');
    await chargeQAQuestion({ amountCents: 500, customerId: 'cus_1', paymentMethodId: 'pm_1' });
    const [, options] = createPaymentIntent.mock.calls[0];
    expect(options).toBeUndefined();
  });
});
