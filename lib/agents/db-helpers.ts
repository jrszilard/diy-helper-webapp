// Shared DB helpers for agent run management.
// Used by both the main POST route and the retry endpoint.

import { AuthResult } from '@/lib/auth';
import type { AgentPhase } from './types';

export async function updatePhaseStatus(
  auth: AuthResult,
  runId: string,
  phase: AgentPhase,
  status: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = auth.supabaseClient as any;
  await client
    .from('agent_phases')
    .update({ status, started_at: status === 'running' ? new Date().toISOString() : undefined })
    .eq('run_id', runId)
    .eq('phase', phase);
}

export async function updateRunPhase(
  auth: AuthResult,
  runId: string,
  phase: AgentPhase,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = auth.supabaseClient as any;
  await client
    .from('agent_runs')
    .update({ current_phase: phase })
    .eq('id', runId);
}

export interface PhaseResultData {
  output: object;
  toolCalls: unknown[];
  durationMs: number;
  tokenUsage?: { inputTokens: number; outputTokens: number };
}

export async function savePhaseResult(
  auth: AuthResult,
  runId: string,
  phase: AgentPhase,
  result: PhaseResultData,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = auth.supabaseClient as any;

  // Embed token usage inside output_data if available
  const outputData = result.tokenUsage
    ? { ...result.output as Record<string, unknown>, _tokenUsage: result.tokenUsage }
    : result.output;

  await client
    .from('agent_phases')
    .update({
      status: 'completed',
      output_data: outputData,
      tool_calls: result.toolCalls,
      completed_at: new Date().toISOString(),
      duration_ms: result.durationMs,
    })
    .eq('run_id', runId)
    .eq('phase', phase);
}
