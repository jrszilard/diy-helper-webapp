'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExpertProfile } from '@/lib/marketplace/types';

export const EXPERT_STATUS_CACHE_KEY = 'expert-status';
// Skip a background refetch if the cached entry is fresher than this. Three
// instances of the hook (AppSidebar + AppHeader + settings page) used to fire
// /api/experts/me back-to-back on every dashboard mount.
const CACHE_TTL_MS = 60_000;

interface ExpertStatusCache {
  isExpert: boolean;
  expert: ExpertProfile | null;
  openQueueCount: number;
  cachedAt?: number;
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
        sessionStorage.removeItem(EXPERT_STATUS_CACHE_KEY);
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
        cachedAt: Date.now(),
      };

      applyCache(result);
      sessionStorage.setItem(EXPERT_STATUS_CACHE_KEY, JSON.stringify(result));
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try sessionStorage cache first for instant rendering
    let cacheIsFresh = false;
    try {
      const cached = sessionStorage.getItem(EXPERT_STATUS_CACHE_KEY);
      if (cached) {
        const parsed: ExpertStatusCache = JSON.parse(cached);
        applyCache(parsed);
        setLoading(false);
        if (parsed.cachedAt && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          cacheIsFresh = true;
        }
      }
    } catch {
      // ignore parse errors
    }

    // Only refetch in background if cache is stale or missing.
    if (!cacheIsFresh) {
      fetchStatus();
    }
  }, [fetchStatus]);

  return { isExpert, expert, openQueueCount, loading, refresh: fetchStatus };
}
