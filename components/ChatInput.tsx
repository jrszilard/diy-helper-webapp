'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Search, Package, ShoppingCart, Loader2, Camera } from 'lucide-react';
import ImagePreview from './ImagePreview';
import { processImage, isValidImageType, type ProcessedImage } from '@/lib/image-utils';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';

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
        <div className="px-4 py-2 bg-[var(--status-progress-bg)] border-t border-[#E8D5CC]">
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
            <Button
              variant="secondary"
              onClick={onAutoExtractMaterials}
              disabled={isAutoExtracting}
              leftIcon={isAutoExtracting ? Loader2 : Package}
              iconSize={16}
              className={`flex-shrink-0 whitespace-nowrap ${isAutoExtracting ? '[&>svg]:animate-spin' : ''}`}
            >
              {isAutoExtracting ? 'Processing...' : 'Save Materials'}
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className={`bg-surface border-t border-[#D4C8B8] p-4 ${isDragOver ? 'ring-2 ring-[#C67B5C] ring-inset bg-[var(--status-progress-bg)]' : ''}`}
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
            className="p-2 text-[#7D6B5D] hover:text-[#C67B5C] hover:bg-[var(--status-progress-bg)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <TextInput
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={imagePreview ? 'Describe what you want to know about this image...' : 'Ask me anything about your DIY project...'}
            disabled={isLoading}
            fullWidth
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !processedImage)}
          >
            Send
          </Button>
        </div>
      </div>
    </>
  );
});

export default ChatInput;
