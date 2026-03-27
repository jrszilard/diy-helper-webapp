'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import FileUpload from '@/components/ui/FileUpload';

const TRADE_OPTIONS = [
  { value: '', label: 'Select a trade...' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'painting', label: 'Painting' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'general', label: 'General' },
];

const SESSION_KEY = 'diy-expert-question-draft';

export default function LandingExpertForm() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [trade, setTrade] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ question?: string; trade?: string }>({});

  const validate = (): boolean => {
    const next: { question?: string; trade?: string } = {};
    if (question.trim().length < 20) {
      next.question = 'Please describe your question in at least 20 characters.';
    }
    if (!trade) {
      next.trade = 'Please select a trade category.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const photoUrls = await Promise.all(
        photos.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ question: question.trim(), trade, photoUrls })
      );

      router.push('/marketplace/qa');
    } catch {
      setErrors({ question: 'Failed to process photos. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Trade category */}
      <div>
        <label
          htmlFor="trade-category"
          className="block text-sm font-medium text-white/70 mb-2"
        >
          Trade Category
        </label>
        <select
          id="trade-category"
          value={trade}
          onChange={(e) => {
            setTrade(e.target.value);
            if (errors.trade) setErrors((prev) => ({ ...prev, trade: undefined }));
          }}
          className="w-full bg-white/10 text-white border-0 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-terracotta/50 appearance-none"
        >
          {TRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''} className="bg-earth-brown-dark text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {errors.trade && (
          <p className="text-red-300 text-xs mt-1">{errors.trade}</p>
        )}
      </div>

      {/* Question */}
      <div>
        <label
          htmlFor="expert-question"
          className="block text-sm font-medium text-white/70 mb-2"
        >
          Your Question
        </label>
        <div className="bg-white/10 rounded-2xl p-4">
          <textarea
            id="expert-question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (errors.question) setErrors((prev) => ({ ...prev, question: undefined }));
            }}
            rows={4}
            placeholder="Describe your question or project in detail..."
            className="w-full bg-transparent text-white placeholder-white/40 text-base resize-none focus:outline-none"
          />
        </div>
        <div className="flex justify-between mt-1">
          {errors.question ? (
            <p className="text-red-300 text-xs">{errors.question}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-white/40">
            {question.length}/20 min
          </p>
        </div>
      </div>

      {/* Photos */}
      <FileUpload
        files={photos}
        onChange={setPhotos}
        maxFiles={3}
        maxSizeMB={5}
        label="Photos"
        variant="dark"
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-terracotta text-white px-6 py-3 rounded-xl font-semibold hover:bg-terracotta-dark transition-all disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Ask an Expert'}
        {!submitting && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
