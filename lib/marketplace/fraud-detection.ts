import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ── Types ──────────────────────────────────────────────────────────────────

interface ActivityLogParams {
  eventType: 'sanitization_trigger' | 'rapid_messages' | 'short_conversation' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  expertId?: string;
  questionId?: string;
  consultationId?: string;
  description: string;
  originalContent?: string;
  metadata?: Record<string, unknown>;
}

interface FraudSignal {
  signal: string;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

// ── Activity Logging ───────────────────────────────────────────────────────

/**
 * Log a suspicious activity event to qa_activity_log.
 * Always best-effort — callers should catch errors.
 */
export async function logActivity(
  adminClient: SupabaseClient,
  params: ActivityLogParams
): Promise<void> {
  const { error } = await adminClient
    .from('qa_activity_log')
    .insert({
      event_type: params.eventType,
      severity: params.severity,
      user_id: params.userId || null,
      expert_id: params.expertId || null,
      question_id: params.questionId || null,
      consultation_id: params.consultationId || null,
      description: params.description,
      original_content: params.originalContent || null,
      metadata: params.metadata || {},
    });

  if (error) {
    logger.error('Failed to log activity', error, { eventType: params.eventType });
  }
}

// ── Fraud Signal Detection ─────────────────────────────────────────────────

/**
 * Check for rapid message exchange between the same two users.
 * Signal: >10 messages in 5 minutes between the same pair.
 */
export async function checkRapidMessages(
  adminClient: SupabaseClient,
  questionId: string,
): Promise<FraudSignal | null> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentMessages, error } = await adminClient
    .from('qa_messages')
    .select('id')
    .eq('question_id', questionId)
    .gte('created_at', fiveMinutesAgo);

  if (error || !recentMessages) return null;

  if (recentMessages.length > 10) {
    return {
      signal: 'rapid_messages',
      severity: recentMessages.length > 20 ? 'high' : 'medium',
      details: `${recentMessages.length} messages in 5 minutes on question ${questionId}`,
    };
  }

  return null;
}

/**
 * Check for suspiciously short conversations that resolve quickly.
 * Signal: conversation resolved in <3 messages and <5 minutes.
 * This could indicate the conversation moved off-platform.
 */
export async function checkShortConversation(
  adminClient: SupabaseClient,
  questionId: string,
): Promise<FraudSignal | null> {
  const { data: question } = await adminClient
    .from('qa_questions')
    .select('claimed_at, status, updated_at')
    .eq('id', questionId)
    .single();

  if (!question || !question.claimed_at) return null;
  if (!['accepted', 'resolved'].includes(question.status)) return null;

  const claimedAt = new Date(question.claimed_at).getTime();
  const resolvedAt = new Date(question.updated_at).getTime();
  const durationMinutes = (resolvedAt - claimedAt) / (1000 * 60);

  // Only flag if resolved very quickly
  if (durationMinutes > 5) return null;

  const { data: messages } = await adminClient
    .from('qa_messages')
    .select('id')
    .eq('question_id', questionId);

  const messageCount = messages?.length || 0;

  if (messageCount <= 3 && durationMinutes < 5) {
    return {
      signal: 'short_conversation',
      severity: 'medium',
      details: `Resolved in ${durationMinutes.toFixed(1)} min with ${messageCount} messages`,
    };
  }

  return null;
}

/**
 * Check for repeated sanitization triggers by the same user.
 * Signal: >3 sanitization events in 24 hours from the same user.
 */
export async function checkRepeatedSanitization(
  adminClient: SupabaseClient,
  userId: string,
): Promise<FraudSignal | null> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await adminClient
    .from('qa_activity_log')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'sanitization_trigger')
    .gte('created_at', dayAgo);

  if (error || !events) return null;

  if (events.length > 3) {
    return {
      signal: 'suspicious_pattern',
      severity: events.length > 6 ? 'high' : 'medium',
      details: `${events.length} sanitization triggers in 24h from user ${userId}`,
    };
  }

  return null;
}

/**
 * Check for repeated same expert-DIYer pairs with short conversations.
 * Signal: same pair resolved >2 conversations in <5 min each within 30 days.
 */
export async function checkRepeatedShortPairs(
  adminClient: SupabaseClient,
  diyerUserId: string,
  expertId: string,
): Promise<FraudSignal | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: questions, error } = await adminClient
    .from('qa_questions')
    .select('id, claimed_at, updated_at, status')
    .eq('diyer_user_id', diyerUserId)
    .eq('expert_id', expertId)
    .in('status', ['accepted', 'resolved'])
    .gte('created_at', thirtyDaysAgo);

  if (error || !questions) return null;

  // Count how many resolved in <5 min
  const quickResolves = questions.filter(q => {
    if (!q.claimed_at) return false;
    const duration = new Date(q.updated_at).getTime() - new Date(q.claimed_at).getTime();
    return duration < 5 * 60 * 1000;
  });

  if (quickResolves.length > 2) {
    return {
      signal: 'suspicious_pattern',
      severity: 'high',
      details: `${quickResolves.length} quick-resolved conversations between same DIYer-expert pair in 30 days`,
    };
  }

  return null;
}

/**
 * Run all fraud checks for a conversation event (e.g., after message send or resolution).
 * Logs any detected signals to qa_activity_log.
 */
export async function runFraudChecks(
  adminClient: SupabaseClient,
  params: {
    questionId: string;
    userId: string;
    expertId?: string;
    diyerUserId?: string;
  }
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  try {
    // Check rapid messages
    const rapidSignal = await checkRapidMessages(adminClient, params.questionId);
    if (rapidSignal) signals.push(rapidSignal);

    // Check repeated sanitization
    const sanitizationSignal = await checkRepeatedSanitization(adminClient, params.userId);
    if (sanitizationSignal) signals.push(sanitizationSignal);

    // Check short conversations
    const shortSignal = await checkShortConversation(adminClient, params.questionId);
    if (shortSignal) signals.push(shortSignal);

    // Check repeated pairs
    if (params.diyerUserId && params.expertId) {
      const pairSignal = await checkRepeatedShortPairs(adminClient, params.diyerUserId, params.expertId);
      if (pairSignal) signals.push(pairSignal);
    }

    // Log all detected signals
    for (const signal of signals) {
      await logActivity(adminClient, {
        eventType: signal.signal as ActivityLogParams['eventType'],
        severity: signal.severity,
        userId: params.userId,
        expertId: params.expertId,
        questionId: params.questionId,
        description: signal.details,
      });
    }
  } catch (err) {
    logger.error('Fraud check error', err, { questionId: params.questionId });
  }

  return signals;
}
