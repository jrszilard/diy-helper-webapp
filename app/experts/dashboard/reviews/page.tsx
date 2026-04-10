'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ReviewCard from '@/components/reviews/ReviewCard';
import { ClipboardCheck } from 'lucide-react';

interface ReviewIssue {
  item?: number;
  severity?: string;
  detail?: string;
}

interface ReviewItem {
  id: string;
  category: string | null;
  userQuestion: string;
  draftResponse: string;
  verdict: string;
  confidence: number | null;
  issues: ReviewIssue[];
  safetyKeywords: string[];
  createdAt: string;
}

export default function ExpertReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const getToken = async () => {
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchItems = useCallback(async (cursor?: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const url = new URL('/api/experts/dashboard/reviews', window.location.origin);
      url.searchParams.set('limit', '20');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setItems(prev => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCorrection = async (id: string, sectionType: string, correctionText: string) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/experts/dashboard/reviews/${id}/correction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sectionType, correctionText }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to submit');
    }
  };

  const handleDismiss = async (id: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch(`/api/experts/dashboard/reviews/${id}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review AI Responses</h1>
        <p className="text-sm text-earth-brown mt-1">
          Borderline AI responses in your specialty areas. Submit corrections or confirm they look good.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-earth-brown">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-earth-brown-light" />
          <p className="text-lg font-medium">All caught up</p>
          <p className="text-sm text-earth-brown-light mt-1">
            No responses need review in your specialties right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ReviewCard
              key={item.id}
              item={item}
              onCorrection={handleCorrection}
              onDismiss={handleDismiss}
            />
          ))}

          {nextCursor && (
            <button
              onClick={() => fetchItems(nextCursor)}
              className="w-full py-3 text-sm text-slate-blue hover:text-slate-blue-dark border border-earth-sand rounded-lg hover:bg-earth-tan/30 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
