'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ShoppingTrip {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'completed';
  created_at: string;
  completed_at: string | null;
  total_items: number;
  purchased_items: number;
  total_estimate: number;
  spent_estimate: number;
}

interface TripItem {
  id: string;
  trip_id: string;
  product_name: string;
  quantity: number;
  category: string | null;
  estimated_price: number | null;
  purchased: boolean;
  purchased_at: string | null;
  notes: string | null;
}

interface TripDetail {
  trip: ShoppingTrip;
  items: TripItem[];
}

export function useShoppingTrips(projectId: string | undefined) {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  };

  const fetchTrips = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips?project_id=${projectId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      setTrips(data.trips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTrip = useCallback(async (name: string) => {
    if (!projectId) return null;
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/shopping-trips', {
        method: 'POST',
        headers,
        body: JSON.stringify({ project_id: projectId, name }),
      });
      if (!res.ok) throw new Error('Failed to create trip');
      const data = await res.json();
      await fetchTrips();
      return data.trip;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [projectId, fetchTrips]);

  const fetchTripDetail = useCallback(async (tripId: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trip');
      const data = await res.json();
      setActiveTrip(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleItem = useCallback(async (tripId: string, itemId: string, purchased: boolean) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}/items/${itemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ purchased }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      const data = await res.json();

      // Optimistic update for active trip
      if (activeTrip && activeTrip.trip.id === tripId) {
        setActiveTrip(prev => {
          if (!prev) return prev;
          const updatedItems = prev.items.map(i =>
            i.id === itemId ? { ...i, purchased, purchased_at: purchased ? new Date().toISOString() : null } : i
          );
          return {
            trip: data.trip_completed ? { ...prev.trip, status: 'completed' as const, completed_at: new Date().toISOString() } : prev.trip,
            items: updatedItems,
          };
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [activeTrip]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete trip');
      await fetchTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchTrips]);

  return {
    trips, activeTrip, loading, error,
    fetchTrips, createTrip, fetchTripDetail, toggleItem, deleteTrip,
    setActiveTrip,
  };
}
