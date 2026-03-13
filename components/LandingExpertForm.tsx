'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Star, MessageSquare, Zap, Camera, X } from 'lucide-react';

const CATEGORIES = [
  'electrical', 'plumbing', 'hvac', 'carpentry', 'flooring',
  'roofing', 'concrete', 'drywall', 'painting', 'tile',
  'landscaping', 'general',
];

const SESSION_KEY = 'diy-expert-question-draft';

export default function LandingExpertForm() {
  const router = useRouter();
  const [questionText, setQuestionText] = useState('');
  const [tradeCategory, setTradeCategory] = useState('general');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrls(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (questionText.trim().length < 20) {
      setValidationError('Please describe your question in at least 20 characters.');
      return;
    }
    setValidationError(null);

    // Persist to sessionStorage so data survives auth redirect
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      question: questionText.trim(),
      trade: tradeCategory,
      photoUrls,
    }));

    const params = new URLSearchParams();
    params.set('question', questionText.trim());
    params.set('trade', tradeCategory);
    router.push(`/marketplace/qa?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-[#3E2723]">Get a verified expert&apos;s take on your project</p>

      <div>
        <textarea
          value={questionText}
          onChange={e => { setQuestionText(e.target.value); setValidationError(null); }}
          rows={3}
          placeholder="Describe your question or project..."
          className="w-full px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
        />
        {validationError && (
          <p className="text-xs text-red-600 mt-1">{validationError}</p>
        )}
      </div>

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium text-[#3E2723] mb-1">Photos (optional)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#D4C8B8]">
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-0 right-0 bg-[#3E2723]/70 text-white p-0.5 rounded-bl-lg"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-[#D4C8B8] flex flex-col items-center justify-center text-[#A89880] hover:border-[#C67B5C] hover:text-[#C67B5C] transition-colors"
          >
            <Camera size={18} />
            <span className="text-[10px] mt-0.5">Add</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />
        <p className="text-xs text-[#A89880]">Add photos of your project for better expert advice</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#3E2723] mb-1">Trade Category</label>
        <select
          value={tradeCategory}
          onChange={e => setTradeCategory(e.target.value)}
          className="w-full px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        className="flex items-center gap-2 bg-[#4A7C59] text-white px-6 py-3 rounded-xl hover:bg-[#2D5A3B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
      >
        Submit to Expert Marketplace
        <ArrowRight size={16} />
      </button>

      <div className="flex flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <Star size={14} className="text-[#C6943E] fill-[#C6943E]" />
          <span className="font-semibold text-[#3E2723]">4.9</span> avg rating
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <MessageSquare size={14} className="text-[#5D7B93]" />
          <span className="font-semibold text-[#3E2723]">127</span> questions answered
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <Zap size={14} className="text-[#C67B5C]" />
          First question <span className="font-semibold text-[#3E2723]">free</span>
        </div>
      </div>
    </div>
  );
}
