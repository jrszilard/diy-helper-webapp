'use client';

import { useState } from 'react';
import { ExternalLink, Check, AlertCircle, Store, ChevronDown, ChevronUp } from 'lucide-react';

interface StoreResult {
  store: string;
  retailer: 'home-depot' | 'lowes' | 'ace-hardware' | 'menards';
  price: number;
  link: string;
  availability: string;
  distance?: string;
  address?: string;
}

interface StoreComparisonPanelProps {
  materialName: string;
  results: StoreResult[];
  quantity?: number;
}

// Retailer configuration
const RETAILER_CONFIG = {
  'home-depot': {
    name: 'Home Depot',
    color: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-700',
      button: 'bg-orange-500 hover:bg-orange-600',
    },
    emoji: '🏠',
  },
  'lowes': {
    name: "Lowe's",
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    emoji: '🔧',
  },
  'ace-hardware': {
    name: 'Ace Hardware',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700',
    },
    emoji: '🔴',
  },
  'menards': {
    name: 'Menards',
    color: {
      bg: 'bg-green-50',
      border: 'border-green-600',
      text: 'text-green-700',
      button: 'bg-green-600 hover:bg-green-700',
    },
    emoji: '🟢',
  },
};

export default function StoreComparisonPanel({
  materialName,
  results,
  quantity = 1,
}: StoreComparisonPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Find best price (if prices available)
  const pricesAvailable = results.filter(r => r.price > 0);
  const bestPrice = pricesAvailable.length > 0
    ? Math.min(...pricesAvailable.map(r => r.price))
    : null;

  // Get retailer config with fallback
  const getRetailerConfig = (retailer: string) => {
    return RETAILER_CONFIG[retailer as keyof typeof RETAILER_CONFIG] || {
      name: retailer,
      color: {
        bg: 'bg-gray-50',
        border: 'border-gray-500',
        text: 'text-gray-700',
        button: 'bg-gray-600 hover:bg-gray-700',
      },
      emoji: '🏪',
    };
  };

  if (results.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-500 font-medium">No store results found</p>
        <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#D4C8B8] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-[#F5F0E6] hover:bg-[#E8DFD0] transition"
      >
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-[#5D7B93]" />
          <span className="font-semibold text-[#3E2723]">{materialName}</span>
          {quantity > 1 && (
            <span className="text-sm text-[#7D6B5D]">(x{quantity})</span>
          )}
          <span className="text-sm text-[#7D6B5D] ml-2">
            {results.length} store{results.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#7D6B5D]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#7D6B5D]" />
        )}
      </button>

      {/* Results */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {results.map((result, idx) => {
            const config = getRetailerConfig(result.retailer);
            const isBest = bestPrice !== null && result.price === bestPrice && result.price > 0;

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all ${config.color.bg} ${
                  isBest ? config.color.border : 'border-transparent'
                }`}
              >
                {/* Best price badge */}
                {isBest && (
                  <div className={`text-xs font-bold ${config.color.text} mb-2 flex items-center gap-1`}>
                    <Check className="w-3 h-3" />
                    BEST PRICE
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.emoji}</span>
                    <div>
                      <div className="font-semibold text-[#3E2723]">
                        {result.store.split(' - ')[0]}
                      </div>
                      {result.distance && (
                        <div className="text-sm text-[#7D6B5D]">{result.distance}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {result.price > 0 ? (
                      <>
                        <div className={`text-xl font-bold ${config.color.text}`}>
                          ${result.price.toFixed(2)}
                        </div>
                        {quantity > 1 && (
                          <div className="text-sm text-[#7D6B5D]">
                            ${(result.price * quantity).toFixed(2)} total
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-[#7D6B5D]">
                        Check website
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability badge */}
                {result.availability && (
                  <div className={`text-xs px-2 py-1 rounded inline-block mb-3 font-medium ${
                    result.availability === 'in-stock' ? 'bg-[#E8F3EC] text-[#4A7C59]' :
                    result.availability === 'limited' ? 'bg-[#FDF3ED] text-[#C67B5C]' :
                    result.availability === 'out-of-stock' ? 'bg-[#FADDD0] text-[#B8593B]' :
                    'bg-[#E8F0F5] text-[#5D7B93]'
                  }`}>
                    {result.availability.replace(/-/g, ' ').toUpperCase()}
                  </div>
                )}

                {/* Address */}
                {result.address && (
                  <div className="text-xs text-[#7D6B5D] mb-3">
                    {result.address}
                  </div>
                )}

                {/* View button */}
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
                             font-medium text-white transition-all ${config.color.button}`}
                >
                  View at {config.name}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}

          {/* Tip */}
          <p className="text-xs text-[#7D6B5D] text-center mt-4 pt-3 border-t border-[#E8DFD0]">
            Click to view current prices and check local availability
          </p>
        </div>
      )}
    </div>
  );
}
