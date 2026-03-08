'use client';

import { X } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  onRemove: () => void;
  disabled?: boolean;
}

export default function ImagePreview({ src, onRemove, disabled }: ImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt="Attached image"
        className="h-16 w-16 object-cover rounded-lg border border-[#D4C8B8]"
      />
      {!disabled && (
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 bg-[#B8593B] text-white rounded-full p-0.5 hover:bg-[#8B3A1F] transition-colors shadow-sm"
          aria-label="Remove image"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
