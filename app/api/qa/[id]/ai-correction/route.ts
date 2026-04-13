import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: questionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const correctionText = body.correctionText as string;
  const aiResponse = body.aiResponse as string;
  if (!correctionText || correctionText.length < 10) {
    return NextResponse.json({ error: 'Correction must be at least 10 characters' }, { status: 400 });
  }
  if (!aiResponse) {
    return NextResponse.json({ error: 'aiResponse is required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Look up expert profile — qa_questions.expert_id stores expert_profiles.id, not auth uid
  const { data: expertProfile } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!expertProfile) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 403 });
  }

  const { data: question } = await supabase
    .from('qa_questions')
    .select('question_text, expert_id, ai_context')
    .eq('id', questionId)
    .single();

  if (!question || question.expert_id !== expertProfile.id) {
    return NextResponse.json({ error: 'Not authorized for this question' }, { status: 403 });
  }

  const { data: specialtyRows } = await supabase
    .from('expert_specialties')
    .select('specialty')
    .eq('expert_id', expertProfile.id);

  const specialties = (specialtyRows || []).map((s: { specialty: string }) => s.specialty);

  const { error } = await supabase
    .from('advisor_correction_queue')
    .insert({
      source: 'expert_correction',
      status: 'pending',
      user_question: question.question_text,
      ai_response: aiResponse,
      correction_text: correctionText.slice(0, 1000),
      reporter_id: auth.userId,
      reporter_role: 'expert',
      expert_specialties: specialties,
    });

  if (error) {
    logger.error('Failed to insert expert AI correction', { error, questionId });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  logger.info('Expert AI correction submitted', { questionId, expertId: auth.userId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
