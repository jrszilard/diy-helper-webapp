'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExpertProfile } from '@/lib/marketplace/types';

const CACHE_KEY = 'expert-status';

interface ExpertStatusCache {
  isExpert: boolean;
  expert: ExpertProfile | null;
  openQueueCount: number;
}

export function useExpertStatus() {
  const [isExpert, setIsExpert] = useState(false);
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [openQueueCount, setOpenQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const applyCache = (cached: ExpertStatusCache) => {
    setIsExpert(cached.isExpert);
    setExpert(cached.expert);
    setOpenQueueCount(cached.openQueueCount);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        setIsExpert(false);
        setExpert(null);
        setOpenQueueCount(0);
        setLoading(false);
        sessionStorage.removeItem(CACHE_KEY);
        return;
      }

      const res = await fetch('/api/experts/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setIsExpert(false);
        setExpert(null);
        setOpenQueueCount(0);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const result: ExpertStatusCache = {
        isExpert: !!data.expert,
        expert: data.expert ?? null,
        openQueueCount: data.openQueueCount ?? 0,
      };

      applyCache(result);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try sessionStorage cache first for instant rendering
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: ExpertStatusCache = JSON.parse(cached);
        applyCache(parsed);
        setLoading(false);
      }
    } catch {
      // ignore parse errors
    }

    fetchStatus();
  }, [fetchStatus]);

  return { isExpert, expert, openQueueCount, loading, refresh: fetchStatus };
}
