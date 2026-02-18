'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  AgentStreamEvent, AgentProgressEvent, AgentPhase,
  StartAgentRunRequest, ProjectReportRecord,
} from '@/lib/agents/types';

export interface PhaseProgress {
  phase: AgentPhase;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  message: string;
  detail?: string;
  durationMs?: number;
  startedAt?: number;
}

export interface AgentRunState {
  isRunning: boolean;
  isCancelling: boolean;
  runId: string | null;
  reportId: string | null;
  report: ProjectReportRecord | null;
  phases: PhaseProgress[];
  overallProgress: number;
  error: string | null;
  summary: string | null;
  totalCost: number | null;
}

const INITIAL_PHASES: PhaseProgress[] = [
  { phase: 'research', status: 'pending', message: 'Research building codes & permits' },
  { phase: 'design', status: 'pending', message: 'Design project plan & materials list' },
  { phase: 'sourcing', status: 'pending', message: 'Find prices at local stores' },
  { phase: 'report', status: 'pending', message: 'Generate comprehensive report' },
];

export function useAgentRun() {
  const [state, setState] = useState<AgentRunState>({
    isRunning: false,
    isCancelling: false,
    runId: null,
    reportId: null,
    report: null,
    phases: INITIAL_PHASES,
    overallProgress: 0,
    error: null,
    summary: null,
    totalCost: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleEvent = useCallback((event: AgentStreamEvent) => {
    switch (event.type) {
      case 'agent_progress': {
        const progress = event as AgentProgressEvent;
        setState(prev => {
          const phases = prev.phases.map(p => {
            if (p.phase === progress.phase) {
              const phaseStarted = p.status !== 'running' && progress.phaseStatus !== 'completed';
              return {
                ...p,
                status: progress.phaseStatus === 'completed' ? 'completed' as const
                  : progress.phaseStatus === 'error' ? 'error' as const
                  : 'running' as const,
                message: progress.message,
                detail: progress.detail,
                startedAt: phaseStarted ? Date.now() : p.startedAt,
              };
            }
            return p;
          });

          return {
            ...prev,
            runId: progress.runId,
            phases,
            overallProgress: progress.overallProgress,
          };
        });
        break;
      }

      case 'agent_complete':
        setState(prev => ({
          ...prev,
          isRunning: false,
          isCancelling: false,
          reportId: event.reportId,
          summary: event.summary,
          totalCost: event.totalCost,
          overallProgress: 100,
        }));
        break;

      case 'agent_error':
        setState(prev => ({
          ...prev,
          isRunning: false,
          isCancelling: false,
          error: event.message,
          phases: prev.phases.map(p =>
            p.phase === event.phase
              ? { ...p, status: 'error' as const, message: event.message }
              : p
          ),
        }));
        break;

      case 'done':
        setState(prev => ({ ...prev, isRunning: false, isCancelling: false }));
        break;

      case 'heartbeat':
        // Keep-alive, nothing to do
        break;
    }
  }, []);

  const readSSEStream = useCallback(async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event: AgentStreamEvent = JSON.parse(jsonStr);
          handleEvent(event);
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }, [handleEvent]);

  const startRun = useCallback(async (request: StartAgentRunRequest) => {
    // Reset state
    setState({
      isRunning: true,
      isCancelling: false,
      runId: null,
      reportId: null,
      report: null,
      phases: INITIAL_PHASES.map(p => ({ ...p })),
      overallProgress: 0,
      error: null,
      summary: null,
      totalCost: null,
    });

    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          error: 'Please sign in to use the project planner.',
        }));
        return;
      }

      const response = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      await readSSEStream(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState(prev => ({ ...prev, isRunning: false, isCancelling: false }));
        return;
      }
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        ...prev,
        isRunning: false,
        isCancelling: false,
        error: message,
      }));
    }
  }, [readSSEStream]);

  const cancel = useCallback(async () => {
    const runId = stateRef.current.runId;
    setState(prev => ({ ...prev, isCancelling: true }));

    // Call server-side cancel endpoint first
    if (runId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`/api/agents/runs/${runId}/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
      } catch {
        // Best-effort cancel; still abort client stream
      }
    }

    // Abort the client-side stream
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setState({
      isRunning: false,
      isCancelling: false,
      runId: null,
      reportId: null,
      report: null,
      phases: INITIAL_PHASES.map(p => ({ ...p })),
      overallProgress: 0,
      error: null,
      summary: null,
      totalCost: null,
    });
  }, []);

  const fetchReport = useCallback(async (reportId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, report: data.report }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  }, []);

  const applyToProject = useCallback(async (reportId: string, projectId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await fetch(`/api/reports/${reportId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to apply report:', error);
      return null;
    }
  }, []);

  const retryRun = useCallback(async (runId: string) => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      isCancelling: false,
      error: null,
      reportId: null,
      report: null,
      summary: null,
      totalCost: null,
    }));

    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState(prev => ({ ...prev, isRunning: false, error: 'Please sign in.' }));
        return;
      }

      const response = await fetch(`/api/agents/runs/${runId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      await readSSEStream(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState(prev => ({ ...prev, isRunning: false }));
        return;
      }
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({ ...prev, isRunning: false, error: message }));
    }
  }, [readSSEStream]);

  const resumeRun = useCallback(async (runId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/agents/runs?status=running`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      const run = data.runs?.find((r: { id: string }) => r.id === runId);
      if (!run) return;

      // Map DB phases to UI state
      const phases: PhaseProgress[] = INITIAL_PHASES.map(p => {
        const dbPhase = run.agent_phases?.find((ap: { phase: string }) => ap.phase === p.phase);
        if (!dbPhase) return { ...p };

        return {
          ...p,
          status: dbPhase.status === 'running' ? 'running' as const
            : dbPhase.status === 'completed' ? 'completed' as const
            : dbPhase.status === 'error' ? 'error' as const
            : dbPhase.status === 'skipped' ? 'skipped' as const
            : 'pending' as const,
          message: dbPhase.status === 'completed'
            ? `${p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} phase complete`
            : dbPhase.status === 'running'
            ? `${p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} in progress...`
            : p.message,
          durationMs: dbPhase.duration_ms || undefined,
        };
      });

      // Compute progress from completed phases
      const completedCount = phases.filter(p => p.status === 'completed').length;
      const hasRunning = phases.some(p => p.status === 'running');
      const overallProgress = completedCount * 25 + (hasRunning ? 10 : 0);

      setState({
        isRunning: run.status === 'running',
        isCancelling: false,
        runId: run.id,
        reportId: null,
        report: null,
        phases,
        overallProgress,
        error: run.error_message || null,
        summary: null,
        totalCost: null,
      });

      // Start polling if still running
      if (run.status === 'running') {
        startPolling(runId, session.access_token);
      }
    } catch (error) {
      console.error('Failed to resume run:', error);
    }
  }, []);

  const startPolling = useCallback((runId: string, accessToken: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/agents/runs?status=running`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) return;

        const data = await resp.json();
        const run = data.runs?.find((r: { id: string }) => r.id === runId);

        if (!run) {
          // Run no longer in running state — check for completion
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;

          // Fetch the run without status filter to get final state
          const finalResp = await fetch(`/api/agents/runs`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!finalResp.ok) return;

          const finalData = await finalResp.json();
          const finalRun = finalData.runs?.find((r: { id: string }) => r.id === runId);
          if (!finalRun) return;

          if (finalRun.status === 'completed') {
            // Find the report
            const reportResp = await fetch(`/api/agents/runs`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            // Look for report via the phases
            const phases: PhaseProgress[] = INITIAL_PHASES.map(p => ({
              ...p,
              status: 'completed' as const,
              message: `${p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} phase complete`,
            }));

            setState(prev => ({
              ...prev,
              isRunning: false,
              phases,
              overallProgress: 100,
              error: null,
            }));

            // Try to find the associated report
            try {
              const reportSearchResp = await fetch(`/api/reports/${finalRun.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              }).catch(() => null);
              // Reports are by report ID not run ID, so this may not work
              // The user can refresh to see the completed state
            } catch {
              // Ignore
            }
          } else {
            const phases: PhaseProgress[] = INITIAL_PHASES.map(p => {
              const dbPhase = finalRun.agent_phases?.find((ap: { phase: string }) => ap.phase === p.phase);
              return {
                ...p,
                status: dbPhase?.status === 'completed' ? 'completed' as const
                  : dbPhase?.status === 'error' ? 'error' as const
                  : dbPhase?.status === 'skipped' ? 'skipped' as const
                  : 'pending' as const,
                message: dbPhase?.error_message || p.message,
              };
            });

            setState(prev => ({
              ...prev,
              isRunning: false,
              phases,
              error: finalRun.error_message || null,
            }));
          }
          return;
        }

        // Still running — update phase states
        const phases: PhaseProgress[] = INITIAL_PHASES.map(p => {
          const dbPhase = run.agent_phases?.find((ap: { phase: string }) => ap.phase === p.phase);
          if (!dbPhase) return { ...p };

          return {
            ...p,
            status: dbPhase.status === 'running' ? 'running' as const
              : dbPhase.status === 'completed' ? 'completed' as const
              : 'pending' as const,
            message: dbPhase.status === 'completed'
              ? `${p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} phase complete`
              : dbPhase.status === 'running'
              ? `${p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} in progress...`
              : p.message,
            durationMs: dbPhase.duration_ms || undefined,
          };
        });

        const completedCount = phases.filter(p => p.status === 'completed').length;
        const hasRunning = phases.some(p => p.status === 'running');
        const overallProgress = completedCount * 25 + (hasRunning ? 10 : 0);

        setState(prev => ({
          ...prev,
          phases,
          overallProgress,
        }));
      } catch {
        // Polling error, continue
      }
    }, 5000);
  }, []);

  return {
    ...state,
    startRun,
    cancel,
    reset,
    fetchReport,
    applyToProject,
    retryRun,
    resumeRun,
  };
}
