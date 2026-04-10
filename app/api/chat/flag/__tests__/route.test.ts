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
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('POST /api/chat/flag', () => {
  beforeEach(() => {
    mockInsert.mockClear();
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
    const row = mockInsert.mock.calls[0][0];
    expect(row.source).toBe('user_flag');
    expect(row.flag_type).toBe('safety');
    expect(row.user_question).toBe('How do I replace a breaker?');
    expect(row.ai_response).toBe('Just pull the breaker out...');
    expect(row.correction_text).toBe('No mention of turning off the main');
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
