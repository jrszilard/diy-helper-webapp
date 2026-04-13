import { describe, it, expect } from 'vitest';
import {
  createAdvisorMetrics,
  recordApiCall,
  recordAdvisorUsage,
  recordCustomLoopResult,
  calculateEstimatedCost,
  type AdvisorMetrics,
} from '@/lib/advisor-metrics';

describe('createAdvisorMetrics', () => {
  it('initializes with zeroed counters', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    expect(metrics.advisorActualUses).toBe(0);
    expect(metrics.executorInputTokens).toBe(0);
    expect(metrics.executorOutputTokens).toBe(0);
    expect(metrics.advisorInputTokens).toBe(0);
    expect(metrics.advisorOutputTokens).toBe(0);
    expect(metrics.apiCallLatencyMs).toEqual([]);
    expect(metrics.totalLatencyMs).toBe(0);
  });
});

describe('recordApiCall', () => {
  it('accumulates executor tokens across calls', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    recordApiCall(metrics, { inputTokens: 500, outputTokens: 200, latencyMs: 1200 });
    recordApiCall(metrics, { inputTokens: 600, outputTokens: 150, latencyMs: 800 });

    expect(metrics.executorInputTokens).toBe(1100);
    expect(metrics.executorOutputTokens).toBe(350);
  });

  it('tracks per-call latency', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'troubleshooting',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 2,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['electrical panel'],
    });

    recordApiCall(metrics, { inputTokens: 100, outputTokens: 50, latencyMs: 500 });
    recordApiCall(metrics, { inputTokens: 200, outputTokens: 100, latencyMs: 700 });

    expect(metrics.apiCallLatencyMs).toEqual([500, 700]);
  });
});

describe('recordAdvisorUsage', () => {
  it('increments advisor use count and tokens', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });

    recordAdvisorUsage(metrics, 800, 300);
    recordAdvisorUsage(metrics, 600, 200);

    expect(metrics.advisorActualUses).toBe(2);
    expect(metrics.advisorInputTokens).toBe(1400);
    expect(metrics.advisorOutputTokens).toBe(500);
  });
});

describe('calculateEstimatedCost', () => {
  it('calculates cost for executor-only request', () => {
    const metrics: AdvisorMetrics = {
      requestId: 'req-123',
      intentType: 'quick_question',
      executorModel: 'claude-haiku-4-5-20251001',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: null,
      advisorMaxUses: 0,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      apiCallLatencyMs: [],
      totalLatencyMs: 500,
      executorInputTokens: 1000,
      executorOutputTokens: 500,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
      customLoopIterations: 0,
      customLoopWasRevised: false,
      customLoopLatencyMs: 0,
    };

    const cost = calculateEstimatedCost(metrics);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });

  it('includes advisor cost when advisor was used', () => {
    const withoutAdvisor: AdvisorMetrics = {
      requestId: 'req-1',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'beta',
      customReviewerModel: null,
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      apiCallLatencyMs: [],
      totalLatencyMs: 2000,
      executorInputTokens: 2000,
      executorOutputTokens: 1000,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
      customLoopIterations: 0,
      customLoopWasRevised: false,
      customLoopLatencyMs: 0,
    };

    const withAdvisor: AdvisorMetrics = {
      ...withoutAdvisor,
      requestId: 'req-2',
      advisorActualUses: 2,
      advisorInputTokens: 1500,
      advisorOutputTokens: 500,
    };

    const costWithout = calculateEstimatedCost(withoutAdvisor);
    const costWith = calculateEstimatedCost(withAdvisor);
    expect(costWith).toBeGreaterThan(costWithout);
  });
});

describe('custom loop metrics', () => {
  it('tracks advisorMode field', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'test-1',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
    });
    expect(metrics.advisorMode).toBe('custom');
    expect(metrics.customReviewerModel).toBe('claude-haiku-4-5-20251001');
    expect(metrics.customLoopIterations).toBe(0);
    expect(metrics.customLoopWasRevised).toBe(false);
  });

  it('records custom loop results', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'test-2',
      intentType: 'troubleshooting',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['electrical panel'],
    });
    recordCustomLoopResult(metrics, {
      iterationsUsed: 2,
      wasRevised: true,
      reviewerInputTokens: 1000,
      reviewerOutputTokens: 400,
      latencyMs: 850,
    });
    expect(metrics.customLoopIterations).toBe(2);
    expect(metrics.customLoopWasRevised).toBe(true);
    expect(metrics.advisorInputTokens).toBe(1000);
    expect(metrics.advisorOutputTokens).toBe(400);
    expect(metrics.customLoopLatencyMs).toBe(850);
  });

  it('calculates cost correctly for custom mode using Haiku rates', () => {
    const metrics: AdvisorMetrics = {
      requestId: 'test-3',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
      advisorMode: 'custom',
      advisorModel: null,
      customReviewerModel: 'claude-haiku-4-5-20251001',
      advisorMaxUses: 0,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      apiCallLatencyMs: [],
      totalLatencyMs: 0,
      executorInputTokens: 1000,
      executorOutputTokens: 500,
      advisorInputTokens: 2000,
      advisorOutputTokens: 800,
      customLoopIterations: 2,
      customLoopWasRevised: true,
      customLoopLatencyMs: 850,
    };
    const cost = calculateEstimatedCost(metrics);
    // Sonnet: (1000/1M * 3.0) + (500/1M * 15.0) = 0.003 + 0.0075 = 0.0105
    // Haiku:  (2000/1M * 0.8) + (800/1M * 4.0)  = 0.0016 + 0.0032 = 0.0048
    // Total: 0.0153
    expect(cost).toBeCloseTo(0.0153, 4);
  });
});
