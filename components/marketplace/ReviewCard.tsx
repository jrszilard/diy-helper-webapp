'use client';

import { Star } from 'lucide-react';

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
    <div className="bg-white border border-earth-sand rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={14}
              className={star <= review.rating ? 'fill-terracotta text-terracotta' : 'text-earth-sand'}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--muted)]">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && (
        <p className="text-sm font-semibold text-foreground mb-1">{review.title}</p>
      )}

      {review.body && (
        <p className="text-sm text-earth-brown">{review.body}</p>
      )}

      {review.expertResponse && (
        <div className="mt-3 bg-earth-tan/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-earth-brown mb-1">Expert Response</p>
          <p className="text-sm text-foreground">{review.expertResponse}</p>
        </div>
      )}
    </div>
  );
}
