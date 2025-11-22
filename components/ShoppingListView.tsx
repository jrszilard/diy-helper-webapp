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

export default function ShoppingListView({ project }: { project: any }) {
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
      <div className="p-8 text-center text-gray-400">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-gray-500">Select a project to view shopping list</p>
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">{project.name}</h2>
        <p className="text-gray-600 text-sm">{project.description}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50 text-gray-400" />
          <p className="text-gray-500">No items yet</p>
          <p className="text-sm mt-1 text-gray-400">Products will appear here automatically</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Search className="w-4 h-4" />
              {showSearchPanel ? 'Hide Search' : 'Search Local Stores'}
            </button>
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                {selectedItems.size} item(s) selected
              </div>
            )}
          </div>

          {showSearchPanel && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Search Local Stores</h3>
              </div>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location (e.g., Portsmouth, NH)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  onClick={handleSearchStores}
                  disabled={selectedItems.size === 0 || !location.trim() || isSearching}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              <p className="text-sm text-gray-600">
                💡 Select items below with checkboxes, then search to find products at nearby stores
              </p>
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">
                  {category}
                </h3>
                
                <div className="bg-white rounded-xl border border-gray-200 divide-y">
                  {categoryItems.map((item) => (
                    <div key={item.id}>
                      <div className="p-4 flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.product_name}</span>
                            {item.required && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                        </div>
                        
                        {item.price && item.price > 0 && (
                          <div className="text-right">
                            <div className="font-bold text-green-600">${item.price.toFixed(2)}</div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-gray-600">
                                ${(item.price * item.quantity).toFixed(2)} total
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {searchResults[item.id] && searchResults[item.id].length > 0 && (
                        <div className="px-4 pb-4 bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-gray-800">
                              Found at {searchResults[item.id].length} stores:
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {searchResults[item.id].map((result, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg border border-gray-200 bg-white"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">{result.store}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">{result.distance}</div>
                                  </div>
                                  
                                  <div className="text-right">
                                    {result.price > 0 ? (
                                      <>
                                        <div className="text-lg font-bold text-green-600">
                                          ${result.price.toFixed(2)}
                                        </div>
                                        {result.original_price && result.original_price > result.price && (
                                          <div className="text-xs text-gray-500 line-through">
                                            ${result.original_price.toFixed(2)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-sm font-semibold text-blue-600">
                                        See website
                                      </div>
                                    )}
                                    <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 font-medium ${
                                      result.availability === 'in-stock' ? 'bg-green-100 text-green-800' :
                                      result.availability === 'limited' ? 'bg-yellow-100 text-yellow-800' :
                                      result.availability === 'out-of-stock' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {result.availability.replace('-', ' ').toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-gray-700 mb-2">
                                  <div className="text-gray-700">{result.address}</div>
                                  <div className="text-gray-700">📞 {result.phone}</div>
                                  {result.notes && (
                                    <div className="text-gray-600 italic mt-1">{result.notes}</div>
                                  )}
                                </div>

                                <a 
                                  href={result.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
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

          <div className="mt-6 space-y-3">
            {selectedItems.size > 0 && selectedTotal > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-900">Selected Items Total:</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">${selectedTotal.toFixed(2)}</span>
              </div>
            )}
            
            {total > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-900">Estimated Total:</span>
                </div>
                <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}