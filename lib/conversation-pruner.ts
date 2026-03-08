import { pruning } from '@/lib/config';

interface Message {
  role: 'user' | 'assistant';
  // Content is either a plain string or an array of Anthropic content blocks (tool_use, tool_result, text, etc.)
  // Using generic record type since this passes through from client to Anthropic API
  content: string | Array<Record<string, unknown>>;
}

/** Check if an assistant message contains tool_use blocks */
function hasToolUse(msg: Message): boolean {
  if (msg.role !== 'assistant' || typeof msg.content === 'string') return false;
  return msg.content.some(block => block.type === 'tool_use');
}

/** Check if a user message contains tool_result blocks */
function hasToolResult(msg: Message): boolean {
  if (msg.role !== 'user' || typeof msg.content === 'string') return false;
  return msg.content.some(block => block.type === 'tool_result');
}

/**
 * Snap a boundary index so it never splits a tool_use/tool_result pair.
 * If `index` falls between an assistant tool_use message and its paired user tool_result,
 * move it back before the tool_use so both stay together.
 */
function snapToTurnBoundary(messages: Message[], index: number): number {
  if (index <= 0 || index >= messages.length) return index;

  // If we're about to cut right after an assistant tool_use (leaving its tool_result orphaned),
  // pull the boundary back to before the tool_use.
  const prev = messages[index - 1];
  if (hasToolUse(prev)) {
    return index - 1;
  }

  // If the message at `index` is a user tool_result, its paired assistant tool_use is at index-1.
  // Keep both by pulling back.
  const curr = messages[index];
  if (curr && hasToolResult(curr) && index > 0 && hasToolUse(messages[index - 1])) {
    return index - 1;
  }

  return index;
}

/**
 * Prune a conversation history to stay within token limits.
 * - If total chars > pruning.maxTotalChars (~80k chars ≈ 20k tokens):
 *   - Keep first N messages (establishes context)
 *   - Keep last M messages (recent context)
 *   - Insert a summary marker between them noting how many messages were dropped
 * - Truncate any individual message over pruning.maxSingleMessageChars chars
 * - If under threshold, return as-is
 * - Tool_use/tool_result pairs are never split across the boundary
 */
export function pruneConversation(messages: Message[]): Message[] {
  if (messages.length === 0) return messages;

  // First, truncate individual messages that are too long
  const truncated = messages.map(msg => {
    if (typeof msg.content === 'string' && msg.content.length > pruning.maxSingleMessageChars) {
      return {
        ...msg,
        content: msg.content.slice(0, pruning.maxSingleMessageChars) + '\n\n[Message truncated due to length]',
      };
    }
    return msg;
  });

  // Calculate total character count
  const totalChars = truncated.reduce((sum, msg) => {
    const len = typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length;
    return sum + len;
  }, 0);

  if (totalChars <= pruning.maxTotalChars) {
    return truncated;
  }

  // Need to prune: keep first N and last M, snapped to turn boundaries
  let keepFirst = Math.min(pruning.keepFirstMessages, truncated.length);
  let keepLast = Math.min(pruning.keepLastMessages, truncated.length - keepFirst);

  // Snap the "first" boundary: ensure we don't cut mid-tool-pair at the end of the "first" section
  keepFirst = snapToTurnBoundary(truncated, keepFirst);

  // Snap the "last" boundary: the start of the "last" section
  const lastStart = truncated.length - keepLast;
  const snappedLastStart = snapToTurnBoundary(truncated, lastStart);
  keepLast = truncated.length - snappedLastStart;

  if (keepFirst + keepLast >= truncated.length) {
    return truncated;
  }

  const firstMessages = truncated.slice(0, keepFirst);
  const lastMessages = truncated.slice(truncated.length - keepLast);
  const droppedCount = truncated.length - keepFirst - keepLast;

  const summaryMarker: Message = {
    role: 'assistant',
    content: `[Earlier conversation context: ${droppedCount} messages were summarized to stay within context limits. The conversation started with the messages above and continues with the recent messages below.]`,
  };

  return [...firstMessages, summaryMarker, ...lastMessages];
}
