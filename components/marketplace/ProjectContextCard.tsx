'use client';

import { AlertTriangle, BookOpen, Wrench, HardHat, FileText, Camera, MapPin } from 'lucide-react';
import type { ExpertContext } from '@/lib/marketplace/types';

interface ProjectContextCardProps {
  context: ExpertContext;
  photoCount?: number;
  /** Compact mode hides steps and shows fewer details */
  compact?: boolean;
}

export default function ProjectContextCard({ context, photoCount, compact }: ProjectContextCardProps) {
  const {
    projectSummary,
    projectType,
    location,
    relevantCodes,
    safetyWarnings,
    proRequired,
    proRequiredReason,
    skillLevel,
    steps,
    materialsCount,
    toolsCount,
  } = context;

  const hasLocation = location.city || location.state;

  return (
    <div className="bg-slate-blue/5 border border-slate-blue/20 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-blue" />
          <h3 className="text-sm font-semibold text-slate-blue">Project Context from AI Report</h3>
        </div>
        {proRequired && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs font-medium text-amber-800">
            <HardHat size={12} />
            Pro Recommended
          </span>
        )}
      </div>

      <p className="text-xs text-slate-blue/80 mb-3">
        Your expert will see all this context before answering — no need to explain your project from scratch.
      </p>

      {/* Summary */}
      {projectSummary && (
        <p className="text-sm text-foreground mb-3">{projectSummary}</p>
      )}

      {/* Meta tags row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {projectType && projectType !== 'general' && (
          <span className="px-2 py-0.5 text-xs bg-terracotta/10 text-terracotta rounded-full font-medium border border-terracotta/20">
            {projectType.replace('_', ' ')}
          </span>
        )}
        {skillLevel && (
          <span className="px-2 py-0.5 text-xs bg-slate-blue/10 text-slate-blue rounded-full font-medium">
            {skillLevel} level
          </span>
        )}
        {hasLocation && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-earth-brown bg-earth-tan/50 rounded-full">
            <MapPin size={10} />
            {[location.city, location.state].filter(Boolean).join(', ')}
          </span>
        )}
        {(photoCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-earth-brown bg-earth-tan/50 rounded-full">
            <Camera size={10} />
            {photoCount} photo{photoCount !== 1 ? 's' : ''}
          </span>
        )}
        {materialsCount != null && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-earth-brown bg-earth-tan/50 rounded-full">
            <Wrench size={10} />
            {materialsCount} materials
          </span>
        )}
        {toolsCount != null && (
          <span className="px-2 py-0.5 text-xs text-earth-brown bg-earth-tan/50 rounded-full">
            {toolsCount} tools
          </span>
        )}
      </div>

      {/* Safety warnings */}
      {safetyWarnings.length > 0 && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Safety Considerations</span>
          </div>
          <ul className="space-y-0.5">
            {safetyWarnings.map((warning, i) => (
              <li key={i} className="text-xs text-amber-700 pl-4">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Building codes */}
      {relevantCodes && (
        <div className="mb-3 p-2 bg-slate-blue/5 border border-slate-blue/15 rounded-md">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen size={12} className="text-slate-blue" />
            <span className="text-xs font-semibold text-slate-blue">Relevant Building Codes</span>
          </div>
          <p className="text-xs text-foreground pl-4">{relevantCodes}</p>
        </div>
      )}

      {/* Pro required reason */}
      {proRequired && proRequiredReason && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-800">
            <strong>Why a pro is recommended:</strong> {proRequiredReason}
          </p>
        </div>
      )}

      {/* Steps (non-compact only) */}
      {!compact && steps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-blue/10">
          <p className="text-xs font-semibold text-earth-brown mb-2">
            Project Steps ({steps.length})
          </p>
          <div className="space-y-1">
            {steps.slice(0, 5).map((step) => (
              <div key={step.order} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-blue bg-slate-blue/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {step.order}
                </span>
                <span className="text-xs text-foreground">{step.title}</span>
                {step.skillLevel === 'advanced' && (
                  <span className="text-[10px] text-amber-600 font-medium">(advanced)</span>
                )}
              </div>
            ))}
            {steps.length > 5 && (
              <p className="text-xs text-[var(--muted)] pl-7">+{steps.length - 5} more steps</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
