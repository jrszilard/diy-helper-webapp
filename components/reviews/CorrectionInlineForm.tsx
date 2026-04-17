'use client';

import { useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';

const SECTION_TYPES = [
  { value: 'safety_warnings', label: 'Safety Warnings' },
  { value: 'building_codes', label: 'Building Codes' },
  { value: 'materials', label: 'Materials List' },
  { value: 'tools', label: 'Tools Needed' },
  { value: 'steps', label: 'Project Steps' },
  { value: 'cost_estimate', label: 'Cost Estimate' },
  { value: 'skill_level', label: 'Skill Level Assessment' },
  { value: 'other', label: 'Other' },
];

interface CorrectionInlineFormProps {
  onSubmit: (sectionType: string, correctionText: string) => Promise<void>;
  onCancel: () => void;
}

export default function CorrectionInlineForm({ onSubmit, onCancel }: CorrectionInlineFormProps) {
  const [sectionType, setSectionType] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sectionType || correctionText.trim().length < 10) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sectionType, correctionText.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-white/60 block mb-1">Section</label>
        <select
          value={sectionType}
          onChange={e => setSectionType(e.target.value)}
          className="w-full text-sm border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white [&>option]:bg-[#2a2420] [&>option]:text-white focus:outline-none focus:ring-1 focus:ring-[var(--rust)]"
        >
          <option value="">Select section...</option>
          {SECTION_TYPES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-white/60 block mb-1">Correction *</label>
        <textarea
          value={correctionText}
          onChange={e => setCorrectionText(e.target.value)}
          placeholder="What should the AI response have said instead..."
          rows={3}
          maxLength={1000}
          className="w-full text-sm border border-white/20 rounded-lg p-2 resize-none bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--rust)]"
        />
        <span className="text-xs text-white/40">{correctionText.length}/1000</span>
      </div>

      {error && <p className="text-xs text-rust">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !sectionType || correctionText.trim().length < 10}
          className="flex items-center gap-1 px-4 py-2 bg-rust text-white text-sm font-semibold rounded-lg hover:bg-rust/90 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Correction
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
