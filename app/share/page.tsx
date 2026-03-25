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
    const t = setTimeout(() => {
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
        // Validate types and sanitize values
        if (typeof decoded.n !== 'string') {
          setError('Invalid share link format.');
          return;
        }

        const sanitized: SharedData = {
          n: decoded.n.slice(0, 200),
          m: decoded.m.slice(0, 200).map((item: Record<string, unknown>) => ({
            p: typeof item.p === 'string' ? item.p.slice(0, 200) : 'Unknown item',
            q: typeof item.q === 'number' ? Math.min(Math.max(Math.round(item.q), 1), 9999) : 1,
            c: typeof item.c === 'string' ? item.c.slice(0, 50) : 'general',
            $: typeof item.$ === 'number' ? Math.min(Math.max(item.$, 0), 999999) : null,
          })),
        };

        setData(sanitized);
      } catch {
        setError('Could not decode the shared link. It may be corrupted.');
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-earth-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <ShoppingCart className="w-16 h-16 text-earth-brown-light mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Shared Shopping List</h1>
          <p className="text-earth-brown mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-terracotta text-white rounded-lg hover:bg-terracotta-dark transition"
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
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <div className="animate-pulse text-earth-brown">Loading shared list...</div>
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
    <div className="min-h-screen bg-earth-cream py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-terracotta to-terracotta-dark p-6 text-white">
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
                <h3 className="text-xs font-semibold text-earth-brown uppercase tracking-wide mb-3 pb-2 border-b border-earth-tan">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded border-2 border-earth-sand flex-shrink-0" />
                        <span className="text-foreground truncate">{item.p}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-sm text-earth-brown">x{item.q}</span>
                        <span className="text-sm font-semibold text-forest-green min-w-[60px] text-right">
                          {item.$ ? `$${(item.$ * item.q).toFixed(2)}` : 'TBD'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="mt-6 pt-4 border-t-2 border-foreground flex justify-between items-center">
              <span className="font-semibold text-foreground">Estimated Total</span>
              <span className="text-2xl font-bold text-forest-green">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-surface p-4 border-t border-earth-tan flex items-center justify-between">
            <span className="text-xs text-earth-brown-light">Shared via DIY Helper</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-terracotta hover:text-terracotta-dark font-medium"
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
