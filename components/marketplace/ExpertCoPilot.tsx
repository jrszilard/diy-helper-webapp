'use client';

import { useState } from 'react';
import { FileSearch, PenTool, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Card, Spinner, Alert } from '@/components/ui';
import CodeLookup from './CodeLookup';
import ReferenceSurface from './ReferenceSurface';

interface ExpertCoPilotProps {
  questionId: string;
  onInsertDraft: (draft: string) => void;
}

export default function ExpertCoPilot({ questionId, onInsertDraft }: ExpertCoPilotProps) {
  const [codesOpen, setCodesOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    setDraftError(null);
    setDraftText(null);

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
      setDraftText(data.draft);
    } catch {
      setDraftError('Something went wrong. Please try again.');
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {/* Section 1: Find Codes */}
      <div>
        <button
          onClick={() => setCodesOpen(!codesOpen)}
          className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-[var(--earth-sand)]/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileSearch size={16} className="text-[var(--slate-blue)]" />
            <span className="text-sm font-semibold text-[var(--earth-brown-dark)]">Find Codes</span>
          </div>
          {codesOpen
            ? <ChevronDown size={16} className="text-[var(--earth-brown)]" />
            : <ChevronRight size={16} className="text-[var(--earth-brown)]" />
          }
        </button>
        {codesOpen && (
          <div className="pl-1 pr-1 pb-2">
            <CodeLookup />
          </div>
        )}
      </div>

      {/* Section 2: Generate Draft */}
      <div>
        <button
          onClick={() => setDraftOpen(!draftOpen)}
          className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-[var(--earth-sand)]/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <PenTool size={16} className="text-[var(--slate-blue)]" />
            <span className="text-sm font-semibold text-[var(--earth-brown-dark)]">Generate Draft</span>
          </div>
          {draftOpen
            ? <ChevronDown size={16} className="text-[var(--earth-brown)]" />
            : <ChevronRight size={16} className="text-[var(--earth-brown)]" />
          }
        </button>
        {draftOpen && (
          <div className="pl-1 pr-1 pb-2 space-y-3">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={PenTool}
              onClick={handleGenerateDraft}
              disabled={draftLoading}
            >
              {draftLoading ? 'Generating...' : 'Draft Answer'}
            </Button>

            {draftLoading && (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" color="primary" />
              </div>
            )}

            {draftError && (
              <Alert variant="error">{draftError}</Alert>
            )}

            {draftText && (
              <div className="space-y-2">
                <Card padding="sm" className="max-h-48 overflow-y-auto">
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{draftText}</p>
                </Card>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onInsertDraft(draftText)}
                >
                  Insert into answer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Licensing & References */}
      <div>
        <button
          onClick={() => setRefsOpen(!refsOpen)}
          className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-[var(--earth-sand)]/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[var(--slate-blue)]" />
            <span className="text-sm font-semibold text-[var(--earth-brown-dark)]">Licensing & References</span>
          </div>
          {refsOpen
            ? <ChevronDown size={16} className="text-[var(--earth-brown)]" />
            : <ChevronRight size={16} className="text-[var(--earth-brown)]" />
          }
        </button>
        {refsOpen && (
          <div className="pl-1 pr-1 pb-2">
            <ReferenceSurface questionId={questionId} />
          </div>
        )}
      </div>
    </div>
  );
}
