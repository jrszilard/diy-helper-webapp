import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build chainable mock
function makeChainMock(data: unknown[] | null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => ({ data, error: null })),
  };
  return chain;
}

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('getWeightedExamples', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  it('returns examples as FewShotExample format', async () => {
    const chain = makeChainMock([
      { user_question: 'q1', bad_response: 'bad1', good_response: 'good1', rubric_items_failed: [3], severity: 'critical', weight: 0.9 },
      { user_question: 'q2', bad_response: 'bad2', good_response: 'good2', rubric_items_failed: [5], severity: 'warning', weight: 0.5 },
      { user_question: 'q3', bad_response: 'bad3', good_response: 'good3', rubric_items_failed: [1], severity: 'critical', weight: 0.3 },
    ]);
    mockFrom.mockReturnValue(chain);

    const { getWeightedExamples } = await import('@/lib/advisor-rubric-db');
    const examples = await getWeightedExamples('electrical', 2);

    expect(examples.length).toBeLessThanOrEqual(2);
    expect(examples[0]).toHaveProperty('userQuestion');
    expect(examples[0]).toHaveProperty('badResponse');
    expect(examples[0]).toHaveProperty('goodResponse');
    expect(examples[0]).toHaveProperty('rubricItemsFailed');
    expect(examples[0]).toHaveProperty('severity');
  });

  it('returns empty array when no data', async () => {
    const chain = makeChainMock(null);
    mockFrom.mockReturnValue(chain);

    const { getWeightedExamples } = await import('@/lib/advisor-rubric-db');
    const examples = await getWeightedExamples('plumbing', 5);
    expect(examples).toEqual([]);
  });

  it('returns all items when fewer than limit', async () => {
    const chain = makeChainMock([
      { user_question: 'q1', bad_response: 'bad1', good_response: 'good1', rubric_items_failed: [3], severity: 'critical', weight: 0.9 },
    ]);
    mockFrom.mockReturnValue(chain);

    const { getWeightedExamples } = await import('@/lib/advisor-rubric-db');
    const examples = await getWeightedExamples('electrical', 5);
    expect(examples).toHaveLength(1);
  });
});
