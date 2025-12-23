'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, DollarSign, Search, MapPin, TrendingDown, ExternalLink } from 'lucide-react';

interface ShoppingItem {
  id: string;
  project_id: string;
  product_name: string;
  quantity: number;
  price: number | null;
  category: string;
  required: boolean;
  created_at: string;
}

interface StoreResult {
  store: string;
  price: number;
  original_price?: number;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only' | 'check-online';
  distance: string;
  address: string;
  phone: string;
  link: string;
  notes?: string;
}

interface ShoppingListViewProps {
  project: any;
  isMobile?: boolean;
}

export default function ShoppingListView({ project, isMobile = false }: ShoppingListViewProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, StoreResult[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  useEffect(() => {
    if (project) loadItems();
  }, [project]);

  const loadItems = async () => {
    const { data } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });
    
    if (data) setItems(data);
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

  const handleSearchStores = async () => {
    if (selectedItems.size === 0 || !location.trim()) {
      console.log('Cannot search: no items selected or location missing');
      return;
    }
    
    console.log('Starting store search...');
    console.log('Selected items:', Array.from(selectedItems));
    console.log('Location:', location);
    
    setIsSearching(true);
    const results: Record<string, StoreResult[]> = {};
    
    try {
      const itemsArray = Array.from(selectedItems);
      
      for (let i = 0; i < itemsArray.length; i++) {
        const itemId = itemsArray[i];
        const item = items.find(it => it.id === itemId);
        
        if (!item) {
          console.log('Item not found for ID:', itemId);
          continue;
        }
        
        console.log(`Searching ${i + 1}/${itemsArray.length}: ${item.product_name}`);
        
        const requestBody = {
          materialName: item.product_name,
          location: location,
          quantity: item.quantity
        };
        
        const response = await fetch('/api/search-stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', response.status, errorText);
          continue;
        }
        
        const data = await response.json();
        console.log('Search results for', item.product_name, ':', data);
        
        results[itemId] = data.results || [];
        
        // Add 3 second delay between items to avoid rate limiting
        if (i < itemsArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      console.log('Search complete. Results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching stores:', error);
      alert('Error searching stores: ' + (error as Error).message);
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
  const selectedTotal = items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Only show project header on desktop - mobile has header in overlay */}
      {!isMobile && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-[#3E2723]">{project.name}</h2>
          <p className="text-[#7D6B5D] text-sm">{project.description}</p>
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
          <div className={`mb-4 ${isMobile ? 'space-y-3' : 'flex gap-2'}`}>
            <button
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#5D7B93] text-white rounded-xl hover:bg-[#4A6275] active:bg-[#3D5160] transition ${isMobile ? 'w-full text-base' : ''}`}
            >
              <Search className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
              {showSearchPanel ? 'Hide Search' : 'Search Local Stores'}
            </button>
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
                        className={`${isMobile ? 'p-4' : 'p-4'} flex items-center gap-4 ${isMobile ? 'active:bg-[#F5F0E6]' : ''}`}
                        onClick={isMobile ? () => toggleItem(item.id) : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#C67B5C] rounded focus:ring-2 focus:ring-[#C67B5C] flex-shrink-0 accent-[#C67B5C]`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-[#3E2723] ${isMobile ? 'text-base' : ''}`}>{item.product_name}</span>
                            {item.required && (
                              <span className="text-xs bg-[#FADDD0] text-[#B8593B] px-2 py-0.5 rounded font-medium">
                                Required
                              </span>
                            )}
                          </div>
                          <div className={`${isMobile ? 'text-base' : 'text-sm'} text-[#7D6B5D]`}>Qty: {item.quantity}</div>
                        </div>

                        {item.price && item.price > 0 && (
                          <div className="text-right flex-shrink-0">
                            <div className={`font-bold text-[#4A7C59] ${isMobile ? 'text-lg' : ''}`}>${item.price.toFixed(2)}</div>
                            {item.quantity > 1 && (
                              <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-[#7D6B5D]`}>
                                ${(item.price * item.quantity).toFixed(2)} total
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {searchResults[item.id] && searchResults[item.id].length > 0 && (
                        <div className="px-4 pb-4 bg-[#F5F0E6]">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-[#4A7C59]" />
                            <span className="text-sm font-semibold text-[#3E2723]">
                              Found at {searchResults[item.id].length} stores:
                            </span>
                          </div>

                          <div className="space-y-2">
                            {searchResults[item.id].map((result, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg border border-[#D4C8B8] bg-white"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[#3E2723]">{result.store}</span>
                                    </div>
                                    <div className="text-xs text-[#7D6B5D]">{result.distance}</div>
                                  </div>

                                  <div className="text-right">
                                    {result.price > 0 ? (
                                      <>
                                        <div className="text-lg font-bold text-[#4A7C59]">
                                          ${result.price.toFixed(2)}
                                        </div>
                                        {result.original_price && result.original_price > result.price && (
                                          <div className="text-xs text-[#A89880] line-through">
                                            ${result.original_price.toFixed(2)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-sm font-semibold text-[#5D7B93]">
                                        See website
                                      </div>
                                    )}
                                    <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 font-medium ${
                                      result.availability === 'in-stock' ? 'bg-[#E8F3EC] text-[#4A7C59]' :
                                      result.availability === 'limited' ? 'bg-[#FDF3ED] text-[#C67B5C]' :
                                      result.availability === 'out-of-stock' ? 'bg-[#FADDD0] text-[#B8593B]' :
                                      'bg-[#E8F0F5] text-[#5D7B93]'
                                    }`}>
                                      {result.availability.replace('-', ' ').toUpperCase()}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-xs text-[#5C4D42] mb-2">
                                  <div className="text-[#5C4D42]">{result.address}</div>
                                  <div className="text-[#5C4D42]">{result.phone}</div>
                                  {result.notes && (
                                    <div className="text-[#7D6B5D] italic mt-1">{result.notes}</div>
                                  )}
                                </div>

                                <a
                                  href={result.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#5D7B93] hover:text-[#4A6275] font-medium"
                                >
                                  View Product <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
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

            {total > 0 && (
              <div className={`bg-[#E8F3EC] border border-[#B8D8C4] rounded-xl ${isMobile ? 'p-4' : 'p-4'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <DollarSign className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-[#4A7C59]`} />
                  <span className={`font-bold text-[#3E2723] ${isMobile ? 'text-base' : ''}`}>Estimated Total:</span>
                </div>
                <span className={`${isMobile ? 'text-2xl' : 'text-2xl'} font-bold text-[#4A7C59]`}>${total.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}