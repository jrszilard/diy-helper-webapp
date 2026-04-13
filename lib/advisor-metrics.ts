import { logger } from '@/lib/logger';

export interface AdvisorMetrics {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorMode: 'off' | 'beta' | 'custom';
  advisorModel: string | null;
  customReviewerModel: string | null;
  advisorMaxUses: number;
  advisorActualUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  apiCallLatencyMs: number[];
  totalLatencyMs: number;
  executorInputTokens: number;
  executorOutputTokens: number;
  advisorInputTokens: number;
  advisorOutputTokens: number;
  customLoopIterations: number;
  customLoopWasRevised: boolean;
  customLoopLatencyMs: number;
}

interface CreateMetricsParams {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorMode: 'off' | 'beta' | 'custom';
  advisorModel: string | null;
  customReviewerModel: string | null;
  advisorMaxUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
}

interface ApiCallResult {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const TOKEN_RATES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':            { input: 15.0,  output: 75.0  },
  'claude-sonnet-4-6':          { input: 3.0,   output: 15.0  },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.0   },
};

const DEFAULT_RATE = { input: 3.0, output: 15.0 };

export function createAdvisorMetrics(params: CreateMetricsParams): AdvisorMetrics {
  return {
    ...params,
    advisorActualUses: 0,
    apiCallLatencyMs: [],
    totalLatencyMs: 0,
    executorInputTokens: 0,
    executorOutputTokens: 0,
    advisorInputTokens: 0,
    advisorOutputTokens: 0,
    customLoopIterations: 0,
    customLoopWasRevised: false,
    customLoopLatencyMs: 0,
  };
}

export function recordApiCall(metrics: AdvisorMetrics, result: ApiCallResult): void {
  metrics.executorInputTokens += result.inputTokens;
  metrics.executorOutputTokens += result.outputTokens;
  metrics.apiCallLatencyMs.push(result.latencyMs);
}

export function recordAdvisorUsage(
  metrics: AdvisorMetrics,
  advisorInputTokens: number,
  advisorOutputTokens: number,
): void {
  metrics.advisorActualUses += 1;
  metrics.advisorInputTokens += advisorInputTokens;
  metrics.advisorOutputTokens += advisorOutputTokens;
}

interface CustomLoopResultParams {
  iterationsUsed: number;
  wasRevised: boolean;
  reviewerInputTokens: number;
  reviewerOutputTokens: number;
  latencyMs: number;
}

export function recordCustomLoopResult(
  metrics: AdvisorMetrics,
  result: CustomLoopResultParams,
): void {
  metrics.customLoopIterations = result.iterationsUsed;
  metrics.customLoopWasRevised = result.wasRevised;
  metrics.customLoopLatencyMs = result.latencyMs;
  metrics.advisorInputTokens += result.reviewerInputTokens;
  metrics.advisorOutputTokens += result.reviewerOutputTokens;
}

export function calculateEstimatedCost(metrics: AdvisorMetrics): number {
  const executorRate = TOKEN_RATES[metrics.executorModel] || DEFAULT_RATE;
  const executorCost =
    (metrics.executorInputTokens / 1_000_000) * executorRate.input +
    (metrics.executorOutputTokens / 1_000_000) * executorRate.output;

  let reviewerCost = 0;
  const reviewerModelId = metrics.advisorModel || metrics.customReviewerModel;
  if (reviewerModelId) {
    const reviewerRate = TOKEN_RATES[reviewerModelId] || DEFAULT_RATE;
    reviewerCost =
      (metrics.advisorInputTokens / 1_000_000) * reviewerRate.input +
      (metrics.advisorOutputTokens / 1_000_000) * reviewerRate.output;
  }

  return executorCost + reviewerCost;
}

export function logAdvisorMetrics(metrics: AdvisorMetrics): void {
  metrics.totalLatencyMs = metrics.apiCallLatencyMs.reduce((a, b) => a + b, 0);
  const estimatedCostUsd = calculateEstimatedCost(metrics);

  logger.info('Advisor metrics', {
    requestId: metrics.requestId,
    intentType: metrics.intentType,
    executorModel: metrics.executorModel,
    advisorMode: metrics.advisorMode,
    advisorModel: metrics.advisorModel,
    customReviewerModel: metrics.customReviewerModel,
    advisorEnabled: metrics.advisorMaxUses > 0 || metrics.advisorMode === 'custom',
    advisorMaxUses: metrics.advisorMaxUses,
    advisorActualUses: metrics.advisorActualUses,
    customLoopIterations: metrics.customLoopIterations,
    customLoopWasRevised: metrics.customLoopWasRevised,
    customLoopLatencyMs: metrics.customLoopLatencyMs,
    safetyKeywordsDetected: metrics.safetyKeywordsDetected,
    safetyKeywordsMatched: metrics.safetyKeywordsMatched,
    apiCallLatencyMs: metrics.apiCallLatencyMs,
    totalLatencyMs: metrics.totalLatencyMs,
    executorInputTokens: metrics.executorInputTokens,
    executorOutputTokens: metrics.executorOutputTokens,
    advisorInputTokens: metrics.advisorInputTokens,
    advisorOutputTokens: metrics.advisorOutputTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
  });
}
