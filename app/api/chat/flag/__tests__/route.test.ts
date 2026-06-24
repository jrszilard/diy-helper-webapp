import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn(() => ({ error: null }));
vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 10, retryAfter: null })),
}));
const mockAuth = vi.fn(async () => ({ userId: null as string | null, isAuthenticated: false, supabaseClient: {} }));
vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...(args as [])),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('POST /api/chat/flag', () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockAuth.mockResolvedValue({ userId: null, isAuthenticated: false, supabaseClient: {} });
  });

  it('inserts a user flag into correction_queue', async () => {
    const { POST } = await import('@/app/api/chat/flag/route');
    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'flag',
        flagType: 'safety',
        userMessage: 'How do I replace a breaker?',
        aiResponse: 'Just pull the breaker out...',
        details: 'No mention of turning off the main',
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (mockInsert.mock.calls[0] as any[])[0] as Record<string, unknown>;
    expect(row.source).toBe('user_flag');
    expect(row.flag_type).toBe('safety');
    expect(row.user_question).toBe('How do I replace a breaker?');
    expect(row.ai_response).toBe('Just pull the breaker out...');
    expect(row.correction_text).toBe('No mention of turning off the main');
    // Anonymous flag: not attributed.
    expect(row.reporter_id).toBe(null);
  });

  it('attributes the flag to the signed-in user and caps oversized fields', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-42', isAuthenticated: true, supabaseClient: {} });
    const { POST } = await import('@/app/api/chat/flag/route');
    const huge = 'x'.repeat(10_000);
    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'flag',
        flagType: 'safety',
        userMessage: huge,
        aiResponse: huge,
        conversationId: 'not-a-uuid',
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const row = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(row.reporter_id).toBe('user-42');
    expect((row.user_question as string).length).toBe(4000); // capped
    expect((row.ai_response as string).length).toBe(4000);
    expect(row.conversation_id).toBe(null); // invalid uuid coerced to null
  });

  it('accepts thumbs_up feedback without writing to correction queue', async () => {
    const { POST } = await import('@/app/api/chat/flag/route');
    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'thumbs_up',
        messageIndex: 3,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects flag without flagType', async () => {
    const { POST } = await import('@/app/api/chat/flag/route');
    const req = new Request('http://localhost/api/chat/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackType: 'flag',
        userMessage: 'test',
        aiResponse: 'test',
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
