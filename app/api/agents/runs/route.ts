import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { CancellationError } from '@/lib/agents/runner';
import { isCancelled, clearCancellation } from '@/lib/agents/cancellation';
import { updatePhaseStatus, updateRunPhase, savePhaseResult } from '@/lib/agents/db-helpers';
import { runResearchPhase } from '@/lib/agents/phases/research';
import { runDesignPhase } from '@/lib/agents/phases/design';
import { runSourcingPhase } from '@/lib/agents/phases/sourcing';
import { runReportPhase } from '@/lib/agents/phases/report';
import type { AgentContext, AgentStreamEvent, AgentPhase, TokenUsage } from '@/lib/agents/types';

const StartRunSchema = z.object({
  projectDescription: z.string().min(10, 'Please describe your project in more detail').max(2000),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().max(10).optional(),
  budgetLevel: z.enum(['budget', 'mid-range', 'premium']).default('mid-range'),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  timeframe: z.string().max(100).optional(),
  projectId: z.string().uuid().optional(),
});

const PHASE_ORDER: AgentPhase[] = ['research', 'design', 'sourcing', 'report'];

// Sonnet pricing: $3/M input, $15/M output
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const auth = await getAuthFromRequest(req);

    // Support anonymous users — assign a temp user_id for DB records
    const effectiveUserId = auth.userId || `anon-${crypto.randomUUID()}`;

    if (!process.env.ANTHROPIC_API_KEY) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Rate limit by userId if authenticated, by IP if anonymous
    const rateLimitResult = checkRateLimit(req, auth.userId, 'agents');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const body = await req.json();
    const parsed = parseRequestBody(StartRunSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { projectDescription, city, state, zipCode, budgetLevel, experienceLevel, timeframe, projectId } = parsed.data;

    // Create agent_run record
    const { data: run, error: runError } = await auth.supabaseClient
      .from('agent_runs')
      .insert({
        user_id: effectiveUserId,
        project_id: projectId || null,
        project_description: projectDescription,
        location_city: city,
        location_state: state,
        location_zip: zipCode || null,
        budget_level: budgetLevel,
        experience_level: experienceLevel,
        timeframe: timeframe || null,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !run) {
      logger.error('Failed to create agent run', runError, { requestId });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to start project planning. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Create phase records
    for (const phase of PHASE_ORDER) {
      await auth.supabaseClient
        .from('agent_phases')
        .insert({ run_id: run.id, phase, status: 'pending' });
    }

    logger.info('Agent run started', { requestId, runId: run.id, projectDescription });

    // Build the context
    const context: AgentContext = {
      projectDescription,
      location: { city, state, zipCode },
      projectId: projectId || run.id,
      userId: effectiveUserId,
      preferences: { budgetLevel, experienceLevel, timeframe },
    };

    // Cancellation check closure
    const checkCancelled = () => isCancelled(run.id);

    // Stream the pipeline
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch (e) {
            logger.error('Error sending agent SSE event', e, { requestId, runId: run.id });
          }
        };

        // Heartbeat to prevent proxy timeouts
        const heartbeat = setInterval(() => {
          sendEvent({ type: 'heartbeat' });
        }, 15_000);

        let currentPhase: AgentPhase = 'research';
        const phaseTokenUsage: TokenUsage[] = [];

        try {
          // ── Phase 1: Research ──
          currentPhase = 'research';
          await updatePhaseStatus(auth, run.id, 'research', 'running');
          await updateRunPhase(auth, run.id, 'research');
          const researchResult = await runResearchPhase(context, auth, sendEvent, checkCancelled);
          context.research = researchResult.output;
          phaseTokenUsage.push(researchResult.tokenUsage);
          await savePhaseResult(auth, run.id, 'research', researchResult);

          // Check cancellation between phases
          if (checkCancelled()) throw new CancellationError();

          // ── Phase 2: Design ──
          currentPhase = 'design';
          await updatePhaseStatus(auth, run.id, 'design', 'running');
          await updateRunPhase(auth, run.id, 'design');
          const designResult = await runDesignPhase(context, auth, sendEvent, checkCancelled);
          context.design = designResult.output;
          phaseTokenUsage.push(designResult.tokenUsage);
          await savePhaseResult(auth, run.id, 'design', designResult);

          if (checkCancelled()) throw new CancellationError();

          // ── Phase 3: Sourcing ──
          currentPhase = 'sourcing';
          await updatePhaseStatus(auth, run.id, 'sourcing', 'running');
          await updateRunPhase(auth, run.id, 'sourcing');
          const sourcingResult = await runSourcingPhase(context, auth, sendEvent, checkCancelled);
          context.sourcing = sourcingResult.output;
          phaseTokenUsage.push(sourcingResult.tokenUsage);
          await savePhaseResult(auth, run.id, 'sourcing', sourcingResult);

          if (checkCancelled()) throw new CancellationError();

          // ── Phase 4: Report ──
          currentPhase = 'report';
          await updatePhaseStatus(auth, run.id, 'report', 'running');
          await updateRunPhase(auth, run.id, 'report');
          const reportResult = await runReportPhase(context, auth, sendEvent, checkCancelled);
          context.report = reportResult.output;
          phaseTokenUsage.push(reportResult.tokenUsage);
          await savePhaseResult(auth, run.id, 'report', reportResult);

          // Save the final report
          const { data: report, error: reportError } = await auth.supabaseClient
            .from('project_reports')
            .insert({
              run_id: run.id,
              user_id: effectiveUserId,
              project_id: projectId || null,
              title: context.report.title,
              sections: context.report.sections,
              summary: context.report.summary,
              total_cost: context.report.totalCost,
            })
            .select()
            .single();

          if (reportError) {
            logger.error('Failed to save report', reportError, { runId: run.id });
            throw new Error('Failed to save project report');
          }

          // Mark run as completed
          await auth.supabaseClient
            .from('agent_runs')
            .update({ status: 'completed', completed_at: new Date().toISOString(), current_phase: null })
            .eq('id', run.id);

          // Sum token usage across all phases
          const totalInput = phaseTokenUsage.reduce((sum, t) => sum + t.inputTokens, 0);
          const totalOutput = phaseTokenUsage.reduce((sum, t) => sum + t.outputTokens, 0);
          const estimatedCost = totalInput * INPUT_COST_PER_TOKEN + totalOutput * OUTPUT_COST_PER_TOKEN;

          logger.info('Agent run completed', {
            requestId, runId: run.id, reportId: report.id,
            totalInputTokens: totalInput, totalOutputTokens: totalOutput,
            estimatedCost: `$${estimatedCost.toFixed(4)}`,
          });

          sendEvent({
            type: 'agent_complete',
            runId: run.id,
            reportId: report.id,
            summary: context.report.summary,
            totalCost: context.report.totalCost,
            // Include full report so anon users can render without a separate fetch
            report,
            apiCost: {
              totalTokens: totalInput + totalOutput,
              estimatedCost: Math.round(estimatedCost * 10000) / 10000,
            },
          });

        } catch (error) {
          const isCancellation = error instanceof CancellationError;

          if (isCancellation) {
            logger.info('Agent run cancelled', { requestId, runId: run.id, phase: currentPhase });

            // Mark remaining phases as skipped
            const currentIdx = PHASE_ORDER.indexOf(currentPhase);
            for (let i = currentIdx; i < PHASE_ORDER.length; i++) {
              await updatePhaseStatus(auth, run.id, PHASE_ORDER[i], 'skipped');
            }

            await auth.supabaseClient
              .from('agent_runs')
              .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
              .eq('id', run.id);
          } else {
            logger.error('Agent pipeline error', error, { requestId, runId: run.id });

            // Update current phase to error
            await updatePhaseStatus(auth, run.id, currentPhase, 'error');

            await auth.supabaseClient
              .from('agent_runs')
              .update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'An unexpected error occurred',
              })
              .eq('id', run.id);
          }

          const errorMessage = isCancellation
            ? 'Project planning was cancelled.'
            : (error instanceof Error ? error.message : 'An unexpected error occurred');

          sendEvent({
            type: 'agent_error',
            runId: run.id,
            phase: currentPhase,
            message: errorMessage,
            recoverable: !isCancellation,
          });
        } finally {
          clearInterval(heartbeat);
          clearCancellation(run.id);
          sendEvent({ type: 'done' });
          controller.close();
        }
      },
    });

    return applyCorsHeaders(req, new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }));

  } catch (error) {
    logger.error('Agent runs API error', error, { requestId });
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to start project planning' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// List user's agent runs (with optional status filter)
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const statusFilter = req.nextUrl.searchParams.get('status');

    let query = auth.supabaseClient
      .from('agent_runs')
      .select('*, agent_phases(*)')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch agent runs' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ runs: data }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('List agent runs error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for the full pipeline
export const dynamic = 'force-dynamic';
