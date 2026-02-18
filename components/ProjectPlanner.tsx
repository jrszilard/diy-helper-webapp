'use client';

import { useState, useCallback, useEffect } from 'react';
import AgentIntakeForm from './AgentIntakeForm';
import AgentProgress from './AgentProgress';
import ReportView from './ReportView';
import { useAgentRun } from '@/hooks/useAgentRun';
import { supabase } from '@/lib/supabase';
import type { StartAgentRunRequest } from '@/lib/agents/types';

type PlannerView = 'idle' | 'intake' | 'progress' | 'report';

interface ProjectPlannerProps {
  userId?: string;
  onProjectCreated?: (projectId: string) => void;
}

export default function ProjectPlanner({ userId, onProjectCreated }: ProjectPlannerProps) {
  const [view, setView] = useState<PlannerView>('idle');
  const [runRequest, setRunRequest] = useState<StartAgentRunRequest | null>(null);
  const [appliedProjectId, setAppliedProjectId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const agentRun = useAgentRun();

  // Check for active runs on mount (reconnection)
  useEffect(() => {
    if (!userId || view !== 'idle') return;

    async function checkActiveRuns() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch('/api/agents/runs?status=running', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.runs?.length > 0) {
          const activeRun = data.runs[0];
          setRunRequest({
            projectDescription: activeRun.project_description || '',
            city: activeRun.location_city || '',
            state: activeRun.location_state || '',
            zipCode: activeRun.location_zip || undefined,
            budgetLevel: activeRun.budget_level || 'mid-range',
            experienceLevel: activeRun.experience_level || 'intermediate',
            timeframe: activeRun.timeframe || undefined,
            projectId: activeRun.project_id || undefined,
          });
          setView('progress');
          agentRun.resumeRun(activeRun.id);
        }
      } catch {
        // Ignore reconnection errors
      }
    }

    checkActiveRuns();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transition to report view when complete
  useEffect(() => {
    if (agentRun.reportId && !agentRun.isRunning && view === 'progress') {
      agentRun.fetchReport(agentRun.reportId);
      setView('report');
    }
  }, [agentRun.reportId, agentRun.isRunning, view, agentRun.fetchReport]);

  const handleOpenIntake = useCallback(() => {
    if (!userId) {
      alert('Please sign in to use the project planner.');
      return;
    }
    agentRun.reset();
    setAppliedProjectId(null);
    setView('intake');
  }, [userId, agentRun]);

  const handleCloseIntake = useCallback(() => {
    setView('idle');
  }, []);

  const handleSubmit = useCallback((request: StartAgentRunRequest) => {
    setRunRequest(request);
    setView('progress');
    agentRun.startRun(request);
  }, [agentRun]);

  const handleCancel = useCallback(() => {
    agentRun.cancel();
    // Don't immediately switch to idle — let the cancellation flow complete
    // The UI will show "Cancelling..." state
  }, [agentRun]);

  const handleBack = useCallback(() => {
    setView('idle');
  }, []);

  const handleRetry = useCallback(() => {
    if (!agentRun.runId) return;
    agentRun.retryRun(agentRun.runId);
  }, [agentRun]);

  const handleApplyToProject = useCallback(async () => {
    if (!agentRun.reportId) return;
    setIsApplying(true);
    try {
      const result = await agentRun.applyToProject(agentRun.reportId);
      if (result?.projectId) {
        setAppliedProjectId(result.projectId);
        onProjectCreated?.(result.projectId);
      }
    } finally {
      setIsApplying(false);
    }
  }, [agentRun, onProjectCreated]);

  // When run finishes with cancellation or error, and user hasn't switched away,
  // allow them to see the error/cancel state and use retry or go back
  useEffect(() => {
    if (!agentRun.isRunning && !agentRun.isCancelling && agentRun.error && view === 'progress') {
      // Stay on progress view to show error + retry button
    }
  }, [agentRun.isRunning, agentRun.isCancelling, agentRun.error, view]);

  return {
    view,
    handleOpenIntake,
    // Render the appropriate view
    renderPlanner: () => {
      switch (view) {
        case 'intake':
          return (
            <AgentIntakeForm
              isOpen={true}
              onClose={handleCloseIntake}
              onSubmit={handleSubmit}
              isRunning={agentRun.isRunning}
            />
          );

        case 'progress':
          return (
            <AgentProgress
              phases={agentRun.phases}
              overallProgress={agentRun.overallProgress}
              projectDescription={runRequest?.projectDescription || ''}
              location={runRequest ? `${runRequest.city}, ${runRequest.state}` : ''}
              error={agentRun.error}
              isCancelling={agentRun.isCancelling}
              onCancel={agentRun.isRunning || agentRun.isCancelling ? handleCancel : handleBack}
              onRetry={handleRetry}
            />
          );

        case 'report':
          if (!agentRun.report) {
            return (
              <div className="flex-1 flex items-center justify-center bg-[#F5F0E6]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#5D7B93] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#7D6B5D]">Loading report...</p>
                </div>
              </div>
            );
          }
          return (
            <ReportView
              report={agentRun.report}
              onApplyToProject={handleApplyToProject}
              onBack={handleBack}
              isApplying={isApplying}
              appliedProjectId={appliedProjectId}
            />
          );

        default:
          return null;
      }
    },
  };
}
