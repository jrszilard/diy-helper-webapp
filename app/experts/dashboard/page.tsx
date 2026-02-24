'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
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
  };
}

export default function ExpertDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/experts/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#7D6B5D]">Failed to load dashboard data.</p>
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
      <h1 className="text-xl font-bold text-[#3E2723]">Dashboard</h1>

      <StripeOnboardBanner stripeOnboardingComplete={false} />
      <DashboardStats stats={stats} />
      <DashboardQAQueue questions={[]} />
    </div>
  );
}
