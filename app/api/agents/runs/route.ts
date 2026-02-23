import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { CancellationError } from '@/lib/agents/runner';
import { sanitizeReportRecord } from '@/lib/security';
import { isCancelled, clearCancellation } from '@/lib/agents/cancellation';
import { updatePhaseStatus, updateRunPhase, savePhaseResult } from '@/lib/agents/db-helpers';
import { runPlanPhase } from '@/lib/agents/phases/plan';
import { buildReport } from '@/lib/agents/phases/report-builder';
import { prefetchInventory } from '@/lib/agents/inventory-prefetch';
import type { AgentContext, AgentStreamEvent, AgentPhase, TokenUsage } from '@/lib/agents/types';
import { checkUsageLimit, incrementUsage } from '@/lib/usage';

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

const PHASE_ORDER: AgentPhase[] = ['plan', 'report'];

// Sonnet pricing: $3/M input, $15/M output
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const auth = await getAuthFromRequest(req);

    const isAuthenticated = !!auth.userId;

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

    // Check freemium usage limit for authenticated users
    if (auth.userId) {
      try {
        const usageCheck = await checkUsageLimit(auth.supabaseClient, auth.userId, 'report');
        if (!usageCheck.allowed) {
          return applyCorsHeaders(req, new Response(
            JSON.stringify({
              error: 'Monthly report limit reached. Upgrade to Pro for unlimited access.',
              code: 'USAGE_LIMIT_EXCEEDED',
              usage: usageCheck,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      } catch (usageErr) {
        // Usage tables may not exist yet — allow the request through
        logger.error('Usage limit check failed, allowing request', usageErr);
      }
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

    // For authenticated users, create DB records; for anonymous, use transient IDs
    let runId: string;

    if (isAuthenticated) {
      const { data: run, error: runError } = await auth.supabaseClient
        .from('agent_runs')
        .insert({
          user_id: auth.userId,
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

      runId = run.id;

      // Create phase records
      for (const phase of PHASE_ORDER) {
        await auth.supabaseClient
          .from('agent_phases')
          .insert({ run_id: runId, phase, status: 'pending' });
      }
    } else {
      runId = crypto.randomUUID();
    }

    logger.info('Agent run started', { requestId, runId, projectDescription });

    // Build the context
    const context: AgentContext = {
      projectDescription,
      location: { city, state, zipCode },
      projectId: projectId || runId,
      userId: auth.userId || runId,
      preferences: { budgetLevel, experienceLevel, timeframe },
    };

    // Cancellation check closure
    const checkCancelled = isAuthenticated ? () => isCancelled(runId) : () => false;

    // Stream the pipeline
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch (e) {
            logger.error('Error sending agent SSE event', e, { requestId, runId });
          }
        };

        // Heartbeat to prevent proxy timeouts
        const heartbeat = setInterval(() => {
          sendEvent({ type: 'heartbeat' });
        }, 15_000);

        let currentPhase: AgentPhase = 'plan';
        const phaseTokenUsage: TokenUsage[] = [];

        try {
          // Pre-fetch inventory in parallel with phase setup
          const inventoryPromise = prefetchInventory(auth);

          // ── Phase 1: Plan (research + design in one Claude call) ──
          currentPhase = 'plan';
          if (isAuthenticated) await updatePhaseStatus(auth, runId, 'plan', 'running');
          if (isAuthenticated) await updateRunPhase(auth, runId, 'plan');

          const inventoryData = await inventoryPromise;
          const planResult = await runPlanPhase(context, auth, sendEvent, inventoryData, checkCancelled);
          context.plan = planResult.output;
          context.inventoryData = inventoryData ?? undefined;
          phaseTokenUsage.push(planResult.tokenUsage);
          if (isAuthenticated) await savePhaseResult(auth, runId, 'plan', planResult);

          if (checkCancelled()) throw new CancellationError();

          // ── Phase 2: Report (deterministic TypeScript — no Claude call) ──
          currentPhase = 'report';
          if (isAuthenticated) await updatePhaseStatus(auth, runId, 'report', 'running');
          if (isAuthenticated) await updateRunPhase(auth, runId, 'report');

          sendEvent({
            type: 'agent_progress',
            runId,
            phase: 'report',
            phaseStatus: 'started',
            message: 'Building report...',
            overallProgress: 85,
          });

          const reportStartTime = Date.now();
          const reportOutput = buildReport({
            plan: context.plan,
            projectDescription: context.projectDescription,
            location: context.location,
            preferences: context.preferences,
          });
          context.report = reportOutput;

          // Save report phase result (no token usage — deterministic)
          if (isAuthenticated) await savePhaseResult(auth, runId, 'report', {
            output: reportOutput as unknown as Record<string, unknown>,
            toolCalls: [],
            durationMs: Date.now() - reportStartTime,
            tokenUsage: { inputTokens: 0, outputTokens: 0 },
          });

          sendEvent({
            type: 'agent_progress',
            runId,
            phase: 'report',
            phaseStatus: 'completed',
            message: 'Report complete',
            overallProgress: 100,
          });

          // Sum token usage across all phases
          const totalInput = phaseTokenUsage.reduce((sum, t) => sum + t.inputTokens, 0);
          const totalOutput = phaseTokenUsage.reduce((sum, t) => sum + t.outputTokens, 0);
          const estimatedCost = totalInput * INPUT_COST_PER_TOKEN + totalOutput * OUTPUT_COST_PER_TOKEN;

          if (isAuthenticated) {
            // Save the final report
            const { data: report, error: reportError } = await auth.supabaseClient
              .from('project_reports')
              .insert({
                run_id: runId,
                user_id: auth.userId,
                project_id: projectId || null,
                title: context.report.title,
                sections: context.report.sections,
                summary: context.report.summary,
                total_cost: context.report.totalCost,
              })
              .select()
              .single();

            if (reportError) {
              logger.error('Failed to save report', reportError, { runId });
              throw new Error('Failed to save project report');
            }

            // Increment report usage counter (fire-and-forget, must not block report delivery)
            try {
              incrementUsage(auth.userId!, 'report').catch(err =>
                logger.error('Failed to increment report usage', err, { runId })
              );
            } catch (usageErr) {
              logger.error('Failed to start usage increment', usageErr, { runId });
            }

            // Mark run as completed
            await auth.supabaseClient
              .from('agent_runs')
              .update({ status: 'completed', completed_at: new Date().toISOString(), current_phase: null })
              .eq('id', runId);

            logger.info('Agent run completed', {
              requestId, runId, reportId: report.id,
              totalInputTokens: totalInput, totalOutputTokens: totalOutput,
              estimatedCost: `$${estimatedCost.toFixed(4)}`,
            });

            sendEvent({
              type: 'agent_complete',
              runId,
              reportId: report!.id,
              summary: context.report!.summary,
              totalCost: context.report!.totalCost,
              report: sanitizeReportRecord(report!),
              apiCost: {
                totalTokens: totalInput + totalOutput,
                estimatedCost: Math.round(estimatedCost * 10000) / 10000,
              },
            });
          } else {
            logger.info('Agent run completed (anonymous)', {
              requestId, runId,
              totalInputTokens: totalInput, totalOutputTokens: totalOutput,
              estimatedCost: `$${estimatedCost.toFixed(4)}`,
            });

            sendEvent({
              type: 'agent_complete',
              runId,
              summary: context.report!.summary,
              totalCost: context.report!.totalCost,
              report: context.report,
              apiCost: {
                totalTokens: totalInput + totalOutput,
                estimatedCost: Math.round(estimatedCost * 10000) / 10000,
              },
            });
          }

        } catch (error) {
          const isCancellation = error instanceof CancellationError;

          if (isCancellation) {
            logger.info('Agent run cancelled', { requestId, runId, phase: currentPhase });

            if (isAuthenticated) {
              // Mark remaining phases as skipped
              const currentIdx = PHASE_ORDER.indexOf(currentPhase);
              for (let i = currentIdx; i < PHASE_ORDER.length; i++) {
                await updatePhaseStatus(auth, runId, PHASE_ORDER[i], 'skipped');
              }

              await auth.supabaseClient
                .from('agent_runs')
                .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                .eq('id', runId);
            }
          } else {
            logger.error('Agent pipeline error', error, { requestId, runId });

            if (isAuthenticated) {
              // Update current phase to error
              await updatePhaseStatus(auth, runId, currentPhase, 'error');

              await auth.supabaseClient
                .from('agent_runs')
                .update({
                  status: 'error',
                  error_message: error instanceof Error ? error.message : 'An unexpected error occurred',
                })
                .eq('id', runId);
            }
          }

          const errorMessage = isCancellation
            ? 'Project planning was cancelled.'
            : (error instanceof Error ? error.message : 'An unexpected error occurred');

          sendEvent({
            type: 'agent_error',
            runId,
            phase: currentPhase,
            message: errorMessage,
            recoverable: !isCancellation,
          });
        } finally {
          clearInterval(heartbeat);
          if (isAuthenticated) clearCancellation(runId);
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'agents');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
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
export const maxDuration = 120; // 2 minutes max for the 2-phase pipeline
export const dynamic = 'force-dynamic';
