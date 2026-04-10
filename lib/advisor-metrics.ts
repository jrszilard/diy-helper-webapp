import { logger } from '@/lib/logger';

export interface AdvisorMetrics {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorModel: string | null;
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
}

interface CreateMetricsParams {
  requestId: string;
  intentType: string;
  executorModel: string;
  advisorModel: string | null;
  advisorMaxUses: number;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
}

interface ApiCallResult {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

// Per-million-token pricing (USD). Update when Anthropic changes pricing.
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

export function calculateEstimatedCost(metrics: AdvisorMetrics): number {
  const executorRate = TOKEN_RATES[metrics.executorModel] || DEFAULT_RATE;
  const executorCost =
    (metrics.executorInputTokens / 1_000_000) * executorRate.input +
    (metrics.executorOutputTokens / 1_000_000) * executorRate.output;

  let advisorCost = 0;
  if (metrics.advisorModel) {
    const advisorRate = TOKEN_RATES[metrics.advisorModel] || DEFAULT_RATE;
    advisorCost =
      (metrics.advisorInputTokens / 1_000_000) * advisorRate.input +
      (metrics.advisorOutputTokens / 1_000_000) * advisorRate.output;
  }

  return executorCost + advisorCost;
}

export function logAdvisorMetrics(metrics: AdvisorMetrics): void {
  metrics.totalLatencyMs = metrics.apiCallLatencyMs.reduce((a, b) => a + b, 0);
  const estimatedCostUsd = calculateEstimatedCost(metrics);

  logger.info('Advisor metrics', {
    requestId: metrics.requestId,
    intentType: metrics.intentType,
    executorModel: metrics.executorModel,
    advisorModel: metrics.advisorModel,
    advisorEnabled: metrics.advisorMaxUses > 0,
    advisorMaxUses: metrics.advisorMaxUses,
    advisorActualUses: metrics.advisorActualUses,
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
