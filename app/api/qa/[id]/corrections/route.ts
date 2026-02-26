import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CorrectionSchema = z.object({
  sectionType: z.string().min(1).max(100),
  originalContent: z.string().max(2000).optional(),
  correctedContent: z.string().min(1).max(2000),
  correctionReason: z.string().max(500).optional(),
});

// GET /api/qa/[id]/corrections — list corrections for this question's report
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

    const { id } = await params;
    const adminClient = getAdminClient();

    // Get the question's report_id
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('report_id, diyer_user_id, expert_id')
      .eq('id', id)
      .single();

    if (!question?.report_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ corrections: [] }),
        { headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Fetch corrections for this report (from any Q&A source)
    const { data: corrections, error } = await adminClient
      .from('report_corrections')
      .select('id, report_id, expert_id, section_type, original_content, corrected_content, correction_reason, source_type, source_id, validated, created_at')
      .eq('report_id', question.report_id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch corrections', error, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to load corrections' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ corrections: corrections || [] }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Corrections GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// POST /api/qa/[id]/corrections — expert submits a correction to the AI report
export async function POST(
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
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = CorrectionSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Fetch question and verify expert
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('id, report_id, diyer_user_id, expert_id, status')
      .eq('id', id)
      .single();

    if (!question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!question.report_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'This question has no associated report' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify caller is the claimed expert
    if (!question.expert_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No expert assigned' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('id, user_id')
      .eq('id', question.expert_id)
      .single();

    if (expertProfile?.user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the assigned expert can submit corrections' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Insert correction
    const { data: correction, error: insertErr } = await adminClient
      .from('report_corrections')
      .insert({
        report_id: question.report_id,
        expert_id: question.expert_id,
        section_type: parsed.data.sectionType,
        original_content: parsed.data.originalContent || null,
        corrected_content: parsed.data.correctedContent,
        correction_reason: parsed.data.correctionReason || null,
        source_type: 'qa',
        source_id: id,
      })
      .select('id, section_type, corrected_content, correction_reason, created_at')
      .single();

    if (insertErr) {
      logger.error('Failed to insert correction', insertErr, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to submit correction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify DIYer
    await createNotification({
      userId: question.diyer_user_id,
      type: 'qa_correction_submitted',
      title: 'Expert corrected your project report',
      body: `Correction to "${parsed.data.sectionType}": ${parsed.data.correctedContent.slice(0, 80)}${parsed.data.correctedContent.length > 80 ? '...' : ''}`,
      link: `/marketplace/qa/${id}`,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ correction }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Corrections POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
