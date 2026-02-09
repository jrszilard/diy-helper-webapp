import { describe, it, expect, vi } from 'vitest';

// Mock config with small values for easy testing
vi.mock('@/lib/config', () => ({
  pruning: {
    maxTotalChars: 200,
    keepFirstMessages: 2,
    keepLastMessages: 2,
    maxSingleMessageChars: 50,
  },
}));

const { pruneConversation } = await import('../conversation-pruner');

type Message = {
  role: 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
};

function msg(role: 'user' | 'assistant', content: string | Array<Record<string, unknown>>): Message {
  return { role, content };
}

describe('pruneConversation', () => {
  it('returns empty array for empty input', () => {
    expect(pruneConversation([])).toEqual([]);
  });

  it('returns messages as-is when under threshold', () => {
    const messages = [
      msg('user', 'hi'),
      msg('assistant', 'hello'),
    ];
    const result = pruneConversation(messages);
    expect(result).toEqual(messages);
  });

  it('truncates individual messages that are too long', () => {
    const longContent = 'x'.repeat(100); // over maxSingleMessageChars (50)
    const messages = [msg('user', longContent)];
    const result = pruneConversation(messages);
    expect(typeof result[0].content).toBe('string');
    expect((result[0].content as string).length).toBeLessThan(longContent.length);
    expect((result[0].content as string)).toContain('[Message truncated due to length]');
  });

  it('does not truncate array content messages', () => {
    const arrayContent = [{ type: 'tool_use', id: 'test', name: 'test', input: {} }];
    const messages = [msg('assistant', arrayContent)];
    const result = pruneConversation(messages);
    expect(result[0].content).toEqual(arrayContent);
  });

  it('prunes when over threshold — keeps first N and last M with summary', () => {
    // Create messages that exceed 200 chars total
    const messages = [
      msg('user', 'First message from user - important context'),
      msg('assistant', 'First response from assistant - important'),
      msg('user', 'Middle message 1 - can be dropped safely'),
      msg('assistant', 'Middle message 2 - can be dropped safely'),
      msg('user', 'Middle message 3 - can be dropped safely'),
      msg('assistant', 'Middle message 4 - can be dropped safely'),
      msg('user', 'Recent message from user - keep this one'),
      msg('assistant', 'Recent response from assistant - keep'),
    ];

    const result = pruneConversation(messages);

    // Should have: 2 first + 1 summary + 2 last = 5
    expect(result.length).toBe(5);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]).toEqual(messages[1]);
    expect((result[2].content as string)).toContain('messages were summarized');
    expect(result[3]).toEqual(messages[6]);
    expect(result[4]).toEqual(messages[7]);
  });

  it('preserves tool_use/tool_result pairs at the "first" boundary', () => {
    // If the 2nd message (keepFirst boundary) is a tool_use, it should snap back
    const messages = [
      msg('user', 'First user message with some long text'),
      msg('assistant', [{ type: 'tool_use', id: 'id1', name: 'search', input: {} }]),
      msg('user', [{ type: 'tool_result', tool_use_id: 'id1', content: 'result data here' }]),
      msg('assistant', 'Middle response that can be dropped safely'),
      msg('user', 'Another middle message that is droppable ok'),
      msg('assistant', 'Yet another middle message to be dropped'),
      msg('user', 'Recent user question that should be kept'),
      msg('assistant', 'Recent assistant response that stays'),
    ];

    const result = pruneConversation(messages);

    // The tool_use at index 1 is the last of keepFirst=2.
    // snapToTurnBoundary should pull back to index 1, so keepFirst becomes 1.
    // The tool_use and tool_result pair (indices 1,2) should NOT be split.
    // They should either both be kept or both be dropped.
    const hasToolUse = result.some(
      m => Array.isArray(m.content) && m.content.some((b: Record<string, unknown>) => b.type === 'tool_use')
    );
    const hasToolResult = result.some(
      m => Array.isArray(m.content) && m.content.some((b: Record<string, unknown>) => b.type === 'tool_result')
    );

    // If tool_use is present, tool_result must also be present (and vice versa)
    expect(hasToolUse).toBe(hasToolResult);
  });

  it('preserves tool_use/tool_result pairs at the "last" boundary', () => {
    // If the "last" boundary starts at a tool_result, it should snap back to include the tool_use
    const messages = [
      msg('user', 'First user message with reasonable text'),
      msg('assistant', 'First response with good detail here'),
      msg('user', 'Middle message that can safely be dropped'),
      msg('assistant', 'Another droppable middle response text'),
      msg('user', 'Yet another middle message to fill space'),
      msg('assistant', 'Still more filler to push past threshold'),
      msg('assistant', [{ type: 'tool_use', id: 'id2', name: 'calc', input: {} }]),
      msg('user', [{ type: 'tool_result', tool_use_id: 'id2', content: 'calculation result' }]),
    ];

    const result = pruneConversation(messages);

    // Check pairs are preserved
    const hasToolUse = result.some(
      m => Array.isArray(m.content) && m.content.some((b: Record<string, unknown>) => b.type === 'tool_use')
    );
    const hasToolResult = result.some(
      m => Array.isArray(m.content) && m.content.some((b: Record<string, unknown>) => b.type === 'tool_result')
    );

    expect(hasToolUse).toBe(hasToolResult);
  });

  it('returns all messages when keepFirst + keepLast >= total', () => {
    const messages = [
      msg('user', 'hi'),
      msg('assistant', 'hello'),
      msg('user', 'bye'),
    ];
    // keepFirst=2, keepLast=2 => 4 >= 3, return as-is
    const result = pruneConversation(messages);
    expect(result).toEqual(messages);
  });
});
