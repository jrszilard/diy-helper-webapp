// Custom review loop — iterative safety review using a model-agnostic provider.
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §4: Prompt-only approach is phase 1; fine-tuning at ~200+ curated examples.
// §6: Fallback to original response on parse failure (graceful degradation).
// §8: Early stopping and max iteration cap (diminishing returns after 2-3 iterations).

import { buildReviewPrompt, RUBRIC_VERSION } from '@/lib/advisor-rubric';
import type { FewShotExample } from '@/lib/advisor-rubric';
import type { ReviewModelProvider } from '@/lib/advisor-provider';
import { logger } from '@/lib/logger';

export interface ReviewIssue {
  rubricItem: number;
  severity: 'critical' | 'warning';
  finding: string;
  suggestedFix: string;
}

export interface ReviewVerdict {
  verdict: 'APPROVE' | 'REVISE';
  confidence: number;
  issues: ReviewIssue[];
  revisedResponse?: string;
}

export interface ReviewLoopResult {
  finalResponse: string;
  wasRevised: boolean;
  iterationsUsed: number;
  issues: ReviewIssue[];
  reviewerTokens: { inputTokens: number; outputTokens: number };
  parseErrors: string[];
  latencyMs: number;
  rubricVersion: number;
}

interface ReviewLoopParams {
  userMessage: string;
  draftResponse: string;
  provider: ReviewModelProvider;
  maxIterations: number;
  earlyStopOnApproval: boolean;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  fewShotExamples?: FewShotExample[];
}

function parseVerdict(text: string): ReviewVerdict | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    if (parsed.verdict !== 'APPROVE' && parsed.verdict !== 'REVISE') return null;
    return parsed as ReviewVerdict;
  } catch {
    return null;
  }
}

export async function runCustomReviewLoop(params: ReviewLoopParams): Promise<ReviewLoopResult> {
  const {
    userMessage,
    draftResponse,
    provider,
    maxIterations,
    earlyStopOnApproval,
    safetyKeywordsDetected,
    safetyKeywordsMatched,
    fewShotExamples,
  } = params;

  const startTime = Date.now();

  const result: ReviewLoopResult = {
    finalResponse: draftResponse,
    wasRevised: false,
    iterationsUsed: 0,
    issues: [],
    reviewerTokens: { inputTokens: 0, outputTokens: 0 },
    parseErrors: [],
    latencyMs: 0,
    rubricVersion: RUBRIC_VERSION,
  };

  let currentDraft = draftResponse;

  for (let i = 0; i < maxIterations; i++) {
    result.iterationsUsed++;

    const reviewPrompt = buildReviewPrompt({
      userQuestion: userMessage,
      draftResponse: currentDraft,
      safetyKeywordsDetected,
      safetyKeywordsMatched,
      fewShotExamples,
    });

    let response;
    try {
      response = await provider.call(undefined, reviewPrompt);
    } catch (err) {
      logger.error('Custom review loop API call failed', { error: err, iteration: i + 1 });
      break;
    }

    result.reviewerTokens.inputTokens += response.inputTokens;
    result.reviewerTokens.outputTokens += response.outputTokens;

    if (!response.text) {
      result.parseErrors.push(`Iteration ${i + 1}: empty response from reviewer`);
      break;
    }

    const verdict = parseVerdict(response.text);
    if (!verdict) {
      result.parseErrors.push(`Iteration ${i + 1}: could not parse verdict JSON`);
      break;
    }

    if (verdict.verdict === 'APPROVE') {
      if (earlyStopOnApproval) break;
      continue;
    }

    // REVISE verdict
    result.issues.push(...verdict.issues);

    if (verdict.revisedResponse) {
      currentDraft = verdict.revisedResponse;
      result.finalResponse = currentDraft;
      result.wasRevised = true;
    }
  }

  result.latencyMs = Date.now() - startTime;
  return result;
}
