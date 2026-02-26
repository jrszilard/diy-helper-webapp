import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const NotesSchema = z.object({
  toolsNeeded: z.array(z.string().max(200)).max(20).optional(),
  estimatedTime: z.string().max(200).optional(),
  commonMistakes: z.array(z.string().max(500)).max(10).optional(),
  localCodeNotes: z.string().max(2000).optional(),
  additional: z.string().max(2000).optional(),
});

// GET /api/qa/[id]/notes — get expert notes for a question
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

    const { data: question } = await adminClient
      .from('qa_questions')
      .select('expert_notes, diyer_user_id, expert_id')
      .eq('id', id)
      .single();

    if (!question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ notes: question.expert_notes || null }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Notes GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// PUT /api/qa/[id]/notes — expert saves structured insight notes
export async function PUT(
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
    const parsed = NotesSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid notes', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Fetch question and verify expert
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('id, expert_id')
      .eq('id', id)
      .single();

    if (!question?.expert_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found or no expert assigned' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('user_id')
      .eq('id', question.expert_id)
      .single();

    if (expertProfile?.user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the assigned expert can add notes' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Build notes object, removing empty arrays and empty strings
    const notes: Record<string, unknown> = {};
    if (parsed.data.toolsNeeded?.length) notes.tools_needed = parsed.data.toolsNeeded;
    if (parsed.data.estimatedTime) notes.estimated_time = parsed.data.estimatedTime;
    if (parsed.data.commonMistakes?.length) notes.common_mistakes = parsed.data.commonMistakes;
    if (parsed.data.localCodeNotes) notes.local_code_notes = parsed.data.localCodeNotes;
    if (parsed.data.additional) notes.additional = parsed.data.additional;

    const { error: updateErr } = await adminClient
      .from('qa_questions')
      .update({ expert_notes: Object.keys(notes).length > 0 ? notes : null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      logger.error('Failed to update expert notes', updateErr, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to save notes' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true, notes: Object.keys(notes).length > 0 ? notes : null }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Notes PUT error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
