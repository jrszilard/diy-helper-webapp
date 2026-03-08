import type { StreamEvent } from '../../lib/tools/types';

/**
 * Converts an array of StreamEvent objects into an SSE-formatted body string
 * matching the format used in app/api/chat/route.ts:
 *   data: {"type":"text","content":"..."}\n\n
 */
export function buildSSEBody(events: StreamEvent[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

/**
 * Returns headers for an SSE response, matching the chat API route.
 */
export function sseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };
}
