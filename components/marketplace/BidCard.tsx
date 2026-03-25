'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Star, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

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
    <Card
      padding="none"
      className={cn(
        'overflow-hidden transition-colors',
        isAccepted && 'border-forest-green bg-forest-green/5',
        bid.status === 'rejected' && 'bg-gray-50 opacity-60',
        !isAccepted && bid.status !== 'rejected' && 'hover:border-terracotta/30',
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Expert info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar name={expert?.displayName || '?'} src={expert?.profilePhotoUrl} size="sm" />
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {expert?.displayName || 'Expert'}
                </span>
                {expert && expert.avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] text-earth-brown">
                      {expert.avgRating.toFixed(1)} ({expert.totalReviews})
                    </span>
                  </div>
                )}
              </div>
              {isAccepted && (
                <Badge variant="success" icon={CheckCircle}>Selected</Badge>
              )}
            </div>

            {/* Specialty & experience */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {primarySpecialty && (
                <Badge>
                  {primarySpecialty.specialty}
                  {primarySpecialty.yearsExperience ? ` · ${primarySpecialty.yearsExperience}yr` : ''}
                </Badge>
              )}
              {bid.estimatedMinutes && (
                <span className="flex items-center gap-1 text-xs text-earth-brown">
                  <Clock size={10} />
                  ~{bid.estimatedMinutes} min
                </span>
              )}
            </div>

            {/* Pitch */}
            <p className="text-sm text-foreground">
              {expanded ? bid.pitch : pitchPreview}
            </p>

            {bid.pitch.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-slate-blue hover:text-slate-blue-dark mt-1 font-medium"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Show less' : 'Read full pitch'}
              </button>
            )}

            {/* Relevant experience (shown when expanded) */}
            {expanded && bid.relevantExperience && (
              <div className="mt-2 bg-earth-tan/30 rounded px-2 py-1.5">
                <p className="text-xs text-earth-brown">
                  <span className="font-medium">Experience:</span> {bid.relevantExperience}
                </p>
              </div>
            )}
          </div>

          {/* Price & action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="text-lg font-bold text-forest-green">
                {formatPrice(bid.proposedPriceCents)}
              </span>
              <p className="text-[10px] text-[var(--muted)]">DIYer pays</p>
            </div>

            {canSelect && bid.status === 'pending' && (
              <Button variant="primary" size="sm" onClick={handleSelect} disabled={selecting}>
                {selecting ? (
                  <Spinner size="sm" />
                ) : (
                  'Select Expert'
                )}
              </Button>
            )}

            {bid.status === 'withdrawn' && (
              <span className="text-xs text-[var(--muted)]">Withdrawn</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
