import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '@/lib/system-prompt';

describe('getSystemPrompt', () => {
  it('returns full project prompt when no intent specified', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('CRITICAL WORKFLOW');
    expect(prompt).toContain('extract_materials_list');
    expect(prompt).toContain('EXPERT ESCALATION');
  });

  it('returns full project prompt for full_project intent', () => {
    const prompt = getSystemPrompt('full_project');
    expect(prompt).toContain('CRITICAL WORKFLOW');
    expect(prompt).toContain('extract_materials_list');
  });

  it('returns concise prompt for quick_question intent', () => {
    const prompt = getSystemPrompt('quick_question');
    expect(prompt).toContain('quick, direct answer');
    expect(prompt).toContain('go deeper');
    expect(prompt).not.toContain('CRITICAL WORKFLOW');
  });

  it('returns diagnostic prompt for troubleshooting intent', () => {
    const prompt = getSystemPrompt('troubleshooting');
    expect(prompt).toContain('diagnos');
    expect(prompt).toContain('step-by-step');
    expect(prompt).toContain('marketplace');
  });

  it('returns context-aware prompt for mid_project intent', () => {
    const prompt = getSystemPrompt('mid_project');
    expect(prompt).toContain('mid-project');
    expect(prompt).toContain('current step');
  });

  it('always includes safety information regardless of intent', () => {
    const intents = ['quick_question', 'troubleshooting', 'mid_project', 'full_project'] as const;
    for (const intent of intents) {
      const prompt = getSystemPrompt(intent);
      expect(prompt.toLowerCase()).toContain('safety');
    }
  });
});
