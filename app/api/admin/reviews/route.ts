import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getAdminClient();
  const url = new URL(req.url);
  const sourceFilter = url.searchParams.get('source');
  const categoryFilter = url.searchParams.get('category');

  let query = supabase
    .from('advisor_correction_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (sourceFilter) {
    query = query.eq('source', sourceFilter);
  }
  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data: corrections, error } = await query;

  if (error) {
    logger.error('Failed to fetch admin review queue', { error });
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  // Get counts by source
  const allCorrections = corrections || [];
  const counts = {
    total: allCorrections.length,
    userFlags: allCorrections.filter(c => c.source === 'user_flag').length,
    expertCorrections: allCorrections.filter(c => c.source === 'expert_correction').length,
    expertReviews: allCorrections.filter(c => c.source === 'expert_review').length,
  };

  // Enrich with reporter info for expert corrections
  const expertReporterIds = [...new Set(
    allCorrections
      .filter(c => c.reporter_role === 'expert' && c.reporter_id)
      .map(c => c.reporter_id as string)
  )];

  const expertMap: Record<string, { name: string; specialties: string[] }> = {};

  if (expertReporterIds.length > 0) {
    // expert_specialties.expert_id references expert_profiles.id (not user_id),
    // so we need both id and user_id from the profile lookup
    const { data: profiles } = await supabase
      .from('expert_profiles')
      .select('id, user_id, display_name')
      .in('user_id', expertReporterIds);

    for (const p of profiles || []) {
      const { data: specs } = await supabase
        .from('expert_specialties')
        .select('specialty')
        .eq('expert_id', p.id);

      expertMap[p.user_id] = {
        name: p.display_name || 'Expert',
        specialties: (specs || []).map((s: { specialty: string }) => s.specialty),
      };
    }
  }

  const items = allCorrections.map(c => ({
    id: c.id,
    source: c.source,
    category: c.category,
    userQuestion: c.user_question,
    aiResponse: c.ai_response,
    correctionText: c.correction_text,
    flagType: c.flag_type,
    severity: c.severity,
    rubricItemsFailed: c.rubric_items_failed,
    reporter: c.reporter_role === 'expert' && c.reporter_id
      ? { role: 'expert' as const, ...expertMap[c.reporter_id] }
      : { role: 'diy_user' as const, name: 'DIY User', specialties: [] },
    createdAt: c.created_at,
  }));

  return NextResponse.json({ items, counts });
}
