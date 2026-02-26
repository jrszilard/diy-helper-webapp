import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildExpertContext } from '@/lib/marketplace/context-builder';
import { logger } from '@/lib/logger';

// GET /api/reports/[id]/context — Get AI expert context for a report
export async function GET(
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

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

    const context = await buildExpertContext(auth.supabaseClient, id);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ context }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Get report context error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
