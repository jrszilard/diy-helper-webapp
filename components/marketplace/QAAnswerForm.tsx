'use client';

import { useState } from 'react';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QAAnswerFormProps {
  questionId: string;
  onSuccess: () => void;
}

export default function QAAnswerForm({ questionId, onSuccess }: QAAnswerFormProps) {
  const [answerText, setAnswerText] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [recommendsPro, setRecommendsPro] = useState(false);
  const [proReason, setProReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = answerText.length;
  const isValid = charCount >= 50 && charCount <= 2000;

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        setSubmitting(false);
        return;
      }

      const photos = photoUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const res = await fetch(`/api/qa/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answerText: answerText.trim(),
          photoUrls: photos,
          recommendsProfessional: recommendsPro,
          proRecommendationReason: recommendsPro ? proReason.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit answer.');
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-6">
      <h3 className="text-lg font-bold text-[#3E2723] mb-4">Your Answer</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
            placeholder="Provide a detailed answer..."
          />
          <p className={`text-xs mt-1 ${
            charCount < 50 ? 'text-[#C67B5C]' : charCount > 2000 ? 'text-red-600' : 'text-[#B0A696]'
          }`}>
            {charCount}/2000 characters (minimum 50)
          </p>
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

        <div className="border border-[#D4C8B8] rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recommendsPro}
              onChange={e => setRecommendsPro(e.target.checked)}
              className="w-4 h-4 accent-[#C67B5C]"
            />
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-[#3E2723]">Recommend hiring a professional</span>
            </div>
          </label>
          {recommendsPro && (
            <textarea
              value={proReason}
              onChange={e => setProReason(e.target.value)}
              rows={2}
              className="w-full mt-2 px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
              placeholder="Why should they hire a professional?"
            />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              submitting || !isValid
                ? 'bg-[#B0A696] cursor-not-allowed'
                : 'bg-[#4A7C59] hover:bg-[#2D5A3B]'
            }`}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
