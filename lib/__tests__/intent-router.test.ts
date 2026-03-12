import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent, buildClassificationPrompt } from '@/lib/intelligence/intent-router';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(function () {
      return { messages: { create: mockCreate } };
    }),
    __mockCreate: mockCreate,
  };
});

async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk');
  return (mod as unknown as { __mockCreate: ReturnType<typeof vi.fn> }).__mockCreate;
}

describe('buildClassificationPrompt', () => {
  it('includes the user message', () => {
    const prompt = buildClassificationPrompt('What size nail for baseboards?', { hasActiveProjects: false });
    expect(prompt).toContain('What size nail for baseboards?');
  });

  it('includes active project context when present', () => {
    const prompt = buildClassificationPrompt('The mortar is not sticking', {
      hasActiveProjects: true,
      activeProjectCategories: ['carpentry', 'general'],
    });
    expect(prompt).toContain('active projects');
    expect(prompt).toContain('carpentry');
  });

  it('handles no active projects', () => {
    const prompt = buildClassificationPrompt('I want to build a deck', { hasActiveProjects: false });
    expect(prompt).toContain('no active projects');
  });
});

describe('classifyIntent', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCreate = await getMockCreate();
    mockCreate.mockReset();
  });

  it('returns parsed classification for a quick question', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"quick_question","confidence":0.95,"reasoning":"Simple factual question"}' }],
    });
    const result = await classifyIntent('What size nail for baseboards?', { hasActiveProjects: false });
    expect(result.intent).toBe('quick_question');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe('Simple factual question');
  });

  it('returns parsed classification for a full project', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"full_project","confidence":0.92,"reasoning":"Planning a major project"}' }],
    });
    const result = await classifyIntent('I want to build a deck in my backyard', { hasActiveProjects: false });
    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('defaults to full_project on API failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API timeout'));
    const result = await classifyIntent('What size nail for baseboards?', { hasActiveProjects: false });
    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain('fallback');
  });

  it('defaults to full_project on malformed JSON response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not valid json' }],
    });
    const result = await classifyIntent('Help me', { hasActiveProjects: false });
    expect(result.intent).toBe('full_project');
    expect(result.confidence).toBe(0);
  });

  it('passes active project info to classification', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"intent":"mid_project","confidence":0.88,"reasoning":"References active project"}' }],
    });
    const result = await classifyIntent('The mortar is not sticking', {
      hasActiveProjects: true,
      activeProjectCategories: ['carpentry'],
    });
    expect(result.intent).toBe('mid_project');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
