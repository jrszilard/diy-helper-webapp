import { describe, it, expect, vi } from 'vitest';

const mockInsert = vi.fn(() => ({ error: null }));
vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('logReviewVerdict', () => {
  it('inserts a row into advisor_review_log', async () => {
    const { logReviewVerdict } = await import('@/lib/advisor-audit');

    await logReviewVerdict({
      requestId: 'req-123',
      intentType: 'full_project',
      advisorMode: 'custom',
      reviewerModel: 'claude-haiku-4-5-20251001',
      userQuestion: 'How do I wire an outlet?',
      draftResponse: 'First, turn off the breaker...',
      verdict: 'APPROVE',
      confidence: 0.95,
      issues: [],
      revisedResponse: null,
      iterationsUsed: 1,
      safetyKeywords: ['outlet install'],
      category: 'electrical',
      rubricVersion: 1,
      reviewerTokensIn: 500,
      reviewerTokensOut: 200,
      latencyMs: 850,
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (mockInsert.mock.calls[0] as any[])[0] as Record<string, unknown>;
    expect(row.request_id).toBe('req-123');
    expect(row.advisor_mode).toBe('custom');
    expect(row.verdict).toBe('APPROVE');
    expect(row.rubric_version).toBe(1);
    expect(row.reviewer_tokens_in).toBe(500);
  });
});
