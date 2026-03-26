'use client';

import { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';

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
    <div className="bg-white border border-earth-sand rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Your Answer</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            rows={6}
            fullWidth
            resize="none"
            placeholder="Provide a detailed answer..."
          />
          <p className={`text-xs mt-1 ${
            charCount < 50 ? 'text-terracotta' : charCount > 2000 ? 'text-red-600' : 'text-muted'
          }`}>
            {charCount}/2000 characters (minimum 50)
          </p>
        </div>

        <Textarea
          label="Photo URLs (optional)"
          value={photoUrls}
          onChange={e => setPhotoUrls(e.target.value)}
          rows={2}
          fullWidth
          resize="none"
          placeholder="One URL per line"
        />

        <div className="border border-earth-sand rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recommendsPro}
              onChange={e => setRecommendsPro(e.target.checked)}
              className="w-4 h-4 accent-terracotta"
            />
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--warning)]" />
              <span className="text-sm font-medium text-foreground">Recommend hiring a professional</span>
            </div>
          </label>
          {recommendsPro && (
            <Textarea
              value={proReason}
              onChange={e => setProReason(e.target.value)}
              rows={2}
              fullWidth
              resize="none"
              placeholder="Why should they hire a professional?"
              className="mt-2"
            />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="secondary"
            size="lg"
            leftIcon={submitting ? undefined : Send}
            iconSize={16}
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? <><Spinner size="sm" color="default" className="text-white" /> Submitting...</> : 'Submit Answer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
