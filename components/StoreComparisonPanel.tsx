'use client';

import { useState } from 'react';
import { ExternalLink, Check, AlertCircle, Store, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StoreResult {
  store: string;
  retailer: 'home-depot' | 'lowes' | 'ace-hardware' | 'menards';
  price: number;
  originalPrice?: number;
  link: string;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only' | 'check-online';
  distance?: string;
  address?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  priceWarning?: string;
  sku?: string;
  storeStock?: string;
}

interface StoreComparisonPanelProps {
  materialName: string;
  results: StoreResult[];
  quantity?: number;
  priceRange?: {
    min: number | null;
    max: number | null;
    avg: number | null;
    sources: number;
  } | null;
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

// Confidence indicator component
function ConfidenceIndicator({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) {
  if (!confidence) return null;

  const config = {
    high: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Verified',
      tooltip: 'Price extracted from structured data',
    },
    medium: {
      icon: Info,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      label: 'Estimated',
      tooltip: 'Price may vary - verify on store website',
    },
    low: {
      icon: AlertTriangle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Check site',
      tooltip: 'Visit store website for current price',
    },
  };

  const { icon: Icon, color, bgColor, label, tooltip } = config[confidence];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${color}`}
      title={tooltip}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

// Availability badge component
function AvailabilityBadge({ availability, storeStock }: { availability: string; storeStock?: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'in-stock': { bg: 'bg-[#E8F3EC]', text: 'text-[#4A7C59]', label: 'In Stock' },
    'limited': { bg: 'bg-[#FDF3ED]', text: 'text-[#C67B5C]', label: 'Limited Stock' },
    'out-of-stock': { bg: 'bg-[#FADDD0]', text: 'text-[#B8593B]', label: 'Out of Stock' },
    'online-only': { bg: 'bg-[#E8F0F5]', text: 'text-[#5D7B93]', label: 'Online Only' },
    'check-online': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Check Online' },
  };

  const { bg, text, label } = config[availability] || config['check-online'];

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-1 rounded font-medium ${bg} ${text}`}>
        {label}
      </span>
      {storeStock && (
        <span className="text-xs text-[#7D6B5D]">{storeStock}</span>
      )}
    </div>
  );
}

export default function StoreComparisonPanel({
  materialName,
  results,
  quantity = 1,
  priceRange,
}: StoreComparisonPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Find best price (if prices available) from in-stock items first
  const inStockWithPrices = results.filter(r => r.price > 0 && r.availability !== 'out-of-stock');
  const pricesAvailable = inStockWithPrices.length > 0 ? inStockWithPrices : results.filter(r => r.price > 0);
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
          {/* Price range indicator */}
          {priceRange && priceRange.min && priceRange.max && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#F5F0E6] rounded-lg text-sm">
              <span className="text-[#7D6B5D]">Market price range:</span>
              <span className="font-medium text-[#3E2723]">
                ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
              </span>
            </div>
          )}

          {results.map((result, idx) => {
            const config = getRetailerConfig(result.retailer);
            const isBest = bestPrice !== null && result.price === bestPrice && result.price > 0 && result.availability !== 'out-of-stock';
            const isOutOfStock = result.availability === 'out-of-stock';

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all ${config.color.bg} ${
                  isBest ? config.color.border : 'border-transparent'
                } ${isOutOfStock ? 'opacity-60' : ''}`}
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
                      {result.sku && (
                        <div className="text-xs text-[#9B8B7D]">SKU: {result.sku}</div>
                      )}
                      {result.distance && (
                        <div className="text-sm text-[#7D6B5D]">{result.distance}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {result.price > 0 ? (
                      <>
                        <div className="flex items-center justify-end gap-2">
                          <div className={`text-xl font-bold ${isOutOfStock ? 'text-gray-400 line-through' : config.color.text}`}>
                            ${result.price.toFixed(2)}
                          </div>
                          <ConfidenceIndicator confidence={result.confidence} />
                        </div>
                        {result.originalPrice && result.originalPrice > result.price && (
                          <div className="text-sm text-gray-400 line-through">
                            ${result.originalPrice.toFixed(2)}
                          </div>
                        )}
                        {quantity > 1 && !isOutOfStock && (
                          <div className="text-sm text-[#7D6B5D]">
                            ${(result.price * quantity).toFixed(2)} total
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#7D6B5D]">Check website</span>
                        <ConfidenceIndicator confidence="low" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability badge */}
                <div className="mb-3">
                  <AvailabilityBadge
                    availability={result.availability}
                    storeStock={result.storeStock}
                  />
                </div>

                {/* Price warning */}
                {result.priceWarning && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded mb-3">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{result.priceWarning}</span>
                  </div>
                )}

                {/* Notes */}
                {result.notes && !result.priceWarning && (
                  <div className="text-xs text-[#7D6B5D] mb-3 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{result.notes}</span>
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
                  {isOutOfStock ? 'Check for Updates' : `View at ${config.name}`}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}

          {/* Footer tip */}
          <div className="text-xs text-[#7D6B5D] text-center mt-4 pt-3 border-t border-[#E8DFD0] space-y-1">
            <p>Prices and availability are extracted in real-time from store websites.</p>
            <p className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
              <span>= High confidence</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                <Info className="w-3 h-3" /> Estimated
              </span>
              <span>= May vary</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
