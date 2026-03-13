'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Star, MessageSquare, Zap } from 'lucide-react';

const CATEGORIES = [
  'electrical', 'plumbing', 'hvac', 'carpentry', 'flooring',
  'roofing', 'concrete', 'drywall', 'painting', 'tile',
  'landscaping', 'general',
];

export default function LandingExpertForm() {
  const router = useRouter();
  const [questionText, setQuestionText] = useState('');
  const [tradeCategory, setTradeCategory] = useState('general');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (questionText.trim().length < 20) {
      setValidationError('Please describe your question in at least 20 characters.');
      return;
    }
    setValidationError(null);

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
