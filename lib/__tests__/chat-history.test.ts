import { describe, it, expect, vi } from 'vitest';

function createMockClient() {
  const mockSingle = vi.fn().mockResolvedValue({
    data: { id: 'conv-1', title: 'Test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), project_id: null, intent_type: null },
    error: null,
  });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  return { from: mockFrom, __mocks: { mockFrom, mockInsert, mockSelect, mockSingle } };
}

describe('createConversation', () => {
  it('passes intent_type to database insert when provided', async () => {
    const client = createMockClient();
    const { createConversation } = await import('@/lib/chat-history');
    await createConversation(client as unknown as Parameters<typeof createConversation>[0], 'user-1', 'Test', undefined, 'quick_question');
    const insertArg = client.__mocks.mockInsert.mock.calls[0][0];
    expect(insertArg.intent_type).toBe('quick_question');
    expect(insertArg.user_id).toBe('user-1');
  });

  it('passes null intent_type when not provided (backward compat)', async () => {
    const client = createMockClient();
    const { createConversation } = await import('@/lib/chat-history');
    await createConversation(client as unknown as Parameters<typeof createConversation>[0], 'user-1', 'Test');
    const insertArg = client.__mocks.mockInsert.mock.calls[0][0];
    expect(insertArg.intent_type).toBeNull();
  });
});
