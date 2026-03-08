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
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={14}
              className={star <= review.rating ? 'fill-[#C67B5C] text-[#C67B5C]' : 'text-[#D4C8B8]'}
            />
          ))}
        </div>
        <span className="text-xs text-[#B0A696]">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && (
        <p className="text-sm font-semibold text-[#3E2723] mb-1">{review.title}</p>
      )}

      {review.body && (
        <p className="text-sm text-[#7D6B5D]">{review.body}</p>
      )}

      {review.expertResponse && (
        <div className="mt-3 bg-[#E8DFD0]/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-[#7D6B5D] mb-1">Expert Response</p>
          <p className="text-sm text-[#3E2723]">{review.expertResponse}</p>
        </div>
      )}
    </div>
  );
}
