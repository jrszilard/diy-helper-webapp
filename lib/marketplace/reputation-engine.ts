import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ── Expert Levels ──────────────────────────────────────────────────────────

export type ExpertLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export const LEVEL_THRESHOLDS: Record<ExpertLevel, number> = {
  bronze: 0,
  silver: 40,
  gold: 65,
  platinum: 85,
};

export function getExpertLevel(score: number): ExpertLevel {
  if (score >= LEVEL_THRESHOLDS.platinum) return 'platinum';
  if (score >= LEVEL_THRESHOLDS.gold) return 'gold';
  if (score >= LEVEL_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export const LEVEL_LABELS: Record<ExpertLevel, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const LEVEL_COLORS: Record<ExpertLevel, { bg: string; text: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-800' },
  silver: { bg: 'bg-gray-200', text: 'text-gray-700' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  platinum: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

// ── Score Weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  avgRating: 0.30,           // 30% — raw star rating (most visible to DIYers)
  acceptanceRate: 0.20,      // 20% — answer accepted / total answered
  responseTime: 0.15,        // 15% — faster = better
  tierUpgradeRate: 0.15,     // 15% — DIYers continue past Tier 1 (value signal)
  correctionQuality: 0.10,   // 10% — report corrections submitted
  graduationRate: 0.10,      // 10% — Q&A → project conversions
};

// ── Recalculate Reputation ─────────────────────────────────────────────────

export interface ReputationMetrics {
  avgRating: number;
  totalReviews: number;
  totalQuestionsAnswered: number;
  totalQuestionsClaimed: number;
  acceptedCount: number;
  avgResponseMinutes: number | null;
  tierUpgradeCount: number;
  tierEligibleCount: number;
  totalCorrections: number;
  totalGraduations: number;
}

/**
 * Fetch the raw metrics needed for reputation scoring.
 */
export async function fetchReputationMetrics(
  adminClient: SupabaseClient,
  expertId: string,
): Promise<ReputationMetrics> {
  // Get basic profile stats
  const { data: profile } = await adminClient
    .from('expert_profiles')
    .select('avg_rating, total_reviews')
    .eq('id', expertId)
    .single();

  // Count questions claimed and answered
  const { count: claimedCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .in('status', ['claimed', 'answered', 'in_conversation', 'resolve_proposed', 'accepted', 'resolved']);

  const { count: answeredCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .in('status', ['answered', 'in_conversation', 'resolve_proposed', 'accepted', 'resolved']);

  // Count accepted answers
  const { count: acceptedCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .in('status', ['accepted', 'resolved']);

  // Average response time (claimed_at → first expert message or answer)
  const { data: responseTimes } = await adminClient
    .from('qa_questions')
    .select('claimed_at, answered_at')
    .eq('expert_id', expertId)
    .not('claimed_at', 'is', null)
    .not('answered_at', 'is', null)
    .limit(50)
    .order('created_at', { ascending: false });

  let avgResponseMinutes: number | null = null;
  if (responseTimes && responseTimes.length > 0) {
    const totalMinutes = responseTimes.reduce((sum, q) => {
      const claimed = new Date(q.claimed_at).getTime();
      const answered = new Date(q.answered_at).getTime();
      return sum + (answered - claimed) / 60000;
    }, 0);
    avgResponseMinutes = Math.round(totalMinutes / responseTimes.length);
  }

  // Tier upgrade rate: questions where current_tier > 1 / questions with messages
  const { count: tierUpgradeCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .gt('current_tier', 1);

  const { count: tierEligibleCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .eq('is_threaded', true);

  // Corrections submitted
  const { count: correctionCount } = await adminClient
    .from('report_corrections')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId);

  // Project graduations
  const { count: graduationCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .not('graduated_to_rfp_id', 'is', null);

  return {
    avgRating: profile?.avg_rating ? Number(profile.avg_rating) : 0,
    totalReviews: profile?.total_reviews || 0,
    totalQuestionsAnswered: answeredCount || 0,
    totalQuestionsClaimed: claimedCount || 0,
    acceptedCount: acceptedCount || 0,
    avgResponseMinutes,
    tierUpgradeCount: tierUpgradeCount || 0,
    tierEligibleCount: tierEligibleCount || 0,
    totalCorrections: correctionCount || 0,
    totalGraduations: graduationCount || 0,
  };
}

/**
 * Calculate the composite reputation score (0-100).
 */
export function calculateReputationScore(metrics: ReputationMetrics): number {
  // 1. Rating score (0-100): normalize 1-5 → 0-100
  const ratingScore = metrics.totalReviews > 0
    ? ((metrics.avgRating - 1) / 4) * 100
    : 50; // default for new experts

  // 2. Acceptance rate (0-100)
  const acceptanceRate = metrics.totalQuestionsAnswered > 0
    ? (metrics.acceptedCount / metrics.totalQuestionsAnswered) * 100
    : 50;

  // 3. Response time score (0-100): <15min = 100, 15-30min = 80, 30-60min = 60, 60-120min = 40, >120min = 20
  let responseTimeScore: number;
  if (metrics.avgResponseMinutes === null) {
    responseTimeScore = 50;
  } else if (metrics.avgResponseMinutes <= 15) {
    responseTimeScore = 100;
  } else if (metrics.avgResponseMinutes <= 30) {
    responseTimeScore = 80;
  } else if (metrics.avgResponseMinutes <= 60) {
    responseTimeScore = 60;
  } else if (metrics.avgResponseMinutes <= 120) {
    responseTimeScore = 40;
  } else {
    responseTimeScore = 20;
  }

  // 4. Tier upgrade rate (0-100): % of threaded conversations where DIYer upgraded
  const tierUpgradeScore = metrics.tierEligibleCount > 0
    ? (metrics.tierUpgradeCount / metrics.tierEligibleCount) * 100
    : 50;

  // 5. Correction quality (0-100): bonus for submitting corrections (capped)
  const correctionScore = Math.min(100, metrics.totalCorrections * 20);

  // 6. Graduation rate (0-100): bonus for converting Q&A to projects (capped)
  const graduationScore = Math.min(100, metrics.totalGraduations * 25);

  // Weighted composite
  const composite =
    ratingScore * WEIGHTS.avgRating +
    acceptanceRate * WEIGHTS.acceptanceRate +
    responseTimeScore * WEIGHTS.responseTime +
    tierUpgradeScore * WEIGHTS.tierUpgradeRate +
    correctionScore * WEIGHTS.correctionQuality +
    graduationScore * WEIGHTS.graduationRate;

  // Volume bonus: experts with more answered questions get a small boost (up to +5 pts)
  const volumeBonus = Math.min(5, metrics.totalQuestionsAnswered * 0.5);

  return Math.round(Math.min(100, composite + volumeBonus) * 100) / 100;
}

/**
 * Recalculate and persist an expert's reputation score.
 */
export async function recalculateReputation(
  adminClient: SupabaseClient,
  expertId: string,
): Promise<{ score: number; level: ExpertLevel; metrics: ReputationMetrics }> {
  const metrics = await fetchReputationMetrics(adminClient, expertId);
  const score = calculateReputationScore(metrics);
  const level = getExpertLevel(score);

  const acceptanceRate = metrics.totalQuestionsAnswered > 0
    ? Math.round((metrics.acceptedCount / metrics.totalQuestionsAnswered) * 10000) / 100
    : 0;

  const tierUpgradeRate = metrics.tierEligibleCount > 0
    ? Math.round((metrics.tierUpgradeCount / metrics.tierEligibleCount) * 10000) / 100
    : 0;

  const { error } = await adminClient
    .from('expert_profiles')
    .update({
      reputation_score: score,
      expert_level: level,
      acceptance_rate: acceptanceRate,
      avg_response_minutes: metrics.avgResponseMinutes,
      tier_upgrade_rate: tierUpgradeRate,
      total_questions_answered: metrics.totalQuestionsAnswered,
      total_questions_claimed: metrics.totalQuestionsClaimed,
      total_corrections: metrics.totalCorrections,
      total_graduations: metrics.totalGraduations,
      reputation_updated_at: new Date().toISOString(),
    })
    .eq('id', expertId);

  if (error) {
    logger.error('Failed to update reputation', error, { expertId });
  }

  return { score, level, metrics };
}

// ── Queue Priority Score ───────────────────────────────────────────────────

/**
 * Calculate queue priority for an expert viewing questions.
 * Higher score = expert sees better questions / gets priority.
 * Used by the queue API to filter or sort.
 */
export function getQueuePriorityTier(level: ExpertLevel): 'standard' | 'priority' | 'premium' {
  switch (level) {
    case 'platinum': return 'premium';
    case 'gold': return 'priority';
    default: return 'standard';
  }
}
