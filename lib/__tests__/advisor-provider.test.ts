import { describe, it, expect, vi } from 'vitest';
import { AnthropicReviewProvider } from '@/lib/advisor-providers/anthropic';
import type { ReviewModelProvider } from '@/lib/advisor-provider';

describe('AnthropicReviewProvider', () => {
  it('implements ReviewModelProvider interface', () => {
    const mockClient = { messages: { create: vi.fn() } };
    const provider: ReviewModelProvider = new AnthropicReviewProvider(
      'claude-haiku-4-5-20251001',
      mockClient as never,
    );
    expect(provider.name).toBe('anthropic');
    expect(provider.model).toBe('claude-haiku-4-5-20251001');
    expect(typeof provider.call).toBe('function');
  });

  it('returns text and token counts from Anthropic response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"verdict":"APPROVE"}' }],
      usage: { input_tokens: 500, output_tokens: 200 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    const result = await provider.call(undefined, 'Review this response');

    expect(result.text).toBe('{"verdict":"APPROVE"}');
    expect(result.inputTokens).toBe(500);
    expect(result.outputTokens).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'Review this response' }],
    });
  });

  it('includes system prompt when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'response' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    await provider.call('You are a reviewer', 'Review this');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are a reviewer',
      messages: [{ role: 'user', content: 'Review this' }],
    });
  });

  it('returns empty text when no text block in response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const mockClient = { messages: { create: mockCreate } };
    const provider = new AnthropicReviewProvider('claude-haiku-4-5-20251001', mockClient as never);

    const result = await provider.call(undefined, 'Review this');
    expect(result.text).toBe('');
  });
});
