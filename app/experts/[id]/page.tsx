'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import AppHeader from '@/components/AppHeader';
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
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/50 mb-4">Expert not found</p>
          <Button variant="ghost" href="/experts" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
            Browse Experts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            href="/experts"
            leftIcon={ArrowLeft}
            iconSize={16}
            className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10"
          >
            Back to Experts
          </Button>
        </div>
        <ExpertProfileView expert={expert} reviews={reviews} />
      </main>
    </div>
  );
}
