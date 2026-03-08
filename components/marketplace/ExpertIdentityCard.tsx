'use client';

import { Star, Clock, Shield, Award } from 'lucide-react';

interface ExpertIdentityCardProps {
  displayName: string;
  profilePhotoUrl: string | null;
  avgRating: number;
  totalReviews: number;
  responseTimeHours: number | null;
  verificationLevel: number;
  specialties: Array<{
    specialty: string;
    yearsExperience: number | null;
    isPrimary: boolean;
  }>;
  /** Show compact single-line version */
  compact?: boolean;
}

/** Extract first name + last initial from a display name. */
function formatFirstNameLastInitial(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Expert';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export default function ExpertIdentityCard({
  displayName,
  profilePhotoUrl,
  avgRating,
  totalReviews,
  responseTimeHours,
  verificationLevel,
  specialties,
  compact,
}: ExpertIdentityCardProps) {
  const safeName = formatFirstNameLastInitial(displayName);
  const primarySpecialty = specialties.find(s => s.isPrimary) || specialties[0];
  const maxYears = Math.max(
    ...specialties.map(s => s.yearsExperience ?? 0).filter(y => y > 0),
    0,
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt={safeName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[#5D7B93]">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-[#3E2723] truncate">{safeName}</span>
            {verificationLevel >= 2 && <Shield size={12} className="text-[#5D7B93] flex-shrink-0" />}
          </div>
          {primarySpecialty && (
            <span className="text-xs text-[#7D6B5D]">
              {primarySpecialty.specialty.replace('_', ' ')}
              {maxYears > 0 ? ` \u00b7 ${maxYears}+ yr exp` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-[#D4C8B8] rounded-lg">
      <div className="w-12 h-12 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
        {profilePhotoUrl ? (
          <img src={profilePhotoUrl} alt={safeName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-[#5D7B93]">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-bold text-[#3E2723] truncate">{safeName}</h4>
          {verificationLevel >= 2 && (
            <Shield size={14} className="text-[#5D7B93] flex-shrink-0" />
          )}
        </div>

        {/* Rating */}
        {totalReviews > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={12}
                  className={star <= Math.round(avgRating) ? 'fill-[#C67B5C] text-[#C67B5C]' : 'text-[#D4C8B8]'}
                />
              ))}
            </div>
            <span className="text-xs text-[#7D6B5D]">
              {avgRating.toFixed(1)} ({totalReviews})
            </span>
          </div>
        )}

        {/* Specialty + experience */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {primarySpecialty && (
            <span className="px-2 py-0.5 text-xs bg-[#C67B5C]/10 text-[#C67B5C] rounded-full font-medium border border-[#C67B5C]/20">
              {primarySpecialty.specialty.replace('_', ' ')}
            </span>
          )}
          {maxYears > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#7D6B5D]">
              <Award size={11} />
              {maxYears}+ years experience
            </span>
          )}
          {responseTimeHours != null && (
            <span className="flex items-center gap-1 text-xs text-[#7D6B5D]">
              <Clock size={11} />
              ~{responseTimeHours}h response
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { formatFirstNameLastInitial };
