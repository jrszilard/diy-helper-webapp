'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import CorrectionInlineForm from './CorrectionInlineForm';

interface ReviewIssue {
  item?: number;
  severity?: string;
  detail?: string;
}

interface ReviewItem {
  id: string;
  category: string | null;
  userQuestion: string;
  draftResponse: string;
  verdict: string;
  confidence: number | null;
  issues: ReviewIssue[];
  safetyKeywords: string[];
  createdAt: string;
}

interface ReviewCardProps {
  item: ReviewItem;
  onCorrection: (id: string, sectionType: string, correctionText: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export default function ReviewCard({ item, onCorrection, onDismiss }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (dismissed || submitted) {
    return (
      <div className="bg-white/6 border border-white/10 rounded-lg p-4 text-sm text-forest-green flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        {submitted ? 'Correction submitted — thanks!' : 'Dismissed'}
      </div>
    );
  }

  const handleCorrection = async (sectionType: string, correctionText: string) => {
    await onCorrection(item.id, sectionType, correctionText);
    setSubmitted(true);
  };

  const handleDismiss = async () => {
    await onDismiss(item.id);
    setDismissed(true);
  };

  return (
    <div className="bg-white/6 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {item.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white font-medium">
            {item.category}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          item.verdict === 'REVISE' ? 'bg-rust text-white' : 'bg-white/10 text-white/70'
        }`}>
          {item.verdict}
        </span>
        {item.confidence != null && (
          <span className="text-xs text-white/40">
            confidence: {(item.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-foreground">{item.userQuestion}</p>

      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-blue hover:text-slate-blue-dark flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide' : 'Show'} AI response
        </button>
        {expanded && (
          <div className="mt-2 text-sm text-white/60 bg-white/8 rounded-lg p-3 max-h-60 overflow-y-auto whitespace-pre-wrap">
            {item.draftResponse}
          </div>
        )}
      </div>

      {item.issues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.issues.map((issue, idx) => (
            <span
              key={idx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                issue.severity === 'critical' ? 'bg-rust text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {issue.detail || `Rubric item ${issue.item}`}
            </span>
          ))}
        </div>
      )}

      {item.safetyKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.safetyKeywords.map(kw => (
            <span key={kw} className="text-xs px-1.5 py-0.5 rounded bg-rust/10 text-rust">
              {kw}
            </span>
          ))}
        </div>
      )}

      {!showForm && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-rust text-white rounded-lg hover:bg-rust/90 transition-colors"
          >
            Submit Correction
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            Looks Good
          </button>
        </div>
      )}

      {showForm && (
        <CorrectionInlineForm
          onSubmit={handleCorrection}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
