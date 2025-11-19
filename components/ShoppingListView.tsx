'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, DollarSign } from 'lucide-react';

export default function ShoppingListView({ project }: { project: any }) {
  const [items, setItems] = useState<any[]>([]);

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

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-400">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Select a project to view shopping list</p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
        <p className="text-gray-600 text-sm">{project.description}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No items yet</p>
          <p className="text-sm mt-1">Products will appear here automatically</p>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold">{item.product_name}</div>
                  <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                </div>
                {item.price && (
                  <div className="text-right">
                    <div className="font-bold text-green-600">${item.price.toFixed(2)}</div>
                    {item.quantity > 1 && (
                      <div className="text-xs text-gray-500">
                        ${(item.price * item.quantity).toFixed(2)} total
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="font-bold">Estimated Total:</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}