import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { CancellationError } from '@/lib/agents/runner';
import { isCancelled, clearCancellation } from '@/lib/agents/cancellation';
import { updatePhaseStatus, updateRunPhase, savePhaseResult } from '@/lib/agents/db-helpers';
// Legacy phase runners (for old 4-phase runs)
import { runResearchPhase } from '@/lib/agents/phases/research';
import { runDesignPhase } from '@/lib/agents/phases/design';
import { runSourcingPhase } from '@/lib/agents/phases/sourcing';
import { runReportPhase } from '@/lib/agents/phases/report';
// New phase runners (for 2-phase runs)
import { runPlanPhase } from '@/lib/agents/phases/plan';
import { buildReport } from '@/lib/agents/phases/report-builder';
import { prefetchInventory } from '@/lib/agents/inventory-prefetch';
import { sanitizeReportRecord } from '@/lib/security';
import type {
  AgentContext, AgentStreamEvent, AgentPhase, AgentPhaseRecord, TokenUsage,
  ResearchOutput, DesignOutput, SourcingOutput, PlanOutput,
} from '@/lib/agents/types';

const LEGACY_PHASE_ORDER: AgentPhase[] = ['research', 'design', 'sourcing', 'report'];
const NEW_PHASE_ORDER: AgentPhase[] = ['plan', 'report'];

