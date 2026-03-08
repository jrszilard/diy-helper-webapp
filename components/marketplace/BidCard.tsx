'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Star, CheckCircle, DollarSign, Loader2 } from 'lucide-react';

interface BidCardProps {
  bid: {
    id: string;
    expertId: string;
    proposedPriceCents: number;
    expertPayoutCents: number;
    pitch: string;
    estimatedMinutes: number | null;
    relevantExperience: string | null;
    status: string;
    createdAt: string;
  };
  expert?: {
    displayName: string;
    profilePhotoUrl: string | null;
    avgRating: number;
    totalReviews: number;
    specialties: Array<{ specialty: string; yearsExperience: number | null; isPrimary: boolean }>;
  };
  /** Show select button (DIYer view) */
  canSelect?: boolean;
  onSelect?: (bidId: string) => Promise<void>;
  /** Is this the accepted bid? */
  isAccepted?: boolean;
}

export default function BidCard({ bid, expert, canSelect, onSelect, isAccepted }: BidCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async () => {
    if (!onSelect || selecting) return;
    setSelecting(true);
    try {
      await onSelect(bid.id);
    } finally {
      setSelecting(false);
    }
  };

  const primarySpecialty = expert?.specialties?.find(s => s.isPrimary);
  const pitchPreview = bid.pitch.length > 120 ? bid.pitch.slice(0, 120) + '...' : bid.pitch;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      isAccepted
        ? 'border-[#4A7C59] bg-[#4A7C59]/5'
        : bid.status === 'rejected'
        ? 'border-[#D4C8B8] bg-gray-50 opacity-60'
        : 'border-[#D4C8B8] bg-white hover:border-[#C67B5C]/30'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Expert info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {expert?.profilePhotoUrl ? (
                <img
                  src={expert.profilePhotoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#5D7B93]/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#5D7B93]">
                    {expert?.displayName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-[#3E2723]">
                  {expert?.displayName || 'Expert'}
                </span>
                {expert && expert.avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] text-[#7D6B5D]">
                      {expert.avgRating.toFixed(1)} ({expert.totalReviews})
                    </span>
                  </div>
                )}
              </div>
              {isAccepted && (
                <span className="flex items-center gap-1 text-xs font-medium text-[#4A7C59] bg-[#4A7C59]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} />
                  Selected
                </span>
              )}
            </div>

            {/* Specialty & experience */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {primarySpecialty && (
                <span className="text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
                  {primarySpecialty.specialty}
                  {primarySpecialty.yearsExperience ? ` · ${primarySpecialty.yearsExperience}yr` : ''}
                </span>
              )}
              {bid.estimatedMinutes && (
                <span className="flex items-center gap-1 text-xs text-[#7D6B5D]">
                  <Clock size={10} />
                  ~{bid.estimatedMinutes} min
                </span>
              )}
            </div>

            {/* Pitch */}
            <p className="text-sm text-[#3E2723]">
              {expanded ? bid.pitch : pitchPreview}
            </p>

            {bid.pitch.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-[#5D7B93] hover:text-[#4A6578] mt-1 font-medium"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Show less' : 'Read full pitch'}
              </button>
            )}

            {/* Relevant experience (shown when expanded) */}
            {expanded && bid.relevantExperience && (
              <div className="mt-2 bg-[#E8DFD0]/30 rounded px-2 py-1.5">
                <p className="text-xs text-[#7D6B5D]">
                  <span className="font-medium">Experience:</span> {bid.relevantExperience}
                </p>
              </div>
            )}
          </div>

          {/* Price & action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="flex items-center gap-0.5 text-lg font-bold text-[#4A7C59]">
                <DollarSign size={14} />
                {(bid.proposedPriceCents / 100).toFixed(0)}
              </span>
              <p className="text-[10px] text-[#B0A696]">DIYer pays</p>
            </div>

            {canSelect && bid.status === 'pending' && (
              <button
                onClick={handleSelect}
                disabled={selecting}
                className="px-4 py-2 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {selecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Select Expert'
                )}
              </button>
            )}

            {bid.status === 'withdrawn' && (
              <span className="text-xs text-[#B0A696]">Withdrawn</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
