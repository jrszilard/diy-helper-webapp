'use client';

import { Loader2 } from 'lucide-react';
import type { GatheredData } from './types';

interface ProjectBriefProps {
  gathered: GatheredData;
  onEdit: (field: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const BUDGET_LABELS: Record<string, string> = {
  budget: 'Budget-friendly',
  'mid-range': 'Mid-range',
  premium: 'Premium',
};

export default function ProjectBrief({ gathered, onEdit, onSubmit, isSubmitting }: ProjectBriefProps) {
  return (
    <div className="bg-white border border-[#D4C8B8] rounded-xl overflow-hidden">
      {/* Summary fields */}
      <div className="divide-y divide-[#E8E0D4]">
        <SummaryRow
          label="Project"
          value={gathered.projectDescription || gathered.projectType || '—'}
          onEdit={() => onEdit('project')}
          truncate
        />
        {gathered.dimensions && (
          <SummaryRow
            label="Scope"
            value={`${gathered.dimensions}${gathered.scopeDetails ? ' — ' + gathered.scopeDetails : ''}`}
            onEdit={() => onEdit('scope')}
          />
        )}
        <SummaryRow
          label="Location"
          value={gathered.city && gathered.state ? `${gathered.city}, ${gathered.state}` : '—'}
          onEdit={() => onEdit('location')}
        />
        {gathered.existingTools && (
          <SummaryRow
            label="Your Tools"
            value={gathered.existingTools}
            onEdit={() => onEdit('tools')}
            truncate
          />
        )}
        <SummaryRow
          label="Experience"
          value={gathered.experienceLevel ? EXPERIENCE_LABELS[gathered.experienceLevel] : '—'}
          onEdit={() => onEdit('preferences-experience')}
        />
        <SummaryRow
          label="Budget"
          value={gathered.budgetLevel ? BUDGET_LABELS[gathered.budgetLevel] : '—'}
          onEdit={() => onEdit('preferences-budget')}
        />
      </div>

      {/* Build button */}
      <div className="p-4">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
            isSubmitting
              ? 'bg-[#8B7D6B] text-white cursor-not-allowed'
              : 'bg-[#C67B5C] text-white hover:bg-[#A65D3F] shadow-md hover:shadow-lg hover:-translate-y-0.5'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Starting...
            </>
          ) : (
            'Build My Plan'
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
  truncate = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] font-semibold text-[#7D6B5D] uppercase tracking-wider">{label}</span>
        <span className={`block text-sm text-[#3E2723] mt-0.5 ${truncate ? 'line-clamp-2' : ''}`}>
          {value}
        </span>
      </div>
      <button
        onClick={onEdit}
        className="text-xs text-[#C67B5C] hover:text-[#A65D3F] font-medium flex-shrink-0 mt-1"
      >
        Edit
      </button>
    </div>
  );
}
