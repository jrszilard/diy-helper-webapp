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

function StarIcon({ size, filled, half }: { size: number; filled: boolean; half: boolean }) {
  if (half) {
    return (
      <span className="relative inline-flex">
        <Star size={size} className="fill-white/[0.35] text-white/[0.35]" />
        <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
          <Star size={size} className="fill-[var(--gold)] text-[var(--gold)]" />
        </span>
      </span>
    );
  }
  return (
    <Star
      size={size}
      className={cn(
        'transition-colors',
        filled ? 'fill-[var(--gold)] text-[var(--gold)]' : 'fill-white/[0.35] text-white/[0.35]',
      )}
    />
  );
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
  // round to nearest 0.5 for half-star display; integer when hovering
  const display = hovered ?? Math.round(value * 2) / 2;

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Star rating' : `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map(star => {
        const filled = star <= display;
        const half = !filled && star - 0.5 <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={cn('focus:outline-none', interactive ? 'cursor-pointer' : 'cursor-default')}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <StarIcon size={starSize} filled={filled} half={half} />
          </button>
        );
      })}
    </div>
  );
}
