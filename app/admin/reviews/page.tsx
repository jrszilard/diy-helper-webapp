'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminCorrectionCard from '@/components/reviews/AdminCorrectionCard';
import { ShieldCheck } from 'lucide-react';

interface Reporter {
  role: 'expert' | 'diy_user';
  name: string;
  specialties: string[];
}

interface CorrectionItem {
  id: string;
  source: string;
  category: string | null;
  userQuestion: string;
  aiResponse: string;
  correctionText: string | null;
  flagType: string | null;
  severity: string | null;
  reporter: Reporter;
  createdAt: string;
}

interface Counts {
  total: number;
  userFlags: number;
  expertCorrections: number;
  expertReviews: number;
}

export default function AdminReviewPage() {
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, userFlags: 0, expertCorrections: 0, expertReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const url = new URL('/api/admin/reviews', window.location.origin);
      if (sourceFilter) url.searchParams.set('source', sourceFilter);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError('Not authorized — admin access required');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setCounts(data.counts);
      }
    } catch {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [sourceFilter, categoryFilter]);

  const handleApprove = async (id: string, data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/admin/reviews/${id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch(`/api/admin/reviews/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <div className="min-h-screen bg-earth-cream">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-terracotta" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Review Queue</h1>
            <p className="text-sm text-earth-brown">
              {counts.total} pending &middot; {counts.userFlags} flags &middot; {counts.expertCorrections + counts.expertReviews} expert corrections
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-sm border border-earth-sand rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
          >
            <option value="">All sources</option>
            <option value="user_flag">User flags</option>
            <option value="expert_correction">Expert corrections</option>
            <option value="expert_review">Expert reviews</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-sm border border-earth-sand rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
          >
            <option value="">All categories</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="structural">Structural</option>
            <option value="roofing">Roofing</option>
            <option value="gas">Gas</option>
            <option value="hazmat">Hazmat</option>
          </select>
        </div>

        {error && (
          <div className="bg-rust/10 text-rust rounded-lg p-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-earth-brown">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-earth-brown-light" />
            <p className="text-lg font-medium">Queue is clear</p>
            <p className="text-sm text-earth-brown-light mt-1">No pending corrections to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <AdminCorrectionCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
