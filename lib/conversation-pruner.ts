import { pruning } from '@/lib/config';

interface Message {
  role: 'user' | 'assistant';
  // Content is either a plain string or an array of Anthropic content blocks (tool_use, tool_result, text, etc.)
  // Using generic record type since this passes through from client to Anthropic API
  content: string | Array<Record<string, unknown>>;
}

/**
 * Prune a conversation history to stay within token limits.
 * - If total chars > pruning.maxTotalChars (~80k chars ≈ 20k tokens):
 *   - Keep first N messages (establishes context)
 *   - Keep last M messages (recent context)
 *   - Insert a summary marker between them noting how many messages were dropped
 * - Truncate any individual message over pruning.maxSingleMessageChars chars
 * - If under threshold, return as-is
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

  // Need to prune: keep first N and last M
  const keepFirst = Math.min(pruning.keepFirstMessages, truncated.length);
  const keepLast = Math.min(pruning.keepLastMessages, truncated.length - keepFirst);

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
