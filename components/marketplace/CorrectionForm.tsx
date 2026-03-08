'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Correction {
  id: string;
  section_type: string;
  original_content: string | null;
  corrected_content: string;
  correction_reason: string | null;
  created_at: string;
}

interface CorrectionFormProps {
  questionId: string;
  userRole: 'diyer' | 'expert';
  hasReport: boolean;
}

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

export default function CorrectionForm({ questionId, userRole, hasReport }: CorrectionFormProps) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [sectionType, setSectionType] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [correctedContent, setCorrectedContent] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const fetchCorrections = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/qa/${questionId}/corrections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    if (hasReport) fetchCorrections();
    else setLoading(false);
  }, [hasReport, fetchCorrections]);

  const handleSubmit = async () => {
    if (!sectionType || !correctedContent.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        return;
      }

      const res = await fetch(`/api/qa/${questionId}/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sectionType,
          originalContent: originalContent.trim() || undefined,
          correctedContent: correctedContent.trim(),
          correctionReason: correctionReason.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setSectionType('');
        setOriginalContent('');
        setCorrectedContent('');
        setCorrectionReason('');
        setShowForm(false);
        fetchCorrections();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit correction.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasReport) return null;

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-amber-50/50 hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" />
          <h4 className="text-sm font-semibold text-[#3E2723]">
            Report Corrections
            {corrections.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-[#7D6B5D]">({corrections.length})</span>
            )}
          </h4>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#7D6B5D]" /> : <ChevronDown size={14} className="text-[#7D6B5D]" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-[#C67B5C]" />
            </div>
          ) : (
            <>
              {/* Existing corrections */}
              {corrections.map((c) => (
                <div key={c.id} className="bg-[#F5F0E6] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      {SECTION_TYPES.find(s => s.value === c.section_type)?.label || c.section_type}
                    </span>
                    <span className="text-[10px] text-[#B0A696]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {c.original_content && (
                    <p className="text-xs text-[#7D6B5D] line-through mb-1">
                      AI said: {c.original_content}
                    </p>
                  )}
                  <p className="text-sm text-[#3E2723]">{c.corrected_content}</p>
                  {c.correction_reason && (
                    <p className="text-xs text-[#7D6B5D] mt-1 italic">Reason: {c.correction_reason}</p>
                  )}
                </div>
              ))}

              {corrections.length === 0 && userRole === 'diyer' && (
                <p className="text-xs text-[#B0A696] text-center py-2">
                  No corrections yet. Your project report gets smarter with every expert interaction.
                </p>
              )}

              {/* Success message */}
              {success && (
                <div className="flex items-center gap-2 text-sm text-[#4A7C59]">
                  <CheckCircle2 size={14} />
                  Correction submitted! The DIYer will see this on their report.
                </div>
              )}

              {/* Expert: add correction form */}
              {userRole === 'expert' && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#5D7B93] hover:text-[#4A6578] transition-colors"
                >
                  <Plus size={12} />
                  Flag a correction to the AI report
                </button>
              )}

              {showForm && (
                <div className="space-y-3 border-t border-[#D4C8B8] pt-3">
                  <div>
                    <label className="text-xs font-medium text-[#7D6B5D] block mb-1">Section</label>
                    <select
                      value={sectionType}
                      onChange={e => setSectionType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
                    >
                      <option value="">Select section...</option>
                      {SECTION_TYPES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#7D6B5D] block mb-1">What the AI said (optional)</label>
                    <textarea
                      value={originalContent}
                      onChange={e => setOriginalContent(e.target.value)}
                      placeholder="Quote the AI report text that needs correction..."
                      rows={2}
                      className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
                      maxLength={2000}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#7D6B5D] block mb-1">Correct information *</label>
                    <textarea
                      value={correctedContent}
                      onChange={e => setCorrectedContent(e.target.value)}
                      placeholder="What should it say instead..."
                      rows={3}
                      className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
                      maxLength={2000}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#7D6B5D] block mb-1">Reason (optional)</label>
                    <input
                      value={correctionReason}
                      onChange={e => setCorrectionReason(e.target.value)}
                      placeholder="Why this correction matters..."
                      className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
                      maxLength={500}
                    />
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !sectionType || !correctedContent.trim()}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Submit Correction'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-sm text-[#7D6B5D] hover:text-[#3E2723] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
