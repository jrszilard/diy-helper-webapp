import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

interface TimelineEvent {
  type: 'question' | 'answer' | 'correction' | 'note' | 'graduation' | 'second_opinion';
  date: string;
  title: string;
  detail: string | null;
  questionId?: string;
  expertName?: string;
}

/**
 * GET /api/reports/[id]/timeline — Aggregate all Q&A activity for a report.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { id } = await params;

    // Verify user owns this report
    const { data: report } = await auth.supabaseClient
      .from('project_reports')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (!report) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();
    const events: TimelineEvent[] = [];

    // 1. Q&A questions linked to this report
    const { data: questions } = await adminClient
      .from('qa_questions')
      .select('id, question_text, answer_text, status, category, expert_id, created_at, answered_at, graduated_to_rfp_id, is_second_opinion, expert_notes')
      .eq('report_id', id)
      .order('created_at', { ascending: true });

    // Gather expert IDs for name lookup
    const expertIds = new Set<string>();
    for (const q of questions || []) {
      if (q.expert_id) expertIds.add(q.expert_id);
    }

    // Lookup expert names
    const expertNames: Record<string, string> = {};
    if (expertIds.size > 0) {
      const { data: experts } = await adminClient
        .from('expert_profiles')
        .select('id, display_name')
        .in('id', [...expertIds]);
      for (const e of experts || []) {
        expertNames[e.id] = e.display_name;
      }
    }

    for (const q of questions || []) {
      // Question asked
      events.push({
        type: q.is_second_opinion ? 'second_opinion' : 'question',
        date: q.created_at,
        title: q.is_second_opinion ? 'Second opinion requested' : `Question asked: ${q.category}`,
        detail: q.question_text.slice(0, 150),
        questionId: q.id,
      });

      // Answer received
      if (q.answer_text && q.answered_at) {
        events.push({
          type: 'answer',
          date: q.answered_at,
          title: 'Expert answer received',
          detail: q.answer_text.slice(0, 150),
          questionId: q.id,
          expertName: q.expert_id ? expertNames[q.expert_id] : undefined,
        });
      }

      // Expert notes
      if (q.expert_notes) {
        events.push({
          type: 'note',
          date: q.answered_at || q.created_at,
          title: 'Expert insight notes added',
          detail: 'Tools, tips, and local code notes attached to your project',
          questionId: q.id,
          expertName: q.expert_id ? expertNames[q.expert_id] : undefined,
        });
      }

      // Graduation
      if (q.graduated_to_rfp_id) {
        events.push({
          type: 'graduation',
          date: q.answered_at || q.created_at,
          title: 'Graduated to project',
          detail: 'Q&A conversation graduated to a hands-on project',
          questionId: q.id,
        });
      }
    }

    // 2. Report corrections
    const { data: corrections } = await adminClient
      .from('report_corrections')
      .select('id, section_type, corrected_content, expert_id, created_at')
      .eq('report_id', id)
      .order('created_at', { ascending: true });

    for (const c of corrections || []) {
      events.push({
        type: 'correction',
        date: c.created_at,
        title: `Report correction: ${c.section_type.replace('_', ' ')}`,
        detail: c.corrected_content.slice(0, 150),
        expertName: c.expert_id ? expertNames[c.expert_id] : undefined,
      });
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Summary stats
    const stats = {
      totalQuestions: (questions || []).filter(q => !q.is_second_opinion).length,
      totalAnswers: (questions || []).filter(q => q.answer_text).length,
      totalCorrections: (corrections || []).length,
      totalNotes: (questions || []).filter(q => q.expert_notes).length,
      totalGraduations: (questions || []).filter(q => q.graduated_to_rfp_id).length,
      totalSecondOpinions: (questions || []).filter(q => q.is_second_opinion).length,
    };

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ events, stats }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Timeline error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
