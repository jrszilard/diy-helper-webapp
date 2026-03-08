import type { ExpertContext } from '@/lib/marketplace/types';

const CODE_SPECIFIC_CATEGORIES = ['electrical', 'plumbing', 'hvac', 'roofing', 'concrete'];

export interface DifficultyResult {
  score: number;       // 1-10
  tier: 'standard' | 'complex' | 'specialist';
  factors: string[];   // Human-readable explanations
}

/**
 * Score the difficulty of a Q&A question based on AI report context and question signals.
 *
 * Scoring factors:
 * - proRequired: +3
 * - Safety warnings: +1 each (max 3)
 * - Photos over 2: +1 each (max 2)
 * - Code-specific category: +1
 * - Skill level advanced: +2, intermediate: +1
 * - Question text length > 200 chars: +1
 * - Estimated cost > $500: +1
 *
 * Base score: 1 (every question starts at 1)
 * Max possible: ~14, clamped to 10
 */
export function scoreDifficulty(params: {
  context: ExpertContext | null;
  category: string;
  questionText: string;
  photoCount: number;
}): DifficultyResult {
  const { context, category, questionText, photoCount } = params;
  let score = 1;
  const factors: string[] = [];

  // Pro required
  if (context?.proRequired) {
    score += 3;
    factors.push('Professional recommended');
  }

  // Safety warnings
  const warningCount = Math.min(context?.safetyWarnings?.length ?? 0, 3);
  if (warningCount > 0) {
    score += warningCount;
    factors.push(`${warningCount} safety consideration${warningCount > 1 ? 's' : ''}`);
  }

  // Photos beyond 2
  const extraPhotos = Math.min(Math.max(photoCount - 2, 0), 2);
  if (extraPhotos > 0) {
    score += extraPhotos;
    factors.push(`${photoCount} photos attached`);
  }

  // Code-specific category
  if (CODE_SPECIFIC_CATEGORIES.includes(category)) {
    score += 1;
    factors.push(`Code-regulated trade (${category})`);
  }

  // Skill level
  const skillLevel = context?.skillLevel?.toLowerCase() || '';
  if (skillLevel === 'advanced') {
    score += 2;
    factors.push('Advanced skill level');
  } else if (skillLevel === 'intermediate') {
    score += 1;
    factors.push('Intermediate skill level');
  }

  // Question text complexity
  if (questionText.length > 200) {
    score += 1;
    factors.push('Detailed question');
  }

  // Estimated cost
  if ((context?.estimatedCost ?? 0) > 500) {
    score += 1;
    factors.push('High-value project');
  }

  // Clamp 1-10
  score = Math.max(1, Math.min(10, score));

  // Map to tier
  let tier: DifficultyResult['tier'];
  if (score <= 3) {
    tier = 'standard';
  } else if (score <= 6) {
    tier = 'complex';
  } else {
    tier = 'specialist';
  }

  return { score, tier, factors };
}
