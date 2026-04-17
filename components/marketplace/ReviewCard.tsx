'use client';

import StarRating from '@/components/ui/StarRating';

interface ReviewCardProps {
  review: {
    rating: number;
    title?: string | null;
    body?: string | null;
    createdAt: string;
    expertResponse?: string | null;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <StarRating value={review.rating} size="sm" />
        <span className="text-xs text-white/40">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && (
        <p className="text-sm font-semibold text-earth-cream mb-1">{review.title}</p>
      )}

      {review.body && (
        <p className="text-sm text-white/60">{review.body}</p>
      )}

      {review.expertResponse && (
        <div className="mt-3 bg-white/5 rounded-lg p-3">
          <p className="text-xs font-semibold text-white/50 mb-1">Expert Response</p>
          <p className="text-sm text-white/60">{review.expertResponse}</p>
        </div>
      )}
    </div>
  );
}
