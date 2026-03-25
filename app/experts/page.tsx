'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
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
    <div className="min-h-screen bg-earth-cream">
      <header className="bg-surface border-b border-earth-sand shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-terracotta to-terracotta-dark p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">DIY Helper</span>
          </Link>
          <Link
            href="/experts/register"
            className="text-sm font-medium text-slate-blue hover:text-slate-blue-dark transition-colors"
          >
            Become an Expert
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Users size={24} className="text-slate-blue" />
          <h1 className="text-2xl font-bold text-foreground">Find an Expert</h1>
        </div>

        <div className="mb-6">
          <ExpertSearchFilters filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-terracotta" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-rust mb-3">Something went wrong loading experts.</p>
            <button onClick={fetchExperts} className="text-sm font-medium text-slate-blue hover:underline">
              Try again
            </button>
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-earth-sand mb-3" />
            <p className="text-sm text-earth-brown">No experts found matching your criteria</p>
          </div>
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
