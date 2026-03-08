'use client';

import Link from 'next/link';
import { Star, MapPin, DollarSign } from 'lucide-react';
import type { ExpertProfile } from '@/lib/marketplace/types';

interface ExpertCardProps {
  expert: ExpertProfile;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <Link
      href={`/experts/${expert.id}`}
      className="block bg-white border border-[#D4C8B8] rounded-lg p-4 hover:shadow-md hover:border-[#C67B5C]/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
          {expert.profilePhotoUrl ? (
            <img
              src={expert.profilePhotoUrl}
              alt={expert.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#5D7B93]">
              {expert.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#3E2723] truncate">{expert.displayName}</h3>

          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={12}
                  className={star <= Math.round(expert.avgRating) ? 'fill-[#C67B5C] text-[#C67B5C]' : 'text-[#D4C8B8]'}
                />
              ))}
            </div>
            <span className="text-xs text-[#7D6B5D]">
              ({expert.totalReviews})
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-[#7D6B5D]" />
            <span className="text-xs text-[#7D6B5D]">{expert.city}, {expert.state}</span>
          </div>

          {expert.hourlyRateCents && (
            <div className="flex items-center gap-1 mt-1">
              <DollarSign size={12} className="text-[#4A7C59]" />
              <span className="text-xs font-medium text-[#4A7C59]">
                ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
              </span>
            </div>
          )}
        </div>
      </div>

      {expert.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {expert.specialties.slice(0, 4).map(s => (
            <span
              key={s.specialty}
              className="px-2 py-0.5 text-xs bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium"
            >
              {s.specialty.replace('_', ' ')}
            </span>
          ))}
          {expert.specialties.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-[#B0A696]">
              +{expert.specialties.length - 4} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
