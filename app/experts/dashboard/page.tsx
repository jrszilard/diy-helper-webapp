'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import SectionHeader from '@/components/ui/SectionHeader';
import Alert from '@/components/ui/Alert';
import StripeOnboardBanner from '@/components/marketplace/StripeOnboardBanner';
import DashboardStats from '@/components/marketplace/DashboardStats';
import DashboardQAQueue from '@/components/marketplace/DashboardQAQueue';

interface DashboardApiResponse {
  dashboard: {
    totalEarningsCents: number;
    recentReviewsCount: number;
    activeQACount: number;
    pendingPayoutCents: number;
    avgRating: number;
    totalReviews: number;
    isAvailable: boolean;
    verificationLevel: number;
    stripeOnboardingComplete: boolean;
  };
}

interface QueueQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents?: number;
  createdAt: string;
}

interface QueueApiResponse {
  questions: QueueQuestion[];
}

export default function ExpertDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [queueQuestions, setQueueQuestions] = useState<QueueQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [dashRes, queueRes] = await Promise.all([
          fetch('/api/experts/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/qa/queue', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (dashRes.ok) {
          const json = await dashRes.json();
          setData(json);
        }
        if (queueRes.ok) {
          const queueJson: QueueApiResponse = await queueRes.json();
          setQueueQuestions(queueJson.questions.slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <Alert variant="error">Failed to load dashboard data.</Alert>
      </div>
    );
  }

  const d = data.dashboard;
  const stats = {
    totalEarnings: d.totalEarningsCents,
    monthEarnings: d.pendingPayoutCents, // use pending as month proxy for now
    totalReviews: d.totalReviews,
    avgRating: d.avgRating,
    activeQuestions: d.activeQACount,
    pendingPayouts: d.pendingPayoutCents,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader size="lg" title="Dashboard" />

      <StripeOnboardBanner stripeOnboardingComplete={d.stripeOnboardingComplete} />
      <DashboardStats stats={stats} />
      <DashboardQAQueue questions={queueQuestions} />
    </div>
  );
}
