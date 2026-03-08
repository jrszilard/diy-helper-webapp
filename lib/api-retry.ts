/**
 * Reusable retry utility with exponential backoff.
 * Works with both fetch and SDK calls.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default predicate: only retry on 5xx, 429, and network errors.
 * Skip retries on 4xx client errors (except 429).
 */
function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true; // network error
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status === 429 || status >= 500;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('timeout') ||
        msg.includes('abort') || msg.includes('529') || msg.includes('500') ||
        msg.includes('502') || msg.includes('503') || msg.includes('overloaded')) {
      return true;
    }
  }
  return true; // default: retry unknown errors
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Classify an error for user-facing messages.
 */
export type ErrorType = 'network' | 'timeout' | 'server' | 'rate_limit' | 'client' | 'unknown';

export function classifyError(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'network';
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 429) return 'rate_limit';
    if (status >= 500) return 'server';
    if (status >= 400) return 'client';
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('failed to fetch')) {
      return 'network';
    }
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('timed out')) {
      return 'timeout';
    }
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
      return 'rate_limit';
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('529') ||
        msg.includes('overloaded') || msg.includes('unavailable')) {
      return 'server';
    }
  }
  return 'unknown';
}

export function getUserMessage(errorType: ErrorType): string {
  switch (errorType) {
    case 'network':
      return 'Could not connect. Please check your internet connection and try again.';
    case 'timeout':
      return 'The request timed out. Please try again.';
    case 'server':
      return 'Service temporarily unavailable. Please try again in a moment.';
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    case 'client':
      return 'There was an issue with the request. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
