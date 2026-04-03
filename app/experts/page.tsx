'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import AppHeader from '@/components/AppHeader';
import ExpertSearchFilters from '@/components/marketplace/ExpertSearchFilters';
import ExpertCard from '@/components/marketplace/ExpertCard';
import type { ExpertProfile } from '@/lib/marketplace/types';

interface Filters {
  specialty: string;
  state: string;
  minRating: number;
}

export default function ExpertsBrowsePage() {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    specialty: '',
    state: '',
    minRating: 0,
  });

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.specialty) params.set('specialty', filters.specialty);
      if (filters.state) params.set('state', filters.state);
      if (filters.minRating > 0) params.set('minRating', filters.minRating.toString());

      const res = await fetch(`/api/experts/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExperts(data.experts || []);
        setError(false);
      } else {
        setError(true);
        setExperts([]);
      }
    } catch {
      setError(true);
      setExperts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Users size={24} className="text-white/50" />
          <h1 className="text-2xl font-bold text-earth-cream">Find an Expert</h1>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <p className="text-sm text-white/70">Browse experts or ask a question directly.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={MessageSquare}
            href="/marketplace/qa"
          >
            Ask a Question
          </Button>
        </div>

        <div className="mb-6">
          <ExpertSearchFilters filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-rust">Something went wrong loading experts.</p>
            <Button variant="ghost" onClick={fetchExperts} className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
              Try again
            </Button>
          </div>
        ) : experts.length === 0 ? (
          <EmptyState
            icon={Users}
            description="No experts found matching your criteria"
            className="py-12 [&_p]:text-white/50 [&_svg]:text-white/20"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experts.map(expert => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
