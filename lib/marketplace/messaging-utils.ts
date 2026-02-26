// Shared content sanitization utilities for marketplace messaging.
// Used by both marketplace_messages and qa_messages.

// ── Pattern Definitions ────────────────────────────────────────────────────

// Standard phone: (555) 123-4567, 555.123.4567, +1-555-123-4567
const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

// Email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// URLs (http/https/www)
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;

// Social media handles: @username patterns (Twitter/X, Instagram, TikTok)
const SOCIAL_HANDLE_REGEX = /(?:^|\s)@([a-zA-Z0-9_]{2,30})(?=\s|$|[.,!?])/g;

// NLP phrases that precede contact info
const CONTACT_PHRASE_PATTERNS = [
  /call\s+me\s+(?:at\s+)?(?:on\s+)?(.{5,30})/gi,
  /text\s+me\s+(?:at\s+)?(?:on\s+)?(.{5,30})/gi,
  /my\s+(?:phone\s+)?number\s+is\s+(.{5,30})/gi,
  /reach\s+me\s+(?:at\s+)?(?:on\s+)?(.{5,30})/gi,
  /contact\s+me\s+(?:at\s+)?(?:on\s+)?(.{5,30})/gi,
  /(?:here(?:'s|s)?\s+my|my)\s+(?:cell|mobile|phone|number|email|contact)\s*[:.]?\s*(.{5,30})/gi,
  /(?:find|add|follow|message|dm|hit)\s+me\s+(?:on|at|up\s+on)\s+(.{5,30})/gi,
  /(?:whatsapp|signal|telegram|venmo|cashapp|zelle)\s*[:.]?\s*(.{5,30})/gi,
];

// Spelled-out phone numbers: "five five five, one two three, four five six seven"
const DIGIT_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  oh: '0',
};
const DIGIT_WORD_PATTERN = new RegExp(
  `(?:${Object.keys(DIGIT_WORDS).join('|')})(?:[\\s,.-]+(?:${Object.keys(DIGIT_WORDS).join('|')})){6,}`,
  'gi'
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface SanitizationResult {
  sanitized: string;
  wasFlagged: boolean;
  flags: SanitizationFlag[];
}

export interface SanitizationFlag {
  type: 'phone' | 'email' | 'url' | 'social_handle' | 'contact_phrase' | 'spelled_number';
  matched: string;
}

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Simple sanitization — replaces contact info and returns clean string.
 * Backwards-compatible with existing callers.
 */
export function sanitizeContent(content: string): string {
  return sanitizeContentDetailed(content).sanitized;
}

/**
 * Detailed sanitization — returns the sanitized string plus flagging info
 * for activity logging.
 */
export function sanitizeContentDetailed(content: string): SanitizationResult {
  const flags: SanitizationFlag[] = [];
  let text = content;

  // 1. Detect and replace spelled-out phone numbers
  text = text.replace(DIGIT_WORD_PATTERN, (match) => {
    flags.push({ type: 'spelled_number', matched: match.trim() });
    return '[contact removed]';
  });

  // 2. NLP contact phrases — replace the whole phrase
  for (const pattern of CONTACT_PHRASE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    text = text.replace(pattern, (match) => {
      flags.push({ type: 'contact_phrase', matched: match.trim() });
      return '[contact removed]';
    });
  }

  // 3. URLs
  text = text.replace(URL_REGEX, (match) => {
    flags.push({ type: 'url', matched: match });
    return '[link removed]';
  });

  // 4. Phone numbers (standard digit format)
  text = text.replace(PHONE_REGEX, (match) => {
    flags.push({ type: 'phone', matched: match });
    return '[phone removed]';
  });

  // 5. Email addresses
  text = text.replace(EMAIL_REGEX, (match) => {
    flags.push({ type: 'email', matched: match });
    return '[email removed]';
  });

  // 6. Social media handles
  text = text.replace(SOCIAL_HANDLE_REGEX, (match, handle) => {
    // Don't flag common non-handle @ mentions (like @here, @all, @everyone)
    const skipWords = new Set(['here', 'all', 'everyone', 'channel']);
    if (skipWords.has(handle.toLowerCase())) return match;
    flags.push({ type: 'social_handle', matched: `@${handle}` });
    return ' [handle removed]';
  });

  return {
    sanitized: text,
    wasFlagged: flags.length > 0,
    flags,
  };
}
