'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ExpertProfileView from '@/components/marketplace/ExpertProfileView';
import type { ExpertProfile } from '@/lib/marketplace/types';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  expertResponse: string | null;
}

export default function ExpertDetailPage() {
  const params = useParams();
  const expertId = params.id as string;
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [expertRes, reviewsRes] = await Promise.all([
          fetch(`/api/experts/${expertId}`),
          fetch(`/api/experts/${expertId}/reviews`),
        ]);

        if (expertRes.ok) {
          const expertData = await expertRes.json();
          setExpert(expertData.profile || expertData.expert);
        } else {
          setError(true);
        }

        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.reviews || []);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (expertId) fetchData();
  }, [expertId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#7D6B5D] mb-4">Expert not found</p>
          <Link href="/experts" className="text-sm text-[#5D7B93] hover:underline">
            Browse Experts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/experts"
            className="flex items-center gap-1.5 text-sm text-[#5D7B93] hover:text-[#4A6578] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Experts
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <ExpertProfileView expert={expert} reviews={reviews} />
      </main>
    </div>
  );
}
