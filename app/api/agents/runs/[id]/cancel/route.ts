import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { markCancelled } from '@/lib/agents/cancellation';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
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

    // Fetch the run and verify ownership + running status
    const { data: run, error } = await auth.supabaseClient
      .from('agent_runs')
      .select('id, user_id, status')
      .eq('id', runId)
      .eq('user_id', auth.userId)
      .single();

    if (error || !run) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (run.status !== 'running') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Run is not currently running' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Mark cancelled in memory (the pipeline loop will pick this up)
    markCancelled(runId);

    logger.info('Agent run cancel requested', { runId, userId: auth.userId });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ success: true, message: 'Cancellation requested' }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Cancel agent run error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
