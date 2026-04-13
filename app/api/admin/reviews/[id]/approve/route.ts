import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { structureCorrection } from '@/lib/advisor-promotion';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: correctionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const severity = body.severity as 'critical' | 'warning';
  const rubricItemsFailed = body.rubricItemsFailed as number[];

  if (!severity || !['critical', 'warning'].includes(severity)) {
    return NextResponse.json({ error: 'severity is required (critical or warning)' }, { status: 400 });
  }
  if (!rubricItemsFailed || !Array.isArray(rubricItemsFailed) || rubricItemsFailed.length === 0) {
    return NextResponse.json({ error: 'rubricItemsFailed must be a non-empty array' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Fetch the correction
  const { data: correction } = await supabase
    .from('advisor_correction_queue')
    .select('*')
    .eq('id', correctionId)
    .eq('status', 'pending')
    .single();

  if (!correction) {
    return NextResponse.json({ error: 'Correction not found or already processed' }, { status: 404 });
  }

  // Use edited text if provided, otherwise original
  const editedCorrection = body.editedCorrection as string | undefined;
  const finalCorrectionText = editedCorrection?.trim() || correction.correction_text;

  if (!finalCorrectionText || finalCorrectionText.length < 10) {
    return NextResponse.json({ error: 'Correction text must be at least 10 characters' }, { status: 400 });
  }

  // Structure the rubric example
  const rubricRow = structureCorrection({
    userQuestion: correction.user_question,
    aiResponse: correction.ai_response,
    correctionText: finalCorrectionText,
    category: correction.category || 'general',
    severity,
    rubricItemsFailed,
  });

  // Insert rubric example
  const { data: rubricExample, error: insertError } = await supabase
    .from('advisor_rubric_examples')
    .insert({
      ...rubricRow,
      source: 'community_verified',
      weight: 0.9,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !rubricExample) {
    logger.error('Failed to insert rubric example', { error: insertError });
    return NextResponse.json({ error: 'Failed to promote' }, { status: 500 });
  }

  // Update correction status
  const { error: updateError } = await supabase
    .from('advisor_correction_queue')
    .update({
      status: 'promoted',
      promoted_at: new Date().toISOString(),
      promoted_to: rubricExample.id,
      severity,
      rubric_items_failed: rubricItemsFailed,
      corrected_response: finalCorrectionText,
    })
    .eq('id', correctionId);

  if (updateError) {
    logger.error('Failed to update correction status', { error: updateError });
  }

  logger.info('Admin approved correction', { correctionId, rubricExampleId: rubricExample.id });
  return NextResponse.json({ ok: true, rubricExampleId: rubricExample.id });
}
