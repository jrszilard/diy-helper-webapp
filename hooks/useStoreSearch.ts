'use client';

import { useState, useCallback } from 'react';

interface StoreResult {
  store: string;
  retailer: string;
  price: number;
  originalPrice?: number;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only' | 'check-online';
  distance: string;
  address: string;
  phone: string;
  link: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  priceWarning?: string;
  sku?: string;
  storeStock?: string;
  productName?: string;
}

interface SearchResultWithMeta {
  results: StoreResult[];
  priceRange?: {
    min: number | null;
    max: number | null;
    avg: number | null;
    sources: number;
  } | null;
}

interface ShoppingItem {
  id: string;
  product_name: string;
  quantity: number;
}

export function useStoreSearch() {
  const [searchResults, setSearchResults] = useState<Record<string, SearchResultWithMeta>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const searchStores = useCallback(async (
    selectedItemIds: Set<string>,
    items: ShoppingItem[],
    location: string
  ) => {
    if (selectedItemIds.size === 0 || !location.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setItemErrors({});
    const results: Record<string, SearchResultWithMeta> = {};
    const errors: Record<string, string> = {};

    try {
      const itemsArray = Array.from(selectedItemIds);

      for (let i = 0; i < itemsArray.length; i++) {
        const itemId = itemsArray[i];
        const item = items.find(it => it.id === itemId);
        if (!item) continue;

        try {
          const response = await fetch('/api/search-stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              materialName: item.product_name,
              location,
              quantity: item.quantity,
              validatePricing: true
            })
          });

          if (!response.ok) {
            errors[itemId] = response.status === 429
              ? 'Rate limited. Try again shortly.'
              : `Search failed (${response.status})`;
            continue;
          }

          const data = await response.json();
          results[itemId] = {
            results: data.results || [],
            priceRange: data.priceRange || null
          };
        } catch (itemError: unknown) {
          const msg = itemError instanceof Error ? itemError.message : 'Unknown error';
          console.error(`Error searching stores for "${item.product_name}":`, msg);
          errors[itemId] = 'Search failed. Try again.';
        }

        if (i < itemsArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setSearchResults(results);
      setItemErrors(errors);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error searching stores:', message);
      setSearchError('Error searching stores: ' + message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults({});
    setItemErrors({});
    setSearchError(null);
  }, []);

  return {
    searchResults,
    isSearching,
    searchError,
    setSearchError,
    itemErrors,
    searchStores,
    clearResults,
  };
}

export type { StoreResult, SearchResultWithMeta };
