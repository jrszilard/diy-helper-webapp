import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: reviewLogId } = await params;
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

  // Mark as reviewed (no correction)
  const { error } = await supabase
    .from('advisor_expert_reviews')
    .insert({ expert_id: expert.id, review_log_id: reviewLogId });

  if (error) {
    // Unique constraint violation means already reviewed — that's fine
    if (error.code !== '23505') {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
