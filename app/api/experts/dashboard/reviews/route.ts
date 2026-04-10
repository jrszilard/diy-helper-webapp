import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Get expert specialties
  const { data: specialtyRows } = await supabase
    .from('expert_specialties')
    .select('specialty')
    .eq('expert_id', expert.id);

  const specialties = (specialtyRows || []).map((s: { specialty: string }) => s.specialty);
  const isGC = specialties.includes('general_contractor');

  // Get already-reviewed item IDs for this expert
  const { data: reviewedRows } = await supabase
    .from('advisor_expert_reviews')
    .select('review_log_id')
    .eq('expert_id', expert.id);

  const reviewedIds = (reviewedRows || []).map((r: { review_log_id: string }) => r.review_log_id);

  // Parse cursor pagination
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  // Filter for borderline verdicts in application code since JSONB filtering is complex.
  // Overfetch 200 rows, then filter down to borderline + specialty + not-reviewed.
  let query = supabase
    .from('advisor_review_log')
    .select('id, category, user_question, draft_response, verdict, confidence, issues, safety_keywords, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (cursor) {
    query = query.lt('id', cursor);
  }

  const { data: rows, error } = await query;

  if (error) {
    logger.error('Failed to fetch review queue', { error });
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  // Application-level filtering for borderline + specialty + not-reviewed
  const filtered = (rows || []).filter(row => {
    // Skip already reviewed
    if (reviewedIds.includes(row.id)) return false;

    // Specialty filter
    if (!isGC && row.category && !specialties.includes(row.category)) return false;

    // Borderline detection
    const issues = row.issues as Array<{ item?: number; severity?: string; detail?: string }>;
    if (row.verdict === 'APPROVE') {
      // Approved but has warning-level issues
      return issues.some(i => i.severity === 'warning');
    }
    if (row.verdict === 'REVISE') {
      // Revised but only 1 issue (mild failure)
      return issues.length === 1;
    }
    return false;
  });

  // Paginate
  const page = filtered.slice(0, limit);
  const nextCursor = page.length === limit ? page[page.length - 1].id : null;

  const items = page.map(row => ({
    id: row.id,
    category: row.category,
    userQuestion: row.user_question,
    draftResponse: row.draft_response,
    verdict: row.verdict,
    confidence: row.confidence,
    issues: row.issues,
    safetyKeywords: row.safety_keywords,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items, nextCursor });
}
