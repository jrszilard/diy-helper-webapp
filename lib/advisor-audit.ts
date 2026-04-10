// Audit trail: logs every review verdict to Supabase for compliance and drift detection.
// Required for safety-critical domains (arXiv:2510.02453 §9).

import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

interface ReviewVerdictLog {
  requestId: string;
  intentType: string;
  advisorMode: 'beta' | 'custom';
  reviewerModel: string;
  userQuestion: string;
  draftResponse: string;
  verdict: 'APPROVE' | 'REVISE';
  confidence: number | null;
  issues: unknown[];
  revisedResponse: string | null;
  iterationsUsed: number;
  safetyKeywords: string[];
  rubricVersion: number;
  reviewerTokensIn: number;
  reviewerTokensOut: number;
  latencyMs: number;
}

export async function logReviewVerdict(params: ReviewVerdictLog): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('advisor_review_log')
      .insert({
        request_id: params.requestId,
        intent_type: params.intentType,
        advisor_mode: params.advisorMode,
        reviewer_model: params.reviewerModel,
        user_question: params.userQuestion,
        draft_response: params.draftResponse,
        verdict: params.verdict,
        confidence: params.confidence,
        issues: params.issues,
        revised_response: params.revisedResponse,
        iterations_used: params.iterationsUsed,
        safety_keywords: params.safetyKeywords,
        rubric_version: params.rubricVersion,
        reviewer_tokens_in: params.reviewerTokensIn,
        reviewer_tokens_out: params.reviewerTokensOut,
        latency_ms: params.latencyMs,
      });

    if (error) {
      logger.error('Failed to log review verdict', { error, requestId: params.requestId });
    }
  } catch (err) {
    logger.error('Exception logging review verdict', { error: err, requestId: params.requestId });
  }
}
