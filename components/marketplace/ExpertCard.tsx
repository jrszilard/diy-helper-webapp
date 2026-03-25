'use client';

import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import type { ExpertProfile } from '@/lib/marketplace/types';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';

interface ExpertCardProps {
  expert: ExpertProfile;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <Link
      href={`/experts/${expert.id}`}
      className="block bg-white border border-earth-sand rounded-lg p-4 hover:shadow-md hover:border-terracotta/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar name={expert.displayName} src={expert.profilePhotoUrl} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{expert.displayName}</h3>

          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={12}
                  className={star <= Math.round(expert.avgRating) ? 'fill-terracotta text-terracotta' : 'text-earth-sand'}
                />
              ))}
            </div>
            <span className="text-xs text-earth-brown">
              ({expert.totalReviews})
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-earth-brown" />
            <span className="text-xs text-earth-brown">{expert.city}, {expert.state}</span>
          </div>

          {expert.hourlyRateCents && (
            <span className="text-xs font-medium text-forest-green mt-1">
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
            <span className="px-2 py-0.5 text-xs text-[var(--muted)]">
              +{expert.specialties.length - 4} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
