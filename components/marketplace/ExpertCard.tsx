'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import type { ExpertProfile } from '@/lib/marketplace/types';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import StarRating from '@/components/ui/StarRating';

interface ExpertCardProps {
  expert: ExpertProfile;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <Link
      href={`/experts/${expert.id}`}
      className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar name={expert.displayName} src={expert.profilePhotoUrl} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-earth-cream truncate">{expert.displayName}</h3>

          <div className="flex items-center gap-1.5 mt-1">
            <StarRating value={expert.avgRating} size="sm" />
            <span className="text-xs text-white/50">({expert.totalReviews})</span>
          </div>

          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-white/40" />
            <span className="text-xs text-white/50">{expert.city}, {expert.state}</span>
          </div>

          {expert.hourlyRateCents && (
            <span className="text-xs font-medium text-forest-green mt-1 block">
              {formatPrice(expert.hourlyRateCents)}/hr
            </span>
          )}
        </div>
      </div>

      {expert.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {expert.specialties.slice(0, 4).map(s => (
            <Badge key={s.specialty}>{s.specialty.replace('_', ' ')}</Badge>
          ))}
          {expert.specialties.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-white/30">
              +{expert.specialties.length - 4} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
