'use client';

import { useState } from 'react';
import { BookOpen, FileEdit, Scale, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CodeLookup from './CodeLookup';
import ReferenceSurface from './ReferenceSurface';

interface ExpertCoPilotProps {
  questionId: string;
  onInsertDraft: (draft: string) => void;
}

export default function ExpertCoPilot({ questionId, onInsertDraft }: ExpertCoPilotProps) {
  const [codesOpen, setCodesOpen] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    setDraftError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setDraftError('Please sign in.');
        setDraftLoading(false);
        return;
      }

      const res = await fetch('/api/experts/tools/draft-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDraftError(data.error || 'Failed to generate draft.');
        setDraftLoading(false);
        return;
      }

      const data = await res.json();
      onInsertDraft(data.draft);
    } catch {
      setDraftError('Something went wrong. Please try again.');
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg overflow-hidden mb-4">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#D4C8B8] bg-[#FDFBF7]">
        <p className="text-xs font-medium text-[#A89880]">AI Assistant Tools</p>
      </div>

      <div className="divide-y divide-[#D4C8B8]">
        {/* Tool 1: Code Lookup */}
        <div>
          <button
            onClick={() => setCodesOpen(!codesOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#F0E8DC] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-[#5D7B93]" />
              <span className="text-sm font-medium text-[#3E2723]">Find Codes</span>
            </div>
            {codesOpen ? (
              <ChevronUp size={14} className="text-[#7D6B5D]" />
            ) : (
              <ChevronDown size={14} className="text-[#7D6B5D]" />
            )}
          </button>
          {codesOpen && (
            <div className="px-4 pb-3">
              <CodeLookup questionId={questionId} />
            </div>
          )}
        </div>

        {/* Tool 2: Generate Draft */}
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileEdit size={14} className="text-[#5D7B93]" />
              <span className="text-sm font-medium text-[#3E2723]">Generate Draft</span>
            </div>
            <button
              onClick={handleGenerateDraft}
              disabled={draftLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#C67B5C] rounded hover:bg-[#B06A4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {draftLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileEdit size={12} />
              )}
              {draftLoading ? 'Generating...' : 'Draft Answer'}
            </button>
          </div>
          {draftError && (
            <p className="text-xs text-red-600 mt-1.5">{draftError}</p>
          )}
        </div>

        {/* Tool 3: Licensing & References */}
        <div>
          <button
            onClick={() => setRefsOpen(!refsOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#F0E8DC] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scale size={14} className="text-[#5D7B93]" />
              <span className="text-sm font-medium text-[#3E2723]">Licensing &amp; References</span>
            </div>
            {refsOpen ? (
              <ChevronUp size={14} className="text-[#7D6B5D]" />
            ) : (
              <ChevronDown size={14} className="text-[#7D6B5D]" />
            )}
          </button>
          {refsOpen && (
            <div className="px-4 pb-3">
              <ReferenceSurface questionId={questionId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
