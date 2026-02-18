'use client';

import { CheckCircle2, Circle, Loader2, AlertCircle, X, RotateCcw, SkipForward } from 'lucide-react';
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
    <div className="flex-1 flex flex-col bg-[#F5F0E6] overflow-y-auto">
      {/* Header */}
      <div className="bg-[#FDFBF7] border-b border-[#D4C8B8] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-[#3E2723]">
              {isCancelling ? 'Cancelling...' : 'Planning Your Project'}
            </h2>
            <p className="text-sm text-[#7D6B5D]">
              {projectDescription.length > 80
                ? projectDescription.slice(0, 80) + '...'
                : projectDescription}
            </p>
            <p className="text-xs text-[#8B7D6B] mt-0.5">{location}</p>
          </div>
          {(isRunning || isCancelling) && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className={`p-2 rounded-lg transition-colors ${
                isCancelling
                  ? 'bg-[#E8E0D4] cursor-not-allowed'
                  : 'hover:bg-[#FDF3ED]'
              }`}
              title={isCancelling ? 'Cancelling...' : 'Cancel'}
            >
              {isCancelling ? (
                <Loader2 size={20} className="text-[#7D6B5D] animate-spin" />
              ) : (
                <X size={20} className="text-[#7D6B5D]" />
              )}
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="w-full bg-[#E8E0D4] rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-[#5D7B93] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-[#7D6B5D] mt-1.5 text-right">
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
          <div className="bg-[#FDF3ED] border border-[#E8B4A0] rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-[#B8593B] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#B8593B]">Something went wrong</p>
              <p className="text-sm text-[#7D6B5D] mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="p-5 border-t border-[#D4C8B8] bg-[#FDFBF7]">
        {hasError && onRetry ? (
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-lg bg-[#5D7B93] text-white hover:bg-[#4A6578] transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                ? 'border-[#E8E0D4] text-[#7D6B5D] cursor-not-allowed'
                : 'border-[#D4C8B8] text-[#7D6B5D] hover:bg-[#E8E0D4]'
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
    research: 'Research',
    design: 'Project Design',
    sourcing: 'Materials Sourcing',
    report: 'Report Generation',
  };

  const phaseDescriptions: Record<string, string> = {
    research: 'Building codes, permits, best practices, and safety information',
    design: 'Step-by-step plan, materials list, tool requirements, and timeline',
    sourcing: 'Real store prices, inventory check, and optimized shopping list',
    report: 'Comprehensive project report with all details assembled',
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
      isActive ? 'bg-white border-[#5D7B93] shadow-md' :
      isComplete ? 'bg-[#F0F7F2] border-[#B5D4BE]' :
      isError ? 'bg-[#FDF3ED] border-[#E8B4A0]' :
      isSkipped ? 'bg-[#F5F0E6] border-[#E8E0D4] opacity-60' :
      'bg-[#FDFBF7] border-[#E8E0D4]'
    }`}>
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isComplete && <CheckCircle2 size={24} className="text-[#4A7C59]" />}
          {isActive && <Loader2 size={24} className="text-[#5D7B93] animate-spin" />}
          {isError && <AlertCircle size={24} className="text-[#B8593B]" />}
          {isSkipped && <SkipForward size={24} className="text-[#8B7D6B]" />}
          {phase.status === 'pending' && (
            <div className="relative">
              <Circle size={24} className="text-[#D4C8B8]" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#8B7D6B]">
                {index + 1}
              </span>
            </div>
          )}
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${
              isActive ? 'text-[#3E2723]' :
              isComplete ? 'text-[#4A7C59]' :
              isError ? 'text-[#B8593B]' :
              isSkipped ? 'text-[#8B7D6B]' :
              'text-[#7D6B5D]'
            }`}>
              Phase {index + 1}: {phaseLabels[phase.phase]}
            </h3>
            {isComplete && phase.durationMs && (
              <span className="text-xs text-[#7D6B5D]">
                {Math.round(phase.durationMs / 1000)}s
              </span>
            )}
            {isActive && elapsed !== null && (
              <span className="text-xs text-[#5D7B93]">
                {elapsed}s
              </span>
            )}
            {isSkipped && (
              <span className="text-xs text-[#8B7D6B]">Skipped</span>
            )}
          </div>

          {/* Description or current activity */}
          <p className={`text-xs mt-0.5 ${
            isActive ? 'text-[#5D7B93]' :
            isSkipped ? 'text-[#8B7D6B]' :
            'text-[#8B7D6B]'
          }`}>
            {isActive ? phase.message : phaseDescriptions[phase.phase]}
          </p>

          {/* Detail (current tool call) */}
          {isActive && phase.detail && (
            <p className="text-xs text-[#5D7B93] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5D7B93] animate-pulse" />
              {phase.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
