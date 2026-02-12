'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Search, Package, ShoppingCart, Loader2, Camera } from 'lucide-react';
import ImagePreview from './ImagePreview';
import { processImage, isValidImageType, type ProcessedImage } from '@/lib/image-utils';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (image?: ProcessedImage) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageSelect = useCallback(async (file: File) => {
    setImageError(null);
    if (!isValidImageType(file)) {
      setImageError('Please use JPEG, PNG, WebP, or GIF images.');
      return;
    }
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      const processed = await processImage(file);
      setProcessedImage(processed);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to process image');
      setImagePreview(null);
      setProcessedImage(null);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleImageSelect]);

  const handleRemoveImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setProcessedImage(null);
    setImageError(null);
  }, [imagePreview]);

  const handleSend = useCallback(() => {
    onSend(processedImage || undefined);
    handleRemoveImage();
  }, [onSend, processedImage, handleRemoveImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

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
      <div
        className={`bg-[#FDFBF7] border-t border-[#D4C8B8] p-4 ${isDragOver ? 'ring-2 ring-[#C67B5C] ring-inset bg-[#FDF3ED]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2">
            <ImagePreview src={imagePreview} onRemove={handleRemoveImage} disabled={isLoading} />
          </div>
        )}
        {imageError && (
          <p className="text-xs text-[#B8593B] mb-2">{imageError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2 text-[#7D6B5D] hover:text-[#C67B5C] hover:bg-[#FDF3ED] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Attach image"
            title="Attach a photo for analysis"
          >
            <Camera size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={imagePreview ? 'Describe what you want to know about this image...' : 'Ask me anything about your DIY project...'}
            className="flex-1 px-4 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !processedImage)}
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
