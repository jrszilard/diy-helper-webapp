'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
import {
  ShoppingCart,
  DollarSign,
  Search,
  MapPin,
  TrendingDown,
  ExternalLink,
  Check,
  Trash2,
  Edit3,
  Download,
  X,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import MaterialsExport from './MaterialsExport';
import { ShoppingSearchSkeleton } from './SkeletonLoader';

interface ShoppingItem {
  id: string;
  project_id: string;
  product_name: string;
  quantity: number;
  price: number | null;
  category: string;
  required: boolean;
  purchased?: boolean;
  notes?: string;
  created_at: string;
}

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

interface ShoppingProject {
  id: string;
  name: string;
  description?: string;
  isGuest?: boolean;
}

interface ShoppingListViewProps {
  project: ShoppingProject | null;
  isMobile?: boolean;
}

export default function ShoppingListView({ project, isMobile = false }: ShoppingListViewProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, SearchResultWithMeta>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Error state for store search (per-item)
  const [searchError, setSearchError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (project) loadItems();
  }, [project]);

  const isGuestProject = project?.isGuest === true;

  const loadItems = async () => {
    if (!project) return;
    if (isGuestProject) {
      // Load from localStorage for guest projects
      const guestProject = guestStorage.getProject(project.id);
      if (guestProject) {
        const formattedItems: ShoppingItem[] = guestProject.materials.map(m => ({
          id: m.id,
          project_id: project.id,
          product_name: m.product_name,
          quantity: m.quantity,
          price: m.price,
          category: m.category,
          required: m.required,
          purchased: m.purchased,
          notes: m.notes,
          created_at: guestProject.createdAt
        }));
        setItems(formattedItems);
      }
    } else {
      // Load from Supabase for authenticated users
      const { data } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

      if (data) setItems(data);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Toggle purchased status
  const togglePurchased = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newPurchased = !item.purchased;

    // Optimistic update
    setItems(items.map(i =>
      i.id === itemId ? { ...i, purchased: newPurchased } : i
    ));

    if (isGuestProject) {
      // Update in localStorage for guest projects
      guestStorage.togglePurchased(project.id, itemId);
    } else {
      // Update in database for authenticated users
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ purchased: newPurchased })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating purchased status:', error);
        // Revert on error
        setItems(items.map(i =>
          i.id === itemId ? { ...i, purchased: item.purchased } : i
        ));
      }
    }
  };

  // Update item quantity
  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const oldItem = items.find(i => i.id === itemId);
    if (!oldItem) return;

    // Optimistic update
    setItems(items.map(i =>
      i.id === itemId ? { ...i, quantity: newQuantity } : i
    ));
    setEditingItem(null);

    if (isGuestProject) {
      // Update in localStorage for guest projects
      guestStorage.updateMaterial(project.id, itemId, { quantity: newQuantity });
    } else {
      // Update in database for authenticated users
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating quantity:', error);
        // Revert on error
        setItems(items.map(i =>
          i.id === itemId ? { ...i, quantity: oldItem.quantity } : i
        ));
      }
    }
  };

  // Delete item
  const deleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (!confirm(`Remove "${item.product_name}" from the list?`)) return;

    // Optimistic update
    setItems(items.filter(i => i.id !== itemId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });

    if (isGuestProject) {
      // Delete from localStorage for guest projects
      guestStorage.deleteMaterial(project.id, itemId);
    } else {
      // Delete from database for authenticated users
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting item:', error);
        // Revert on error
        loadItems();
      }
    }
  };

  const handleSearchStores = async () => {
    if (selectedItems.size === 0 || !location.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setItemErrors({});
    const results: Record<string, SearchResultWithMeta> = {};
    const errors: Record<string, string> = {};

    try {
      const itemsArray = Array.from(selectedItems);

      for (let i = 0; i < itemsArray.length; i++) {
        const itemId = itemsArray[i];
        const item = items.find(it => it.id === itemId);

        if (!item) {
          continue;
        }

        try {
          const requestBody = {
            materialName: item.product_name,
            location: location,
            quantity: item.quantity,
            validatePricing: true
          };

          const response = await fetch('/api/search-stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
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

        // Short delay between items (server rate limiting handles protection)
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
  };

  if (!project) {
    return (
      <div className="p-8 text-center text-[#A89880]">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-[#7D6B5D]">Select a project to view shopping list</p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const purchasedTotal = items
    .filter(item => item.purchased)
    .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const remainingTotal = total - purchasedTotal;
  const selectedTotal = items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const purchasedCount = items.filter(item => item.purchased).length;

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Export Modal */}
      {showExportModal && (
        <MaterialsExport
          projectName={project.name}
          materials={items}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Only show project header on desktop - mobile has header in overlay */}
      {!isMobile && (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-[#3E2723]">{project.name}</h2>
                {isGuestProject && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#F5F0E6] text-[#7D6B5D]">
                    <User className="w-3 h-3" />
                    Local Project
                  </span>
                )}
              </div>
              <p className="text-[#7D6B5D] text-sm">{project.description}</p>
              {isGuestProject && (
                <p className="text-xs text-[#A89880] mt-1">
                  Sign in to sync this project across devices
                </p>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-[#5D7B93] hover:bg-[#E8F0F5] rounded-lg transition"
                title="Export shopping list"
                aria-label="Export shopping list"
              >
                <Download className="w-5 h-5" />
                <span className="hidden lg:inline">Export</span>
              </button>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={`text-center ${isMobile ? 'py-16' : 'py-12'}`}>
          <ShoppingCart className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} mx-auto mb-3 opacity-50 text-[#D4C8B8]`} />
          <p className={`text-[#7D6B5D] ${isMobile ? 'text-lg' : ''}`}>No items yet</p>
          <p className={`${isMobile ? 'text-base' : 'text-sm'} mt-1 text-[#A89880]`}>Products will appear here automatically</p>
        </div>
      ) : (
        <div>
          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#7D6B5D]">
                  {purchasedCount} of {items.length} items purchased
                </span>
                <span className="text-[#4A7C59] font-medium">
                  {Math.round((purchasedCount / items.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-[#E8DFD0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4A7C59] rounded-full transition-all duration-300"
                  style={{ width: `${(purchasedCount / items.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className={`mb-4 ${isMobile ? 'space-y-3' : 'flex gap-2'}`}>
            <button
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#5D7B93] text-white rounded-xl hover:bg-[#4A6275] active:bg-[#3D5160] transition ${isMobile ? 'w-full text-base' : ''}`}
            >
              <Search className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
              {showSearchPanel ? 'Hide Search' : 'Search Local Stores'}
            </button>

            {/* Mobile export button */}
            {isMobile && (
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#E8F0F5] text-[#5D7B93] rounded-xl hover:bg-[#D4E4F0] transition w-full"
              >
                <Download className="w-5 h-5" />
                Export List
              </button>
            )}

            {selectedItems.size > 0 && (
              <div className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#E8F0F5] text-[#5D7B93] rounded-xl font-medium ${isMobile ? 'w-full' : ''}`}>
                {selectedItems.size} item(s) selected
              </div>
            )}
          </div>

          {showSearchPanel && (
            <div className="mb-6 p-4 bg-[#F5F0E6] border border-[#D4C8B8] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#C67B5C]" />
                <h3 className="font-semibold text-[#3E2723]">Search Local Stores</h3>
              </div>

              <div className={`${isMobile ? 'space-y-3' : 'flex gap-2'} mb-3`}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location (e.g., Portsmouth, NH)"
                  className={`flex-1 px-4 py-3 border border-[#D4C8B8] rounded-xl focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] bg-white placeholder-[#A89880] ${isMobile ? 'w-full text-base' : ''}`}
                />
                <button
                  onClick={handleSearchStores}
                  disabled={selectedItems.size === 0 || !location.trim() || isSearching}
                  className={`px-6 py-3 bg-[#C67B5C] text-white rounded-xl hover:bg-[#A65D3F] active:bg-[#8B4D33] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed transition ${isMobile ? 'w-full text-base font-medium' : ''}`}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              <p className={`${isMobile ? 'text-base' : 'text-sm'} text-[#7D6B5D]`}>
                Select items below with checkboxes, then search to find products at nearby stores
              </p>

              {/* Search error banner with retry */}
              {searchError && (
                <div className="mt-3 p-3 bg-[#FADDD0] border border-[#E8A990] rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#B8593B] flex-shrink-0" />
                  <p className="text-sm text-[#B8593B] flex-1">{searchError}</p>
                  <button
                    onClick={() => {
                      setSearchError(null);
                      handleSearchStores();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#B8593B] text-white rounded-lg hover:bg-[#9A4830] text-sm font-medium flex-shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              )}

              {/* Skeleton loader during search */}
              {isSearching && <ShoppingSearchSkeleton />}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-[#3E2723] mb-3 uppercase tracking-wide`}>
                  {category}
                </h3>

                <div className="bg-white rounded-xl border border-[#D4C8B8] divide-y divide-[#E8DFD0]">
                  {categoryItems.map((item) => (
                    <div key={item.id}>
                      <div
                        className={`${isMobile ? 'p-4' : 'p-4'} ${
                          item.purchased ? 'bg-gray-50' : ''
                        } ${isMobile ? 'active:bg-[#F5F0E6]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Purchase checkbox */}
                          <button
                            onClick={() => togglePurchased(item.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition flex-shrink-0 ${
                              item.purchased
                                ? 'bg-[#4A7C59] border-[#4A7C59] text-white'
                                : 'border-[#D4C8B8] hover:border-[#4A7C59]'
                            }`}
                            title={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
                            aria-label={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
                          >
                            {item.purchased && <Check className="w-4 h-4" />}
                          </button>

                          {/* Selection checkbox for store search */}
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-[#C67B5C] rounded focus:ring-2 focus:ring-[#C67B5C] flex-shrink-0 accent-[#C67B5C]`}
                            title="Select for store search"
                            aria-label="Select item for store search"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${isMobile ? 'text-base' : ''} ${
                                item.purchased ? 'line-through text-[#A89880]' : 'text-[#3E2723]'
                              }`}>
                                {item.product_name}
                              </span>
                              {item.required && !item.purchased && (
                                <span className="text-xs bg-[#FADDD0] text-[#B8593B] px-2 py-0.5 rounded font-medium">
                                  Required
                                </span>
                              )}
                            </div>

                            {/* Editable quantity */}
                            {editingItem === item.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="number"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                  min={1}
                                  className="w-16 px-2 py-1 border border-[#D4C8B8] rounded text-sm text-[#3E2723]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateItemQuantity(item.id, editQuantity);
                                    } else if (e.key === 'Escape') {
                                      setEditingItem(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => updateItemQuantity(item.id, editQuantity)}
                                  className="text-[#4A7C59] text-sm font-medium hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingItem(null)}
                                  className="text-[#7D6B5D] text-sm hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingItem(item.id);
                                  setEditQuantity(item.quantity);
                                }}
                                className={`${isMobile ? 'text-base' : 'text-sm'} text-[#7D6B5D] hover:text-[#5D7B93] mt-1 flex items-center gap-1`}
                              >
                                Qty: {item.quantity}
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {item.price && item.price > 0 && (
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold ${isMobile ? 'text-lg' : ''} ${
                                item.purchased ? 'text-[#A89880]' : 'text-[#4A7C59]'
                              }`}>
                                ${item.price.toFixed(2)}
                              </div>
                              {item.quantity > 1 && (
                                <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-[#7D6B5D]`}>
                                  ${(item.price * item.quantity).toFixed(2)} total
                                </div>
                              )}
                            </div>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-[#D4C8B8] hover:text-[#B8593B] transition rounded-lg hover:bg-[#FADDD0]"
                            title="Remove item"
                            aria-label="Remove item from list"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Per-item search error */}
                      {itemErrors[item.id] && (
                        <div className="px-4 py-2 bg-[#FADDD0] border-t border-[#E8A990]">
                          <div className="flex items-center gap-2 text-sm text-[#B8593B]">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{itemErrors[item.id]}</span>
                          </div>
                        </div>
                      )}

                      {searchResults[item.id] && searchResults[item.id].results.length > 0 && (
                        <div className="px-4 pb-4 bg-[#F5F0E6]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-[#4A7C59]" />
                              <span className="text-sm font-semibold text-[#3E2723]">
                                Found at {searchResults[item.id].results.length} stores:
                              </span>
                            </div>
                            {searchResults[item.id].priceRange && searchResults[item.id].priceRange!.min && (
                              <span className="text-xs text-[#7D6B5D]">
                                Market range: ${searchResults[item.id].priceRange!.min!.toFixed(2)} - ${searchResults[item.id].priceRange!.max!.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {searchResults[item.id].results.map((result, idx) => {
                              const isOutOfStock = result.availability === 'out-of-stock';
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg border border-[#D4C8B8] bg-white ${isOutOfStock ? 'opacity-60' : ''}`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#3E2723]">{result.store}</span>
                                        {result.confidence && (
                                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                            result.confidence === 'high' ? 'bg-green-50 text-green-600' :
                                            result.confidence === 'medium' ? 'bg-amber-50 text-amber-600' :
                                            'bg-gray-100 text-gray-500'
                                          }`}>
                                            {result.confidence === 'high' ? 'Verified' : result.confidence === 'medium' ? 'Est.' : 'Check'}
                                          </span>
                                        )}
                                      </div>
                                      {result.sku && (
                                        <div className="text-xs text-[#9B8B7D]">SKU: {result.sku}</div>
                                      )}
                                      <div className="text-xs text-[#7D6B5D]">{result.distance}</div>
                                    </div>

                                    <div className="text-right">
                                      {result.price > 0 ? (
                                        <>
                                          <div className={`text-lg font-bold ${isOutOfStock ? 'text-gray-400 line-through' : 'text-[#4A7C59]'}`}>
                                            ${result.price.toFixed(2)}
                                          </div>
                                          {result.originalPrice && result.originalPrice > result.price && (
                                            <div className="text-xs text-[#A89880] line-through">
                                              ${result.originalPrice.toFixed(2)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-sm font-semibold text-[#5D7B93]">
                                          See website
                                        </div>
                                      )}
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                          result.availability === 'in-stock' ? 'bg-[#E8F3EC] text-[#4A7C59]' :
                                          result.availability === 'limited' ? 'bg-[#FDF3ED] text-[#C67B5C]' :
                                          result.availability === 'out-of-stock' ? 'bg-[#FADDD0] text-[#B8593B]' :
                                          'bg-[#E8F0F5] text-[#5D7B93]'
                                        }`}>
                                          {result.availability.replace(/-/g, ' ').toUpperCase()}
                                        </span>
                                      </div>
                                      {result.storeStock && (
                                        <div className="text-xs text-[#7D6B5D] mt-0.5">{result.storeStock}</div>
                                      )}
                                    </div>
                                  </div>

                                  {result.priceWarning && (
                                    <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2 flex items-start gap-1">
                                      <span className="flex-shrink-0">!</span>
                                      <span>{result.priceWarning}</span>
                                    </div>
                                  )}

                                  <div className="text-xs text-[#5C4D42] mb-2">
                                    <div className="text-[#5C4D42]">{result.address}</div>
                                    <div className="text-[#5C4D42]">{result.phone}</div>
                                    {result.notes && !result.priceWarning && (
                                      <div className="text-[#7D6B5D] italic mt-1">{result.notes}</div>
                                    )}
                                  </div>

                                  <a
                                    href={result.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#5D7B93] hover:text-[#4A6275] font-medium"
                                  >
                                    {isOutOfStock ? 'Check for Updates' : 'View Product'} <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 space-y-3 ${isMobile ? 'pb-4' : ''}`}>
            {selectedItems.size > 0 && selectedTotal > 0 && (
              <div className={`bg-[#E8F0F5] border border-[#B8D0E4] rounded-xl ${isMobile ? 'p-4' : 'p-4'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <ShoppingCart className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#5D7B93]`} />
                  <span className={`font-bold text-[#3E2723] ${isMobile ? 'text-base' : ''}`}>Selected Total:</span>
                </div>
                <span className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-[#5D7B93]`}>${selectedTotal.toFixed(2)}</span>
              </div>
            )}

            {purchasedCount > 0 && purchasedTotal > 0 && (
              <div className={`bg-[#F5F0E6] border border-[#D4C8B8] rounded-xl ${isMobile ? 'p-4' : 'p-4'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Check className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#7D6B5D]`} />
                  <span className={`font-medium text-[#7D6B5D] ${isMobile ? 'text-base' : ''}`}>Purchased:</span>
                </div>
                <span className={`${isMobile ? 'text-xl' : 'text-xl'} font-bold text-[#7D6B5D] line-through`}>${purchasedTotal.toFixed(2)}</span>
              </div>
            )}

            {remainingTotal > 0 && (
              <div className={`bg-[#E8F3EC] border border-[#B8D8C4] rounded-xl ${isMobile ? 'p-4' : 'p-4'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <DollarSign className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#4A7C59]`} />
                  <span className={`font-bold text-[#3E2723] ${isMobile ? 'text-base' : ''}`}>
                    {purchasedCount > 0 ? 'Remaining:' : 'Estimated Total:'}
                  </span>
                </div>
                <span className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-[#4A7C59]`}>${remainingTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
