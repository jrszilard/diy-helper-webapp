import { describe, it, expect } from 'vitest';
import {
  createAdvisorMetrics,
  recordApiCall,
  recordAdvisorUsage,
  calculateEstimatedCost,
  type AdvisorMetrics,
} from '@/lib/advisor-metrics';

describe('createAdvisorMetrics', () => {
  it('initializes with zeroed counters', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
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
    expect(metrics.advisorLatencyMs).toEqual([]);
    expect(metrics.totalLatencyMs).toBe(0);
  });
});

describe('recordApiCall', () => {
  it('accumulates executor tokens across calls', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
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
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 2,
      safetyKeywordsDetected: true,
      safetyKeywordsMatched: ['electrical panel'],
    });

    recordApiCall(metrics, { inputTokens: 100, outputTokens: 50, latencyMs: 500 });
    recordApiCall(metrics, { inputTokens: 200, outputTokens: 100, latencyMs: 700 });

    expect(metrics.advisorLatencyMs).toEqual([500, 700]);
  });
});

describe('recordAdvisorUsage', () => {
  it('increments advisor use count and tokens', () => {
    const metrics = createAdvisorMetrics({
      requestId: 'req-123',
      intentType: 'full_project',
      executorModel: 'claude-sonnet-4-6',
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
      advisorModel: null,
      advisorMaxUses: 0,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      advisorLatencyMs: [],
      totalLatencyMs: 500,
      executorInputTokens: 1000,
      executorOutputTokens: 500,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
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
      advisorModel: 'claude-opus-4-6',
      advisorMaxUses: 3,
      advisorActualUses: 0,
      safetyKeywordsDetected: false,
      safetyKeywordsMatched: [],
      advisorLatencyMs: [],
      totalLatencyMs: 2000,
      executorInputTokens: 2000,
      executorOutputTokens: 1000,
      advisorInputTokens: 0,
      advisorOutputTokens: 0,
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
