'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QASubmitFormProps {
  reportId?: string;
  reportContext?: { projectSummary?: string; projectType?: string };
  onSuccess: (questionId: string) => void;
}

const CATEGORIES = [
  'electrical',
  'plumbing',
  'hvac',
  'carpentry',
  'flooring',
  'roofing',
  'concrete',
  'drywall',
  'painting',
  'tile',
  'landscaping',
  'general',
];

export default function QASubmitForm({ reportId, reportContext, onSuccess }: QASubmitFormProps) {
  const [category, setCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstQuestion, setIsFirstQuestion] = useState(false);

  const handleSubmit = async () => {
    if (!questionText.trim() || questionText.trim().length < 20) {
      setError('Please provide a detailed question (at least 20 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to ask a question.');
        setSubmitting(false);
        return;
      }

      const photos = photoUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId,
          category,
          questionText: questionText.trim(),
          photoUrls: photos,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit question.');
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      onSuccess(data.questionId || data.id);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-6">
      <h2 className="text-lg font-bold text-[#3E2723] mb-4">Ask an Expert</h2>

      {reportContext?.projectSummary && (
        <div className="bg-[#E8DFD0]/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-[#7D6B5D] font-medium mb-1">Project Context</p>
          <p className="text-sm text-[#3E2723]">{reportContext.projectSummary}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#3E2723] mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3E2723] mb-1">Your Question</label>
          <textarea
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
            placeholder="Describe your question in detail..."
          />
          <p className="text-xs text-[#B0A696] mt-1">{questionText.length} characters (minimum 20)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3E2723] mb-1">Photo URLs (optional)</label>
          <textarea
            value={photoUrls}
            onChange={e => setPhotoUrls(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
            placeholder="One URL per line"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {isFirstQuestion ? (
              <span className="text-sm font-semibold text-[#4A7C59]">FREE</span>
            ) : (
              <span className="text-sm text-[#7D6B5D]">Price: $5 - $15</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || questionText.trim().length < 20}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              submitting || questionText.trim().length < 20
                ? 'bg-[#B0A696] cursor-not-allowed'
                : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
            }`}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting ? 'Submitting...' : 'Submit Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
