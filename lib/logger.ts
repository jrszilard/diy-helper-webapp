import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  duration?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = /api[_-]?key|secret|token|password|authorization|cookie/i;

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitize(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (meta) {
    const cleaned = sanitize(meta);
    Object.assign(entry, cleaned);
  }
  return entry;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    const entry = formatEntry('info', message, meta);
    console.log(JSON.stringify(entry));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    const entry = formatEntry('warn', message, meta);
    console.warn(JSON.stringify(entry));
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const entry = formatEntry('error', message, meta);
    if (error instanceof Error) {
      entry.errorMessage = error.message;
      entry.errorStack = error.stack;
    } else if (error !== undefined) {
      entry.errorMessage = String(error);
    }
    console.error(JSON.stringify(entry));

    // Forward to Sentry so explicitly-logged errors (e.g. caught API failures)
    // become alertable events, not just buried console lines. No-op until a DSN
    // is configured. Reuse sanitize() so secrets stay [REDACTED] in Sentry too.
    const context = { logMessage: message, ...(meta ? sanitize(meta) : {}) };
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: context });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: error !== undefined ? { ...context, error: String(error) } : context,
      });
    }
  },
};
