import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resolveAdvisorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Mode "off" ---

  it('returns advisorMode "off" when mode is off', async () => {
    process.env.ADVISOR_MODE = 'off';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'fix my sink');
    expect(result.advisorMode).toBe('off');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
    expect(result.customReviewerModel).toBeNull();
  });

  it('returns default model when mode is off', async () => {
    process.env.ADVISOR_MODE = 'off';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.executorModel).toBe('claude-sonnet-4-6');
  });

  it('handles undefined intentType by returning mode off', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig(undefined, 'Hello');
    expect(result.advisorMode).toBe('off');
    expect(result.advisorTool).toBeNull();
  });

  // --- Mode "beta" ---

  it('returns Haiku executor with no advisor for quick_question in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What size nail for baseboards?');
    expect(result.executorModel).toBe('claude-haiku-4-5-20251001');
    expect(result.advisorTool).toBeNull();
    expect(result.advisorMode).toBe('off');
  });

  it('returns Sonnet+Opus for full_project in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to build a deck');
    expect(result.advisorMode).toBe('beta');
    expect(result.advisorTool).not.toBeNull();
    expect(result.advisorTool!.model).toBe('claude-opus-4-6');
    expect(result.advisorTool!.max_uses).toBe(3);
    expect(result.useBetaApi).toBe(true);
  });

  it('boosts max_uses when safety keywords detected in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I need to upgrade my electrical panel');
    expect(result.advisorTool!.max_uses).toBe(4);
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('appends system prompt suffix in beta mode', async () => {
    process.env.ADVISOR_MODE = 'beta';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('troubleshooting', 'My gas line is leaking');
    expect(result.systemPromptSuffix).toContain('MUST consult the advisor');
  });

  // --- Mode "custom" ---

  it('returns advisorMode "custom" without advisor tool or beta API', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'fix my sink');
    expect(result.advisorMode).toBe('custom');
    expect(result.advisorTool).toBeNull();
    expect(result.useBetaApi).toBe(false);
    expect(result.customReviewerModel).toBe('claude-haiku-4-5-20251001');
  });

  it('detects safety keywords in custom mode', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'help with my electrical panel');
    expect(result.advisorMode).toBe('custom');
    expect(result.safetyKeywordsDetected).toBe(true);
    expect(result.safetyKeywordsMatched).toContain('electrical panel');
  });

  it('skips custom review for quick_question intent (selective invocation)', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What color paint for my bedroom?');
    expect(result.advisorMode).toBe('off');
    expect(result.customReviewerModel).toBeNull();
  });

  it('does not skip custom review for quick_question with safety keywords', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('quick_question', 'What wire gauge for a circuit breaker?');
    expect(result.advisorMode).toBe('custom');
    expect(result.safetyKeywordsDetected).toBe(true);
  });

  it('does not boost when no safety keywords match in custom mode', async () => {
    process.env.ADVISOR_MODE = 'custom';
    const { resolveAdvisorConfig } = await import('@/lib/advisor-resolver');
    const result = resolveAdvisorConfig('full_project', 'I want to paint my bedroom');
    expect(result.safetyKeywordsDetected).toBe(false);
    expect(result.advisorMode).toBe('custom');
  });
});
