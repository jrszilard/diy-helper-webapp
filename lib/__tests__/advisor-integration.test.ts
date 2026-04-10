import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resolveAdvisorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, ADVISOR_ENABLED: 'true' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default model when advisor is disabled', async () => {
    process.env.ADVISOR_ENABLED = 'false';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.advisorTool).toBeNull();
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('returns Haiku executor for quick_question', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What size nail for baseboards?');
    expect(result.executorModel).toBe('claude-haiku-4-5-20251001');
    expect(result.advisorTool).toBeNull();
  });

  it('returns Sonnet executor for full_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
    // advisorTool is null until Anthropic releases the advisor_20260301 API
    expect(result.advisorTool).toBeNull();
  });

  it('returns Sonnet executor for troubleshooting', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My outlet keeps sparking');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('returns Sonnet executor for mid_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('mid_project', 'The mortar is not sticking');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('detects safety keywords and sets flag', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I need to upgrade my electrical panel');
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('appends system prompt nudge when safety keywords detected', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My gas line is leaking');
    expect(result.systemPromptSuffix).toContain('MUST consult the advisor');
  });

  it('does not detect safety keywords for non-critical topics', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to paint my bedroom');
    expect(result.safetyKeywordsDetected).toBe(false);
    expect(result.safetyKeywordsMatched).toEqual([]);
  });

  it('handles undefined intentType by using default model', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig(undefined, 'Hello');
    expect(result.advisorTool).toBeNull();
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });
});