// Sonnet pricing: $3/M input, $15/M output
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();

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

    // Fetch the run — always match by user_id for ownership check
    const query = auth.supabaseClient
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', auth.userId);

    const { data: run, error: runError } = await query.single();

    if (runError || !run) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (run.status === 'completed') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Run already completed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Load phase records
    const { data: phases, error: phasesError } = await auth.supabaseClient
      .from('agent_phases')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (phasesError || !phases) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to load phase data' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Detect legacy vs new run based on phase names present in DB
    const phaseNames = new Set((phases as AgentPhaseRecord[]).map(p => p.phase));
    const isLegacyRun = phaseNames.has('research') || phaseNames.has('design') || phaseNames.has('sourcing');
    const phaseOrder = isLegacyRun ? LEGACY_PHASE_ORDER : NEW_PHASE_ORDER;

    // Reconstruct context from completed phases
    const context: AgentContext = {
      projectDescription: run.project_description,
      location: {
        city: run.location_city || '',
        state: run.location_state || '',
        zipCode: run.location_zip || undefined,
      },
      projectId: run.project_id || run.id,
      userId: auth.userId || run.user_id,
      preferences: {
        budgetLevel: run.budget_level || 'mid-range',
        experienceLevel: run.experience_level || 'intermediate',
        timeframe: run.timeframe || undefined,
      },
    };

    // Restore completed phase outputs into context
    const phaseMap = new Map<string, AgentPhaseRecord>();
    for (const p of phases as AgentPhaseRecord[]) {
      phaseMap.set(p.phase, p);
    }

    // Find the resume point (first non-completed phase)
    let resumeIndex = 0;
    for (let i = 0; i < phaseOrder.length; i++) {
      const phase = phaseMap.get(phaseOrder[i]);
      if (phase?.status === 'completed' && phase.output_data) {
        const output = phase.output_data as Record<string, unknown>;
        const { _tokenUsage, ...cleanOutput } = output;
        switch (phaseOrder[i]) {
          case 'research':
            context.research = cleanOutput as unknown as ResearchOutput;
            break;
          case 'design':
            context.design = cleanOutput as unknown as DesignOutput;
            break;
          case 'sourcing':
            context.sourcing = cleanOutput as unknown as SourcingOutput;
            break;
          case 'plan':
            context.plan = cleanOutput as unknown as PlanOutput;
            break;
        }
        resumeIndex = i + 1;
      } else {
        break;
      }
    }

    if (resumeIndex >= phaseOrder.length) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'All phases already completed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Reset run to running
    await auth.supabaseClient
      .from('agent_runs')
      .update({
        status: 'running',
        error_message: null,
        cancelled_at: null,
        started_at: run.started_at || new Date().toISOString(),
      })
      .eq('id', runId);

    // Reset failed/pending phases from resume point onwards
    for (let i = resumeIndex; i < phaseOrder.length; i++) {
      await updatePhaseStatus(auth, runId, phaseOrder[i], 'pending');
    }

    logger.info('Agent run retry started', {
      runId, resumeFrom: phaseOrder[resumeIndex], isLegacyRun,
    });

    const checkCancelled = () => isCancelled(runId);

    // Stream remaining phases
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch (e) {
            logger.error('Error sending retry SSE event', e, { runId });
          }
        };

        const heartbeat = setInterval(() => {
          sendEvent({ type: 'heartbeat' });
        }, 15_000);

        // Send progress for already-completed phases
        const progressPerPhase = Math.floor(100 / phaseOrder.length);
        for (let i = 0; i < resumeIndex; i++) {
          sendEvent({
            type: 'agent_progress',
            runId,
            phase: phaseOrder[i],
            phaseStatus: 'completed',
            message: `${phaseOrder[i].charAt(0).toUpperCase() + phaseOrder[i].slice(1)} phase complete (previous run)`,
            overallProgress: (i + 1) * progressPerPhase,
          });
        }

        let currentPhase = phaseOrder[resumeIndex];
        const phaseTokenUsage: TokenUsage[] = [];

        try {
          if (isLegacyRun) {
            // ── Legacy 4-phase pipeline ──
            for (let i = resumeIndex; i < phaseOrder.length; i++) {
              currentPhase = phaseOrder[i];
              if (checkCancelled()) throw new CancellationError();

              await updatePhaseStatus(auth, runId, currentPhase, 'running');
              await updateRunPhase(auth, runId, currentPhase);

              let result;
              switch (currentPhase) {
                case 'research':
                  result = await runResearchPhase(context, auth, sendEvent, checkCancelled);
                  context.research = result.output;
                  break;
                case 'design':
                  result = await runDesignPhase(context, auth, sendEvent, checkCancelled);
                  context.design = result.output;
                  break;
                case 'sourcing':
                  result = await runSourcingPhase(context, auth, sendEvent, checkCancelled);
                  context.sourcing = result.output;
                  break;
                case 'report':
                  result = await runReportPhase(context, auth, sendEvent, checkCancelled);
                  context.report = result.output;
                  break;
              }

              phaseTokenUsage.push(result!.tokenUsage);
              await savePhaseResult(auth, runId, currentPhase, result!);
            }
          } else {
            // ── New 2-phase pipeline ──
            for (let i = resumeIndex; i < phaseOrder.length; i++) {
              currentPhase = phaseOrder[i];
              if (checkCancelled()) throw new CancellationError();

              await updatePhaseStatus(auth, runId, currentPhase, 'running');
              await updateRunPhase(auth, runId, currentPhase);

              if (currentPhase === 'plan') {
                const inventoryData = await prefetchInventory(auth);
                const planResult = await runPlanPhase(context, auth, sendEvent, inventoryData, checkCancelled);
                context.plan = planResult.output;
                context.inventoryData = inventoryData ?? undefined;
                phaseTokenUsage.push(planResult.tokenUsage);
                await savePhaseResult(auth, runId, 'plan', planResult);
              } else if (currentPhase === 'report') {
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
                  plan: context.plan!,
                  projectDescription: context.projectDescription,
                  location: context.location,
                  preferences: context.preferences,
                });
                context.report = reportOutput;

                await savePhaseResult(auth, runId, 'report', {
                  output: reportOutput as unknown as Record<string, unknown>,
                  toolCalls: [],
                  durationMs: Date.now() - reportStartTime,
                  tokenUsage: { inputTokens: 0, outputTokens: 0 },
                });
                phaseTokenUsage.push({ inputTokens: 0, outputTokens: 0 });

                sendEvent({
                  type: 'agent_progress',
                  runId,
                  phase: 'report',
                  phaseStatus: 'completed',
                  message: 'Report complete',
                  overallProgress: 100,
                });
              }
            }
          }

          // Save the final report
          const { data: report, error: reportError } = await auth.supabaseClient
            .from('project_reports')
            .insert({
              run_id: runId,
              user_id: auth.userId || run.user_id,
              project_id: run.project_id || null,
              title: context.report!.title,
              sections: context.report!.sections,
              summary: context.report!.summary,
              total_cost: context.report!.totalCost,
            })
            .select()
            .single();

          if (reportError) {
            logger.error('Failed to save report on retry', reportError, { runId });
            throw new Error('Failed to save project report');
          }

          await auth.supabaseClient
            .from('agent_runs')
            .update({ status: 'completed', completed_at: new Date().toISOString(), current_phase: null })
            .eq('id', runId);

          const totalInput = phaseTokenUsage.reduce((sum, t) => sum + t.inputTokens, 0);
          const totalOutput = phaseTokenUsage.reduce((sum, t) => sum + t.outputTokens, 0);
          const estimatedCost = totalInput * INPUT_COST_PER_TOKEN + totalOutput * OUTPUT_COST_PER_TOKEN;

          logger.info('Agent run retry completed', {
            runId, reportId: report.id,
            totalInputTokens: totalInput, totalOutputTokens: totalOutput,
            estimatedCost: `$${estimatedCost.toFixed(4)}`,
          });

          sendEvent({
            type: 'agent_complete',
            runId,
            reportId: report.id,
            summary: context.report!.summary,
            totalCost: context.report!.totalCost,
            report: sanitizeReportRecord(report),
            apiCost: {
              totalTokens: totalInput + totalOutput,
              estimatedCost: Math.round(estimatedCost * 10000) / 10000,
            },
          });

        } catch (error) {
          const isCancellation = error instanceof CancellationError;

          if (isCancellation) {
            logger.info('Agent retry cancelled', { runId, phase: currentPhase });
            const currentIdx = phaseOrder.indexOf(currentPhase);
            for (let i = currentIdx; i < phaseOrder.length; i++) {
              await updatePhaseStatus(auth, runId, phaseOrder[i], 'skipped');
            }
            await auth.supabaseClient
              .from('agent_runs')
              .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
              .eq('id', runId);
          } else {
            logger.error('Agent retry pipeline error', error, { runId });
            await updatePhaseStatus(auth, runId, currentPhase, 'error');
            await auth.supabaseClient
              .from('agent_runs')
              .update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'An unexpected error occurred',
              })
              .eq('id', runId);
          }

          sendEvent({
            type: 'agent_error',
            runId,
            phase: currentPhase,
            message: isCancellation
              ? 'Project planning was cancelled.'
              : (error instanceof Error ? error.message : 'An unexpected error occurred'),
            recoverable: !isCancellation,
          });
        } finally {
          clearInterval(heartbeat);
          clearCancellation(runId);
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
    logger.error('Retry agent run error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to retry project planning' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export const runtime = 'nodejs';
export const maxDuration = 300; // Legacy runs may still need more time
export const dynamic = 'force-dynamic';
