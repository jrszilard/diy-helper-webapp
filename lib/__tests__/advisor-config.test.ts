import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('advisor config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to disabled', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.enabled).toBe(false);
  });

  it('enables via ADVISOR_ENABLED env var', async () => {
    process.env.ADVISOR_ENABLED = 'true';
    const { advisor } = await import('@/lib/config');
    expect(advisor.enabled).toBe(true);
  });

  it('has four intent tiers with correct defaults', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.tiers.quick_question.executor).toBe('claude-haiku-4-5-20251001');
    expect(advisor.tiers.quick_question.advisor).toBeNull();
    expect(advisor.tiers.quick_question.maxUses).toBe(0);

    expect(advisor.tiers.troubleshooting.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.troubleshooting.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.troubleshooting.maxUses).toBe(2);

    expect(advisor.tiers.mid_project.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.mid_project.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.mid_project.maxUses).toBe(1);

    expect(advisor.tiers.full_project.executor).toBe('claude-sonnet-4-6');
    expect(advisor.tiers.full_project.advisor).toBe('claude-opus-4-6');
    expect(advisor.tiers.full_project.maxUses).toBe(3);
  });

  it('overrides executor model via env var', async () => {
    process.env.ADVISOR_EXECUTOR_QUICK = 'claude-sonnet-4-6';
    const { advisor } = await import('@/lib/config');
    expect(advisor.tiers.quick_question.executor).toBe('claude-sonnet-4-6');
  });

  it('has default safety keywords', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyCriticalKeywords).toContain('electrical panel');
    expect(advisor.safetyCriticalKeywords).toContain('gas line');
    expect(advisor.safetyCriticalKeywords).toContain('asbestos');
    expect(advisor.safetyCriticalKeywords.length).toBeGreaterThanOrEqual(10);
  });

  it('overrides safety keywords via env var', async () => {
    process.env.ADVISOR_SAFETY_KEYWORDS = 'custom keyword,another one';
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyCriticalKeywords).toEqual(['custom keyword', 'another one']);
  });

  it('defaults safetyBoostUses to 1', async () => {
    const { advisor } = await import('@/lib/config');
    expect(advisor.safetyBoostUses).toBe(1);
  });
});
