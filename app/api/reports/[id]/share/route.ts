import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { logger } from '@/lib/logger';

// POST /api/reports/[id]/share — Generate a share link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(req);

    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify ownership
    const { data: report, error } = await auth.supabaseClient
      .from('project_reports')
      .select('id, share_token, share_enabled')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (error || !report) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // If already has a share token, return it
    if (report.share_token && report.share_enabled) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({
          shareToken: report.share_token,
          shareUrl: `/share/report/${report.share_token}`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Generate new share token
    const shareToken = crypto.randomUUID();

    const { error: updateError } = await auth.supabaseClient
      .from('project_reports')
      .update({ share_token: shareToken, share_enabled: true })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to generate share token', updateError, { reportId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to generate share link' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    logger.info('Report share link generated', { reportId: id, userId: auth.userId });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        shareToken,
        shareUrl: `/share/report/${shareToken}`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Share report error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
