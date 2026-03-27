'use client';

import { CheckCircle2, Circle, AlertCircle, X, RotateCcw, SkipForward } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import type { PhaseProgress } from '@/hooks/useAgentRun';

interface AgentProgressProps {
  phases: PhaseProgress[];
  overallProgress: number;
  projectDescription: string;
  location: string;
  error: string | null;
  isCancelling?: boolean;
  onCancel: () => void;
  onRetry?: () => void;
}

export default function AgentProgress({
  phases,
  overallProgress,
  projectDescription,
  location,
  error,
  isCancelling = false,
  onCancel,
  onRetry,
}: AgentProgressProps) {
  const isRunning = phases.some(p => p.status === 'running');
  const hasError = !!error && !isCancelling;

  return (
    <div className="flex-1 flex flex-col bg-earth-cream overflow-y-auto">
      {/* Header */}
      <div className="bg-surface border-b border-earth-sand p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isCancelling ? 'Cancelling...' : 'Planning Your Project'}
            </h2>
            <p className="text-sm text-warm-brown">
              {projectDescription.length > 80
                ? projectDescription.slice(0, 80) + '...'
                : projectDescription}
            </p>
            <p className="text-xs text-warm-brown mt-0.5">{location}</p>
          </div>
          {(isRunning || isCancelling) && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className={`p-2 rounded-lg transition-colors ${
                isCancelling
                  ? 'bg-[#E8E0D4] cursor-not-allowed'
                  : 'hover:bg-[var(--status-progress-bg)]'
              }`}
              title={isCancelling ? 'Cancelling...' : 'Cancel'}
            >
              {isCancelling ? (
                <Spinner className="text-earth-brown" />
              ) : (
                <X size={20} className="text-earth-brown" />
              )}
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="w-full bg-[#E8E0D4] rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-slate-blue rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-warm-brown mt-1.5 text-right">
          {isCancelling ? 'Cancelling...' : `${overallProgress}% complete`}
        </p>
      </div>

      {/* Phase list */}
      <div className="flex-1 p-5 space-y-4">
        {phases.map((phase, i) => (
          <PhaseCard key={phase.phase} phase={phase} index={i} />
        ))}

        {/* Error message */}
        {hasError && (
          <div className="bg-[var(--status-progress-bg)] border border-[#E8B4A0] rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-rust flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rust">Something went wrong</p>
              <p className="text-sm text-warm-brown mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="p-5 border-t border-earth-sand bg-surface">
        {hasError && onRetry ? (
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-lg bg-slate-blue text-white hover:bg-slate-blue-dark transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Retry from Failed Phase
          </button>
        ) : (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            className={`w-full py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              isCancelling
                ? 'border-[#E8E0D4] text-earth-brown cursor-not-allowed'
                : 'border-earth-sand text-earth-brown hover:bg-[#E8E0D4]'
            }`}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Planning'}
          </button>
        )}
      </div>
    </div>
  );
}

function PhaseCard({ phase, index }: { phase: PhaseProgress; index: number }) {
  const phaseLabels: Record<string, string> = {
    plan: 'Project Planning',
    report: 'Report Generation',
    // Legacy
    research: 'Research',
    design: 'Project Design',
    sourcing: 'Materials Sourcing',
  };

  const phaseDescriptions: Record<string, string> = {
    plan: 'Researching codes, designing plan, materials list, and timeline',
    report: 'Building comprehensive project report with all details',
    // Legacy
    research: 'Building codes, permits, best practices, and safety information',
    design: 'Step-by-step plan, materials list, tool requirements, and timeline',
    sourcing: 'Real store prices, inventory check, and optimized shopping list',
  };

  const isActive = phase.status === 'running';
  const isComplete = phase.status === 'completed';
  const isError = phase.status === 'error';
  const isSkipped = phase.status === 'skipped';

  const elapsed = phase.startedAt && isActive
    ? Math.round((Date.now() - phase.startedAt) / 1000)
    : null;

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      isActive ? 'bg-white border-slate-blue shadow-md' :
      isComplete ? 'bg-[#F0F7F2] border-[#B5D4BE]' :
      isError ? 'bg-[var(--status-progress-bg)] border-[#E8B4A0]' :
      isSkipped ? 'bg-earth-cream border-[#E8E0D4] opacity-60' :
      'bg-surface border-[#E8E0D4]'
    }`}>
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isComplete && <CheckCircle2 size={24} className="text-forest-green" />}
          {isActive && <Spinner size="lg" className="text-slate-blue" />}
          {isError && <AlertCircle size={24} className="text-rust" />}
          {isSkipped && <SkipForward size={24} className="text-earth-brown" />}
          {phase.status === 'pending' && (
            <div className="relative">
              <Circle size={24} className="text-earth-sand" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-earth-brown">
                {index + 1}
              </span>
            </div>
          )}
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${
              isActive ? 'text-foreground' :
              isComplete ? 'text-forest-green' :
              isError ? 'text-rust' :
              isSkipped ? 'text-earth-brown' :
              'text-warm-brown'
            }`}>
              Phase {index + 1}: {phaseLabels[phase.phase]}
            </h3>
            {isComplete && phase.durationMs && (
              <span className="text-xs text-warm-brown">
                {Math.round(phase.durationMs / 1000)}s
              </span>
            )}
            {isActive && elapsed !== null && (
              <span className="text-xs text-slate-blue">
                {elapsed}s
              </span>
            )}
            {isSkipped && (
              <span className="text-xs text-earth-brown">Skipped</span>
            )}
          </div>

          {/* Description or current activity */}
          <p className={`text-xs mt-0.5 ${
            isActive ? 'text-slate-blue' :
            isSkipped ? 'text-earth-brown' :
            'text-warm-brown'
          }`}>
            {isActive ? phase.message : phaseDescriptions[phase.phase]}
          </p>

          {/* Detail (current tool call) */}
          {isActive && phase.detail && (
            <p className="text-xs text-slate-blue mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-blue animate-pulse" />
              {phase.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
