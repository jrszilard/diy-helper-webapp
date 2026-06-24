import { describe, it, expect, vi } from 'vitest';
import { reverseCredits } from '@/lib/marketplace/qa-helpers';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function makeMockClient() {
  const rpc = vi.fn(async (_fn?: unknown, _args?: unknown) => ({ data: 100, error: null }));
  const insert = vi.fn(async (_row?: unknown) => ({ error: null }));
  const eq = vi.fn(async (_col?: unknown, _val?: unknown) => ({ error: null }));
  const update = vi.fn((_patch?: unknown) => ({ eq }));
  const from = vi.fn((_table?: unknown) => ({ insert, update }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { rpc, from } as any, rpc, insert, update, eq, from };
}

describe('reverseCredits', () => {
  it('restores credits, records a compensating transaction, and clears the marker', async () => {
    const m = makeMockClient();

    await reverseCredits(m.client, 'user-1', 'q-1', 500);

    // 1. credits restored via the atomic RPC
    expect(m.rpc).toHaveBeenCalledWith('increment_user_credits', {
      p_user_id: 'user-1',
      p_amount_cents: 500,
    });

    // 2. compensating (positive) audit-log row
    expect(m.from).toHaveBeenCalledWith('credit_transactions');
    const txn = m.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(txn.user_id).toBe('user-1');
    expect(txn.amount_cents).toBe(500); // positive: credits returned
    expect(txn.reason).toBe('credit_reversal');
    expect(txn.qa_question_id).toBe('q-1');

    // 3. credit_applied_cents reset so a retry recomputes cleanly
    expect(m.from).toHaveBeenCalledWith('qa_questions');
    expect(m.update).toHaveBeenCalledWith({ credit_applied_cents: 0 });
    expect(m.eq).toHaveBeenCalledWith('id', 'q-1');
  });

  it('is a no-op when no credits were applied', async () => {
    const m = makeMockClient();

    await reverseCredits(m.client, 'user-1', 'q-1', 0);

    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
});
