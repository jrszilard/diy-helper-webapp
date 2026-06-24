import { describe, it, expect, vi } from 'vitest';

// Public beta is ON, but the server-only payment test flag is OFF.
vi.mock('@/lib/config', () => ({
  stripe: { secretKey: 'sk_test_x' },
  marketplace: { testMode: false, platformFeeRate: 0.2 },
  beta: { enabled: true },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('isTestMode', () => {
  it('is controlled only by the server QA_PAYMENT_TEST_MODE flag, not the public beta flag', async () => {
    const { isTestMode } = await import('@/lib/stripe');
    // beta.enabled === true must NOT force payment test mode — otherwise turning
    // on the public beta UI silently stubs all real Stripe charges.
    expect(isTestMode()).toBe(false);
  });
});
