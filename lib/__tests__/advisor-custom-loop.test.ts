import { describe, it, expect, vi } from 'vitest';
import { runCustomReviewLoop } from '@/lib/advisor-custom-loop';
import type { ReviewModelProvider } from '@/lib/advisor-provider';

function makeMockProvider(responses: string[]): ReviewModelProvider {
  let callIndex = 0;
  return {
    name: 'mock',
    model: 'mock-model',
    call: vi.fn(async () => {
      const text = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return { text, inputTokens: 500, outputTokens: 200 };
    }),
  };
}

function approveJson() {
  return '```json\n' + JSON.stringify({
    verdict: 'APPROVE',
    confidence: 0.95,
    issues: [],
  }) + '\n```';
}

function reviseJson(revisedResponse: string, issues?: unknown[]) {
  return '```json\n' + JSON.stringify({
    verdict: 'REVISE',
    confidence: 0.8,
    issues: issues ?? [{ rubricItem: 3, severity: 'critical', finding: 'Missing safety warning', suggestedFix: 'Add warning' }],
    revisedResponse,
  }) + '\n```';
}

describe('runCustomReviewLoop', () => {
  it('returns original response when reviewer approves on first pass', async () => {
    const provider = makeMockProvider([approveJson()]);
    const result = await runCustomReviewLoop({
      userMessage: 'How do I patch drywall?',
      draftResponse: 'To patch drywall, first cut a square...',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
    expect(result.finalResponse).toBe('To patch drywall, first cut a square...');
    expect(result.iterationsUsed).toBe(1);
    expect(result.wasRevised).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it('returns revised response when reviewer requests revision', async () => {
    const provider = makeMockProvider([
      reviseJson('Corrected: To patch drywall safely...'),
      approveJson(),
    ]);
    const result = await runCustomReviewLoop({
      userMessage: 'How do I replace an outlet?',
      draftResponse: 'Just pull the outlet out and...',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['outlet install'],
    });
    expect(result.finalResponse).toBe('Corrected: To patch drywall safely...');
    expect(result.iterationsUsed).toBe(2);
    expect(result.wasRevised).toBe(true);
    expect(result.issues).toHaveLength(1);
  });

  it('stops after maxIterations even with continued REVISE verdicts', async () => {
    const provider = makeMockProvider([
      reviseJson('Revision 1'),
      reviseJson('Revision 2'),
    ]);
    const result = await runCustomReviewLoop({
      userMessage: 'Gas line question',
      draftResponse: 'Original draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['gas line'],
    });
    expect(result.finalResponse).toBe('Revision 2');
    expect(result.iterationsUsed).toBe(2);
    expect(provider.call).toHaveBeenCalledTimes(2);
  });

  it('tracks reviewer token usage across iterations', async () => {
    const provider = makeMockProvider([
      reviseJson('Revision 1'),
      approveJson(),
    ]);
    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
    expect(result.reviewerTokens.inputTokens).toBe(1000);
    expect(result.reviewerTokens.outputTokens).toBe(400);
  });

  it('handles malformed reviewer JSON gracefully', async () => {
    const provider = makeMockProvider(['This is not JSON at all']);
    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Original draft',
      provider,
      maxIterations: 2,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
    expect(result.finalResponse).toBe('Original draft');
    expect(result.parseErrors).toHaveLength(1);
  });

  it('includes rubric version in result', async () => {
    const provider = makeMockProvider([approveJson()]);
    const result = await runCustomReviewLoop({
      userMessage: 'Test',
      draftResponse: 'Draft',
      provider,
      maxIterations: 1,
      earlyStopOnApproval: true,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
    expect(result.rubricVersion).toBeGreaterThanOrEqual(1);
  });
});
