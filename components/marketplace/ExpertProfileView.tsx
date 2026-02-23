'use client';

import { Star, MapPin, DollarSign, Clock, Shield, MessageSquare } from 'lucide-react';
import type { ExpertProfile } from '@/lib/marketplace/types';
import ReviewCard from './ReviewCard';
import Link from 'next/link';

interface ExpertProfileViewProps {
  expert: ExpertProfile;
  reviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: string;
    expertResponse: string | null;
  }>;
}

export default function ExpertProfileView({ expert, reviews }: ExpertProfileViewProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white border border-[#D4C8B8] rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
            {expert.profilePhotoUrl ? (
              <img
                src={expert.profilePhotoUrl}
                alt={expert.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#5D7B93]">
                {expert.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#3E2723]">{expert.displayName}</h1>
              {expert.verificationLevel >= 2 && (
                <Shield size={18} className="text-[#5D7B93]" />
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= Math.round(expert.avgRating) ? 'fill-[#C67B5C] text-[#C67B5C]' : 'text-[#D4C8B8]'}
                    />
                  ))}
                </div>
                <span className="text-sm text-[#7D6B5D]">
                  {expert.avgRating.toFixed(1)} ({expert.totalReviews} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-[#7D6B5D]">
                <MapPin size={14} />
                {expert.city}, {expert.state}
              </span>
              {expert.hourlyRateCents && (
                <span className="flex items-center gap-1 text-sm font-medium text-[#4A7C59]">
                  <DollarSign size={14} />
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </span>
              )}
              {expert.responseTimeHours && (
                <span className="flex items-center gap-1 text-sm text-[#7D6B5D]">
                  <Clock size={14} />
                  ~{expert.responseTimeHours}h response
                </span>
              )}
            </div>
          </div>
        </div>

        {expert.bio && (
          <div className="mt-4 pt-4 border-t border-[#D4C8B8]">
            <p className="text-sm text-[#3E2723]">{expert.bio}</p>
          </div>
        )}

        {expert.specialties.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-[#7D6B5D] mb-2">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {expert.specialties.map(s => (
                <span
                  key={s.specialty}
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    s.isPrimary
                      ? 'bg-[#C67B5C]/10 text-[#C67B5C] border border-[#C67B5C]/30'
                      : 'bg-[#5D7B93]/10 text-[#5D7B93]'
                  }`}
                >
                  {s.specialty.replace('_', ' ')}
                  {s.yearsExperience ? ` (${s.yearsExperience} yr)` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex items-center gap-3 mt-6">
          <Link
            href={`/marketplace/qa?expertId=${expert.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors"
          >
            <MessageSquare size={16} />
            Ask a Question
          </Link>
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E8DFD0] text-[#7D6B5D] text-sm font-semibold rounded-lg cursor-not-allowed"
          >
            Book Consultation
            <span className="text-xs italic">(Coming Soon)</span>
          </button>
        </div>
      </div>

      {/* Rates */}
      {(expert.hourlyRateCents || expert.qaRateCents) && (
        <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#3E2723] mb-3">Rates</h3>
          <div className="grid grid-cols-2 gap-4">
            {expert.hourlyRateCents && (
              <div>
                <p className="text-xs text-[#7D6B5D]">Hourly Rate</p>
                <p className="text-lg font-bold text-[#4A7C59]">
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </p>
              </div>
            )}
            {expert.qaRateCents && (
              <div>
                <p className="text-xs text-[#7D6B5D]">Q&A Rate</p>
                <p className="text-lg font-bold text-[#4A7C59]">
                  ${(expert.qaRateCents / 100).toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div>
        <h3 className="text-sm font-semibold text-[#3E2723] mb-3">
          Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-6 text-center">
            <p className="text-sm text-[#7D6B5D]">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
