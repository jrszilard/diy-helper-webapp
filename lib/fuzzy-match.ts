/**
 * Fuzzy string matching utilities for inventory item deduplication.
 * Uses normalized string comparison and bigram similarity (Dice coefficient).
 */

const FILLER_WORDS = /\b(set of|pack of|box of|pair of|piece|pcs?|ea|each)\b/gi;
const SEPARATORS = /[-_/\\]+/g;

/**
 * Normalize an item name for comparison:
 * - Lowercase, trim, collapse whitespace
 * - Normalize separators: "10-mm" -> "10mm"
 * - Remove filler words
 * - Singularize basic plurals
 */
export function normalizeItemName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim();

  // Normalize common fractions BEFORE removing separators
  normalized = normalized
    .replace(/1\/2/g, '0.5')
    .replace(/1\/4/g, '0.25')
    .replace(/3\/4/g, '0.75')
    .replace(/3\/8/g, '0.375')
    .replace(/1\/8/g, '0.125');

  normalized = normalized
    .replace(FILLER_WORDS, '')
    .replace(SEPARATORS, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Singularize basic plurals (only trailing s/es on longer words)
  normalized = normalized.replace(/\b(\w{4,})(?:ies)\b/g, '$1y');
  normalized = normalized.replace(/\b(\w{4,})(?:es)\b/g, '$1');
  normalized = normalized.replace(/\b(\w{4,})s\b/g, '$1');

  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Generate character bigrams from a string.
 */
function bigrams(str: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    result.add(str.slice(i, i + 2));
  }
  return result;
}

/**
 * Dice coefficient (bigram similarity) between two strings.
 * Returns 0-1, where 1 is identical.
 */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Token overlap score between two strings.
 * Returns 0-1 based on what fraction of tokens overlap.
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = a.split(/\s+/).filter(t => t.length > 1);
  const tokensB = b.split(/\s+/).filter(t => t.length > 1);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  let matches = 0;
  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb || (ta.length > 3 && tb.startsWith(ta)) || (tb.length > 3 && ta.startsWith(tb))) {
        matches++;
        break;
      }
    }
  }

  const maxTokens = Math.max(tokensA.length, tokensB.length);
  return matches / maxTokens;
}

/**
 * Calculate fuzzy similarity between two item names.
 * Returns 0-1, combining normalized exact match, token overlap, and bigram similarity.
 */
export function fuzzyMatch(a: string, b: string): number {
  const normA = normalizeItemName(a);
  const normB = normalizeItemName(b);

  // Exact match after normalization
  if (normA === normB) return 1.0;

  // Substring match (one contains the other)
  if (normA.includes(normB) || normB.includes(normA)) {
    const shorter = Math.min(normA.length, normB.length);
    const longer = Math.max(normA.length, normB.length);
    const ratio = shorter / longer;
    // Only count as a match if the strings are very similar in length
    // "drill" (5) vs "drill press" (11) -> ratio 0.45 -> score ~0.58 (below 0.75 threshold)
    return 0.4 + 0.6 * ratio;
  }

  // Weighted combination of token overlap and bigram similarity
  const tokenScore = tokenOverlap(normA, normB);
  const diceScore = diceSimilarity(normA, normB);

  return 0.6 * tokenScore + 0.4 * diceScore;
}

/**
 * Check if two item names refer to the same item.
 */
export function isSameItem(a: string, b: string, threshold: number = 0.75): boolean {
  return fuzzyMatch(a, b) >= threshold;
}
