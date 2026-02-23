import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// GET /api/agents/runs/[id] — Get run details with phases
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'agents');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { data: run, error: runError } = await auth.supabaseClient
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (runError || !run) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Agent run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: phases, error: phasesError } = await auth.supabaseClient
      .from('agent_phases')
      .select('*')
      .eq('run_id', id)
      .order('created_at');

    if (phasesError) {
      logger.error('Failed to fetch agent phases', phasesError, { runId: id });
    }

    // If completed, fetch the report
    let report = null;
    if (run.status === 'completed') {
      const { data: reportData } = await auth.supabaseClient
        .from('project_reports')
        .select('id, run_id, user_id, project_id, title, sections, summary, total_cost, share_enabled, created_at')
        .eq('run_id', id)
        .single();
      report = reportData;
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ run, phases: phases || [], report }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Get agent run error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
