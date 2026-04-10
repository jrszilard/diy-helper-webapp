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
    expect(result.useBetaApi).toBe(false);
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('returns Haiku executor with no advisor for quick_question', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What size nail for baseboards?');
    expect(result.executorModel).toBe('claude-haiku-4-5-20251001');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
  });

  it('returns Sonnet executor with Opus advisor for full_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.model).toBe('claude-opus-4-6');
    expect(result.advisorTool!.max_uses).toBe(3);
    expect(result.advisorTool!.name).toBe('advisor');
    expect(result.useBetaApi).toBe(true);
  });

  it('returns Opus advisor with max_uses=2 for troubleshooting', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My outlet keeps sparking');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.max_uses).toBe(2);
  });

  it('returns Opus advisor with max_uses=1 for mid_project', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('mid_project', 'The mortar is not sticking');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.max_uses).toBe(1);
  });

  it('boosts max_uses when safety keywords detected', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I need to upgrade my electrical panel');
    expect(result.advisorTool!.max_uses).toBe(4); // 3 default + 1 boost
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('appends system prompt nudge when safety keywords detected', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My gas line is leaking');
    expect(result.systemPromptSuffix).toContain('MUST consult the advisor');
  });

  it('does not boost when no safety keywords match', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to paint my bedroom');
    expect(result.advisorTool!.max_uses).toBe(3);
    expect(result.safetyKeywordsDetected).toBe(false);
  });

  it('handles undefined intentType by using default model', async () => {
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig(undefined, 'Hello');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });
});
