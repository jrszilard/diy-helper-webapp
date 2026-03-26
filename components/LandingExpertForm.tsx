'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
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
      // Convert files to base64
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
      <p className="text-lg font-semibold text-foreground">
        Get a verified expert&apos;s take on your project
      </p>

      {/* Trade category */}
      <div>
        <label
          htmlFor="trade-category"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Trade Category
        </label>
        <Select
          id="trade-category"
          value={trade}
          onChange={(e) => {
            setTrade(e.target.value);
            if (errors.trade) setErrors((prev) => ({ ...prev, trade: undefined }));
          }}
          error={errors.trade}
          fullWidth
        >
          {TRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Question */}
      <div>
        <Textarea
          id="expert-question"
          label="Your Question"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            if (errors.question) setErrors((prev) => ({ ...prev, question: undefined }));
          }}
          rows={4}
          placeholder="Describe your question or project in detail..."
          error={errors.question}
          fullWidth
          resize="vertical"
        />
        <p className="text-xs text-earth-brown-light mt-1">
          {question.length}/20 characters minimum
        </p>
      </div>

      {/* Photos */}
      <FileUpload
        files={photos}
        onChange={setPhotos}
        maxFiles={3}
        maxSizeMB={5}
        label="Photos"
      />

      {/* Submit */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Ask an Expert'}
      </Button>
    </div>
  );
}
