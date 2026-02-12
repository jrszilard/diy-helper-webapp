'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SharedMaterial {
  p: string;  // product_name
  q: number;  // quantity
  c: string;  // category
  $: number | null;  // price
}

interface SharedData {
  n: string;  // project name
  m: SharedMaterial[];  // materials
}

export default function SharePage() {
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setError('No shared data found. The link may be invalid or expired.');
        return;
      }
      const decoded = JSON.parse(decodeURIComponent(atob(hash)));
      if (!decoded.n || !decoded.m || !Array.isArray(decoded.m)) {
        setError('Invalid share link format.');
        return;
      }
      setData(decoded);
    } catch {
      setError('Could not decode the shared link. It may be corrupted.');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <ShoppingCart className="w-16 h-16 text-[#A89880] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#3E2723] mb-2">Shared Shopping List</h1>
          <p className="text-[#7D6B5D] mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C67B5C] text-white rounded-lg hover:bg-[#A65D3F] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to DIY Helper
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="animate-pulse text-[#7D6B5D]">Loading shared list...</div>
      </div>
    );
  }

  const total = data.m.reduce((sum, item) => sum + (item.$ || 0) * item.q, 0);

  const groupedMaterials = data.m.reduce((acc, item) => {
    const cat = item.c || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, SharedMaterial[]>);

  return (
    <div className="min-h-screen bg-[#F5F0E6] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#C67B5C] to-[#A65D3F] p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-6 h-6" />
              <span className="text-sm font-medium opacity-80">Shared Shopping List</span>
            </div>
            <h1 className="text-2xl font-bold">{data.n}</h1>
            <p className="text-sm opacity-80 mt-1">
              {data.m.length} items • ${total.toFixed(2)} estimated total
            </p>
          </div>

          {/* Materials */}
          <div className="p-6">
            {Object.entries(groupedMaterials).map(([category, items]) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-xs font-semibold text-[#7D6B5D] uppercase tracking-wide mb-3 pb-2 border-b border-[#E8DFD0]">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded border-2 border-[#D4C8B8] flex-shrink-0" />
                        <span className="text-[#3E2723] truncate">{item.p}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-sm text-[#7D6B5D]">x{item.q}</span>
                        <span className="text-sm font-semibold text-[#4A7C59] min-w-[60px] text-right">
                          {item.$ ? `$${(item.$ * item.q).toFixed(2)}` : 'TBD'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="mt-6 pt-4 border-t-2 border-[#3E2723] flex justify-between items-center">
              <span className="font-semibold text-[#3E2723]">Estimated Total</span>
              <span className="text-2xl font-bold text-[#4A7C59]">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#FDFBF7] p-4 border-t border-[#E8DFD0] flex items-center justify-between">
            <span className="text-xs text-[#A89880]">Shared via DIY Helper</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-[#C67B5C] hover:text-[#A65D3F] font-medium"
            >
              Start your own project
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
