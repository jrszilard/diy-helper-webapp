'use client';

import React from 'react';
import { Search, Package, ShoppingCart, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  showGoogleFallback: boolean;
  onGoogleSearch: () => void;
  // Materials detection
  showMaterialsBanner: boolean;
  isAutoExtracting: boolean;
  onAutoExtractMaterials: () => void;
}

const ChatInput = React.memo(function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  showGoogleFallback,
  onGoogleSearch,
  showMaterialsBanner,
  isAutoExtracting,
  onAutoExtractMaterials,
}: ChatInputProps) {
  return (
    <>
      {/* Google Search Fallback */}
      {showGoogleFallback && isLoading && (
        <div className="px-4 py-2 bg-[#FDF3ED] border-t border-[#E8D5CC]">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-[#B8593B]">Taking too long?</span>
            <button
              onClick={onGoogleSearch}
              className="inline-flex items-center gap-1 text-sm text-[#C67B5C] hover:text-[#A65D3F] underline font-medium"
            >
              <Search size={14} />
              Search Google instead
            </button>
          </div>
        </div>
      )}

      {/* Materials Detection Banner */}
      {showMaterialsBanner && (
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-800 font-semibold">
                Materials list detected!
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Save to your project to track purchases and find local prices
              </p>
            </div>
            <button
              onClick={onAutoExtractMaterials}
              disabled={isAutoExtracting}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700
                         text-sm font-semibold whitespace-nowrap shadow-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {isAutoExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Save Materials
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#FDFBF7] border-t border-[#D4C8B8] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && onSend()}
            placeholder="Ask me anything about your DIY project..."
            className="flex-1 px-4 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
            disabled={isLoading}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="bg-[#C67B5C] text-white px-6 py-2 rounded-lg hover:bg-[#A65D3F] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
});

export default ChatInput;
