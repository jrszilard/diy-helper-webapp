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

  const { id: reviewLogId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const correctionText = body.correctionText as string;
  const sectionType = body.sectionType as string;

  if (!correctionText || correctionText.length < 10) {
    return NextResponse.json({ error: 'Correction must be at least 10 characters' }, { status: 400 });
  }
  if (!sectionType) {
    return NextResponse.json({ error: 'sectionType is required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Get expert profile
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!expert) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 403 });
  }

  // Get the review log item
  const { data: reviewLog } = await supabase
    .from('advisor_review_log')
    .select('user_question, draft_response, category')
    .eq('id', reviewLogId)
    .single();

  if (!reviewLog) {
    return NextResponse.json({ error: 'Review log item not found' }, { status: 404 });
  }

  // Get expert specialties
  const { data: specialtyRows } = await supabase
    .from('expert_specialties')
    .select('specialty')
    .eq('expert_id', expert.id);

  const specialties = (specialtyRows || []).map((s: { specialty: string }) => s.specialty);

  // Insert correction into queue
  const { error: insertError } = await supabase
    .from('advisor_correction_queue')
    .insert({
      source: 'expert_review',
      status: 'pending',
      user_question: reviewLog.user_question,
      ai_response: reviewLog.draft_response,
      correction_text: correctionText.slice(0, 1000),
      category: reviewLog.category,
      reporter_id: auth.userId,
      reporter_role: 'expert',
      expert_specialties: specialties,
    });

  if (insertError) {
    logger.error('Failed to insert expert review correction', { error: insertError });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  // Mark as reviewed
  await supabase
    .from('advisor_expert_reviews')
    .insert({ expert_id: expert.id, review_log_id: reviewLogId });

  logger.info('Expert review correction submitted', { reviewLogId, expertId: auth.userId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
