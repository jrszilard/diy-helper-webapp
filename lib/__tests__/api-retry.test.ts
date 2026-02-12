import { describe, it, expect, vi } from 'vitest';
import { withRetry, classifyError, getUserMessage, ErrorType } from '../api-retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxRetries times', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('respects maxRetries=0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('skips retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('client error'));
    await expect(
      withRetry(fn, { baseDelayMs: 10, shouldRetry: () => false })
    ).rejects.toThrow('client error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const start = Date.now();
    await withRetry(fn, { maxRetries: 2, baseDelayMs: 50 });
    const elapsed = Date.now() - start;

    // First retry: 50ms, second retry: 100ms = 150ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('classifyError', () => {
  it('classifies TypeError with fetch as network', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('classifies AbortError as timeout', () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    expect(classifyError(err)).toBe('timeout');
  });

  it('classifies 429 status as rate_limit', () => {
    expect(classifyError({ status: 429 })).toBe('rate_limit');
  });

  it('classifies 500 status as server', () => {
    expect(classifyError({ status: 500 })).toBe('server');
  });

  it('classifies 400 status as client', () => {
    expect(classifyError({ status: 400 })).toBe('client');
  });

  it('classifies timeout message as timeout', () => {
    expect(classifyError(new Error('Request timed out'))).toBe('timeout');
  });

  it('classifies overloaded message as server', () => {
    expect(classifyError(new Error('Service overloaded'))).toBe('server');
  });

  it('returns unknown for unrecognized errors', () => {
    expect(classifyError(new Error('something weird'))).toBe('unknown');
  });
});

describe('getUserMessage', () => {
  it('returns appropriate messages for each error type', () => {
    const types: ErrorType[] = ['network', 'timeout', 'server', 'rate_limit', 'client', 'unknown'];
    for (const type of types) {
      const msg = getUserMessage(type);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(10);
    }
  });

  it('network message mentions connection', () => {
    expect(getUserMessage('network').toLowerCase()).toContain('connect');
  });

  it('timeout message mentions timeout', () => {
    expect(getUserMessage('timeout').toLowerCase()).toContain('timed out');
  });

  it('server message mentions unavailable', () => {
    expect(getUserMessage('server').toLowerCase()).toContain('unavailable');
  });
});
