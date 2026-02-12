'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { useStoreSearch } from '@/hooks/useStoreSearch';
import type { StoreResult } from '@/hooks/useStoreSearch';

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
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [showExportModal, setShowExportModal] = useState(false);

  const storeSearch = useStoreSearch();
  const [priceSyncNotification, setPriceSyncNotification] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const syncedPriceItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (project) {
      loadItems();
      storeSearch.clearResults();
      syncedPriceItemsRef.current = new Set();
    }
  }, [project]);

  const isGuestProject = project?.isGuest === true;

  const loadItems = async () => {
    if (!project) return;
    if (isGuestProject) {
      const guestProject = guestStorage.getProject(project.id);
      if (guestProject) {
        setItems(guestProject.materials.map(m => ({
          id: m.id, project_id: project.id, product_name: m.product_name,
          quantity: m.quantity, price: m.price, category: m.category,
          required: m.required, purchased: m.purchased, notes: m.notes,
          created_at: guestProject.createdAt
        })));
      }
    } else {
      const { data } = await supabase
        .from('shopping_list_items').select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      if (data) setItems(data);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) newSelected.delete(itemId);
    else newSelected.add(itemId);
    setSelectedItems(newSelected);
  };

  const togglePurchased = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newPurchased = !item.purchased;
    setItems(items.map(i => i.id === itemId ? { ...i, purchased: newPurchased } : i));

    if (isGuestProject) {
      guestStorage.togglePurchased(project!.id, itemId);
    } else {
      const { error } = await supabase
        .from('shopping_list_items').update({ purchased: newPurchased }).eq('id', itemId);
      if (error) {
        console.error('Error updating purchased status:', error);
        setItems(items.map(i => i.id === itemId ? { ...i, purchased: item.purchased } : i));
      }
    }
  };

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const oldItem = items.find(i => i.id === itemId);
    if (!oldItem) return;
    setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
    setEditingItem(null);

    if (isGuestProject) {
      guestStorage.updateMaterial(project!.id, itemId, { quantity: newQuantity });
    } else {
      const { error } = await supabase
        .from('shopping_list_items').update({ quantity: newQuantity }).eq('id', itemId);
      if (error) {
        console.error('Error updating quantity:', error);
        setItems(items.map(i => i.id === itemId ? { ...i, quantity: oldItem.quantity } : i));
      }
    }
  };

  const updateItemPrice = useCallback(async (itemId: string, newPrice: number) => {
    const roundedPrice = Math.round(newPrice * 100) / 100;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, price: roundedPrice } : i));
    if (isGuestProject) {
      guestStorage.updateMaterial(project!.id, itemId, { price: roundedPrice });
    } else {
      const { error } = await supabase.from('shopping_list_items').update({ price: roundedPrice }).eq('id', itemId);
      if (error) {
        console.error('Error updating price:', error);
        const oldItem = itemsRef.current.find(i => i.id === itemId);
        if (oldItem) setItems(prev => prev.map(i => i.id === itemId ? { ...i, price: oldItem.price } : i));
      }
    }
  }, [isGuestProject, project]);

  const deleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !confirm(`Remove "${item.product_name}" from the list?`)) return;
    setItems(items.filter(i => i.id !== itemId));
    setSelectedItems(prev => { const s = new Set(prev); s.delete(itemId); return s; });

    if (isGuestProject) {
      guestStorage.deleteMaterial(project!.id, itemId);
    } else {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId);
      if (error) { console.error('Error deleting item:', error); loadItems(); }
    }
  };

  const handleSearchStores = () => {
    syncedPriceItemsRef.current = new Set();
    storeSearch.searchStores(selectedItems, items, location);
  };

  // Auto-sync store search prices to shopping list
  useEffect(() => {
    const entries = Object.entries(storeSearch.searchResults);
    if (entries.length === 0) return;
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;

    const updatedNames: string[] = [];
    for (const [itemId, resultData] of entries) {
      if (syncedPriceItemsRef.current.has(itemId)) continue;
      const bestResult = resultData.results.find(
        r => r.price > 0 && (r.confidence === 'high' || r.confidence === 'medium')
      );
      if (!bestResult) continue;
      const item = currentItems.find(i => i.id === itemId);
      if (!item) continue;
      syncedPriceItemsRef.current.add(itemId);
      const roundedBest = Math.round(bestResult.price * 100) / 100;
      const currentPrice = item.price != null ? Math.round(item.price * 100) / 100 : null;
      // Skip auto-sync if price differs by >5x — likely a quantity mismatch
      // (e.g., store returns 250ft roll price but list has 25ft qty)
      if (currentPrice != null && currentPrice > 0) {
        const ratio = roundedBest / currentPrice;
        if (ratio > 5 || ratio < 0.2) continue;
      }
      if (currentPrice !== roundedBest) {
        updateItemPrice(itemId, bestResult.price);
        updatedNames.push(item.product_name);
      }
    }
    if (updatedNames.length > 0) {
      const msg = updatedNames.length === 1
        ? `Updated price for ${updatedNames[0]}`
        : `Updated prices for ${updatedNames.length} items`;
      setPriceSyncNotification(msg);
      setTimeout(() => setPriceSyncNotification(null), 4000);
    }
  }, [storeSearch.searchResults, updateItemPrice]);

  if (!project) {
    return (
      <div className="p-8 text-center text-[#A89880]">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-[#7D6B5D]">Select a project to view shopping list</p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const purchasedTotal = items.filter(i => i.purchased).reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const remainingTotal = total - purchasedTotal;
  const selectedTotal = items.filter(i => selectedItems.has(i.id)).reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const purchasedCount = items.filter(i => i.purchased).length;

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
      {showExportModal && (
        <MaterialsExport projectName={project.name} materials={items} onClose={() => setShowExportModal(false)} />
      )}

      {priceSyncNotification && (
        <div className="fixed top-20 right-4 bg-[#4A7C59] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm">
          <DollarSign className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium text-sm">{priceSyncNotification}</p>
          <button onClick={() => setPriceSyncNotification(null)}
            className="ml-2 hover:bg-[#2D5A3B] p-1 rounded flex-shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isMobile && (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-[#3E2723]">{project.name}</h2>
                {isGuestProject && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#F5F0E6] text-[#7D6B5D]">
                    <User className="w-3 h-3" /> Local Project
                  </span>
                )}
              </div>
              <p className="text-[#7D6B5D] text-sm">{project.description}</p>
              {isGuestProject && <p className="text-xs text-[#A89880] mt-1">Sign in to sync this project across devices</p>}
            </div>
            {items.length > 0 && (
              <button onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-[#5D7B93] hover:bg-[#E8F0F5] rounded-lg transition"
                title="Export shopping list" aria-label="Export shopping list">
                <Download className="w-5 h-5" /><span className="hidden lg:inline">Export</span>
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
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#7D6B5D]">{purchasedCount} of {items.length} items purchased</span>
              <span className="text-[#4A7C59] font-medium">{Math.round((purchasedCount / items.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-[#E8DFD0] rounded-full overflow-hidden">
              <div className="h-full bg-[#4A7C59] rounded-full transition-all duration-300"
                style={{ width: `${(purchasedCount / items.length) * 100}%` }} />
            </div>
          </div>

          <div className={`mb-4 ${isMobile ? 'space-y-3' : 'flex gap-2'}`}>
            <button onClick={() => setShowSearchPanel(!showSearchPanel)}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#5D7B93] text-white rounded-xl hover:bg-[#4A6275] active:bg-[#3D5160] transition ${isMobile ? 'w-full text-base' : ''}`}>
              <Search className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
              {showSearchPanel ? 'Hide Search' : 'Search Local Stores'}
            </button>
            {isMobile && (
              <button onClick={() => setShowExportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#E8F0F5] text-[#5D7B93] rounded-xl hover:bg-[#D4E4F0] transition w-full">
                <Download className="w-5 h-5" /> Export List
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
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location (e.g., Portsmouth, NH)"
                  className={`flex-1 px-4 py-3 border border-[#D4C8B8] rounded-xl focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] bg-white placeholder-[#A89880] ${isMobile ? 'w-full text-base' : ''}`} />
                <button onClick={handleSearchStores}
                  disabled={selectedItems.size === 0 || !location.trim() || storeSearch.isSearching}
                  className={`px-6 py-3 bg-[#C67B5C] text-white rounded-xl hover:bg-[#A65D3F] active:bg-[#8B4D33] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed transition ${isMobile ? 'w-full text-base font-medium' : ''}`}>
                  {storeSearch.isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              <p className={`${isMobile ? 'text-base' : 'text-sm'} text-[#7D6B5D]`}>
                Select items below with checkboxes, then search to find products at nearby stores
              </p>
              {storeSearch.searchError && (
                <div className="mt-3 p-3 bg-[#FADDD0] border border-[#E8A990] rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#B8593B] flex-shrink-0" />
                  <p className="text-sm text-[#B8593B] flex-1">{storeSearch.searchError}</p>
                  <button onClick={() => { storeSearch.setSearchError(null); handleSearchStores(); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#B8593B] text-white rounded-lg hover:bg-[#9A4830] text-sm font-medium flex-shrink-0">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              )}
              {storeSearch.isSearching && <ShoppingSearchSkeleton />}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-[#3E2723] mb-3 uppercase tracking-wide`}>{category}</h3>
                <div className="bg-white rounded-xl border border-[#D4C8B8] divide-y divide-[#E8DFD0]">
                  {categoryItems.map((item) => (
                    <div key={item.id}>
                      <div className={`p-4 ${item.purchased ? 'bg-gray-50' : ''} ${isMobile ? 'active:bg-[#F5F0E6]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <button onClick={() => togglePurchased(item.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition flex-shrink-0 ${
                              item.purchased ? 'bg-[#4A7C59] border-[#4A7C59] text-white' : 'border-[#D4C8B8] hover:border-[#4A7C59]'
                            }`} title={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
                            aria-label={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}>
                            {item.purchased && <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition flex-shrink-0 ${
                              selectedItems.has(item.id)
                                ? 'bg-[#C67B5C] text-white'
                                : 'border-2 border-[#D4C8B8] text-[#D4C8B8] hover:border-[#C67B5C] hover:text-[#C67B5C]'
                            }`}
                            title={selectedItems.has(item.id) ? 'Deselect from store search' : 'Select for store search'}
                            aria-label={selectedItems.has(item.id) ? 'Deselect from store search' : 'Select for store search'}>
                            <Search className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${isMobile ? 'text-base' : ''} ${item.purchased ? 'line-through text-[#A89880]' : 'text-[#3E2723]'}`}>
                                {item.product_name}
                              </span>
                              {item.required && !item.purchased && (
                                <span className="text-xs bg-[#FADDD0] text-[#B8593B] px-2 py-0.5 rounded font-medium">Required</span>
                              )}
                            </div>
                            {editingItem === item.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                  min={1} className="w-16 px-2 py-1 border border-[#D4C8B8] rounded text-sm text-[#3E2723]" autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') updateItemQuantity(item.id, editQuantity); else if (e.key === 'Escape') setEditingItem(null); }} />
                                <button onClick={() => updateItemQuantity(item.id, editQuantity)} className="text-[#4A7C59] text-sm font-medium hover:underline">Save</button>
                                <button onClick={() => setEditingItem(null)} className="text-[#7D6B5D] text-sm hover:underline">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingItem(item.id); setEditQuantity(item.quantity); }}
                                className={`${isMobile ? 'text-base' : 'text-sm'} text-[#7D6B5D] hover:text-[#5D7B93] mt-1 flex items-center gap-1`}>
                                Qty: {item.quantity} <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {item.price && item.price > 0 && (
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold ${isMobile ? 'text-lg' : ''} ${item.purchased ? 'text-[#A89880]' : 'text-[#4A7C59]'}`}>
                                ${item.price.toFixed(2)}
                              </div>
                              {item.quantity > 1 && (
                                <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-[#7D6B5D]`}>${(item.price * item.quantity).toFixed(2)} total</div>
                              )}
                            </div>
                          )}
                          <button onClick={() => deleteItem(item.id)}
                            className="p-2 text-[#D4C8B8] hover:text-[#B8593B] transition rounded-lg hover:bg-[#FADDD0]"
                            title="Remove item" aria-label="Remove item from list">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Per-item search error */}
                      {storeSearch.itemErrors[item.id] && (
                        <div className="px-4 py-2 bg-[#FADDD0] border-t border-[#E8A990]">
                          <div className="flex items-center gap-2 text-sm text-[#B8593B]">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{storeSearch.itemErrors[item.id]}</span>
                          </div>
                        </div>
                      )}

                      {storeSearch.searchResults[item.id] && storeSearch.searchResults[item.id].results.length > 0 && (
                        <StoreSearchResults
                          results={storeSearch.searchResults[item.id].results}
                          priceRange={storeSearch.searchResults[item.id].priceRange}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className={`mt-6 space-y-3 ${isMobile ? 'pb-4' : ''}`}>
            {selectedItems.size > 0 && selectedTotal > 0 && (
              <TotalBar icon={<ShoppingCart className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#5D7B93]`} />}
                label="Selected Total:" value={selectedTotal} color="blue" isMobile={isMobile} />
            )}
            {purchasedCount > 0 && purchasedTotal > 0 && (
              <TotalBar icon={<Check className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#7D6B5D]`} />}
                label="Purchased:" value={purchasedTotal} color="muted" isMobile={isMobile} strikethrough />
            )}
            {remainingTotal > 0 && (
              <TotalBar icon={<DollarSign className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#4A7C59]`} />}
                label={purchasedCount > 0 ? 'Remaining:' : 'Estimated Total:'} value={remainingTotal} color="green" isMobile={isMobile} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TotalBar({ icon, label, value, color, isMobile, strikethrough }: {
  icon: React.ReactNode; label: string; value: number; color: 'blue' | 'muted' | 'green'; isMobile?: boolean; strikethrough?: boolean;
}) {
  const bgColors = { blue: 'bg-[#E8F0F5] border-[#B8D0E4]', muted: 'bg-[#F5F0E6] border-[#D4C8B8]', green: 'bg-[#E8F3EC] border-[#B8D8C4]' };
  const textColors = { blue: 'text-[#5D7B93]', muted: 'text-[#7D6B5D]', green: 'text-[#4A7C59]' };
  return (
    <div className={`${bgColors[color]} border rounded-xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`font-bold text-[#3E2723] ${isMobile ? 'text-base' : ''}`}>{label}</span>
      </div>
      <span className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold ${textColors[color]} ${strikethrough ? 'line-through' : ''}`}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

function StoreSearchResults({ results, priceRange }: {
  results: StoreResult[];
  priceRange?: { min: number | null; max: number | null; avg: number | null; sources: number } | null;
}) {
  return (
    <div className="px-4 pb-4 bg-[#F5F0E6]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#4A7C59]" />
          <span className="text-sm font-semibold text-[#3E2723]">Found at {results.length} stores:</span>
        </div>
        {priceRange && priceRange.min && (
          <span className="text-xs text-[#7D6B5D]">
            Market range: ${priceRange.min.toFixed(2)} - ${priceRange.max!.toFixed(2)}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {results.map((result, idx) => {
          const isOutOfStock = result.availability === 'out-of-stock';
          return (
            <div key={idx} className={`p-3 rounded-lg border border-[#D4C8B8] bg-white ${isOutOfStock ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#3E2723]">{result.store}</span>
                    {result.confidence && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        result.confidence === 'high' ? 'bg-green-50 text-green-600' :
                        result.confidence === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {result.confidence === 'high' ? 'Verified' : result.confidence === 'medium' ? 'Est.' : 'Check'}
                      </span>
                    )}
                  </div>
                  {result.productName && (
                    <div className="text-xs text-[#5D7B93] font-medium truncate max-w-[200px]" title={result.productName}>
                      {result.productName}
                    </div>
                  )}
                  {result.sku && <div className="text-xs text-[#9B8B7D]">SKU: {result.sku}</div>}
                  <div className="text-xs text-[#7D6B5D]">{result.distance}</div>
                </div>
                <div className="text-right">
                  {result.price > 0 ? (
                    <>
                      <div className={`text-lg font-bold ${isOutOfStock ? 'text-gray-400 line-through' : 'text-[#4A7C59]'}`}>
                        ${result.price.toFixed(2)}
                      </div>
                      {result.originalPrice && result.originalPrice > result.price && (
                        <div className="text-xs text-[#A89880] line-through">${result.originalPrice.toFixed(2)}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm font-semibold text-[#5D7B93]">See website</div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      result.availability === 'in-stock' ? 'bg-[#E8F3EC] text-[#4A7C59]' :
                      result.availability === 'limited' ? 'bg-[#FDF3ED] text-[#C67B5C]' :
                      result.availability === 'out-of-stock' ? 'bg-[#FADDD0] text-[#B8593B]' : 'bg-[#E8F0F5] text-[#5D7B93]'
                    }`}>
                      {result.availability.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  {result.storeStock && <div className="text-xs text-[#7D6B5D] mt-0.5">{result.storeStock}</div>}
                </div>
              </div>
              {result.priceWarning && (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2 flex items-start gap-1">
                  <span className="flex-shrink-0">!</span><span>{result.priceWarning}</span>
                </div>
              )}
              <div className="text-xs text-[#5C4D42] mb-2">
                <div>{result.address}</div>
                <div>{result.phone}</div>
                {result.notes && !result.priceWarning && <div className="text-[#7D6B5D] italic mt-1">{result.notes}</div>}
              </div>
              <a href={result.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#5D7B93] hover:text-[#4A6275] font-medium">
                {isOutOfStock ? 'Check for Updates' : 'View Product'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
