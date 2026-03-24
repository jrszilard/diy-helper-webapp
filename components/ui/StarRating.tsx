'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<StarRatingSize, number> = { sm: 14, md: 18, lg: 24 };

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: StarRatingSize;
  max?: number;
  className?: string;
}

export default function StarRating({
  value,
  onChange,
  size = 'md',
  max = 5,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const interactive = !!onChange;
  const starSize = sizeMap[size];
  const display = hovered ?? value;

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Star rating' : `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map(star => {
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={cn(
              'focus:outline-none',
              interactive ? 'cursor-pointer' : 'cursor-default',
            )}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              size={starSize}
              className={cn(
                'transition-colors',
                filled
                  ? 'fill-[#C67B5C] text-[#C67B5C]'
                  : 'text-[var(--earth-tan)] fill-[var(--earth-tan)]',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
