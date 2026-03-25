'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';

interface ReviewFormProps {
  expertId: string;
  questionId?: string;
  onSuccess: () => void;
}

export default function ReviewForm({ expertId, questionId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        setSubmitting(false);
        return;
      }

      const endpoint = questionId
        ? `/api/qa/${questionId}/review`
        : `/api/experts/${expertId}/reviews`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          body: body.trim() || null,
          expertId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit review.');
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
      <h3 className="text-lg font-bold text-foreground mb-4">Leave a Review</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Rating *</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-terracotta text-terracotta'
                      : 'text-earth-sand'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <TextInput
          label="Title (optional)"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          placeholder="Summarize your experience"
        />

        <Textarea
          label="Review (optional)"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          fullWidth
          resize="none"
          placeholder="Tell others about your experience..."
        />

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              submitting || rating === 0
                ? 'bg-[var(--muted)] cursor-not-allowed'
                : 'bg-terracotta hover:bg-terracotta-dark'
            }`}
          >
            {submitting && <Spinner size="sm" />}
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
