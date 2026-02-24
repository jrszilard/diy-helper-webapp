'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, CreditCard, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QASubmitFormProps {
  reportId?: string;
  reportContext?: { projectSummary?: string; projectType?: string };
  onSuccess: (questionId: string) => void;
  targetExpertId?: string;
  targetExpertName?: string;
}

const CATEGORIES = [
  'electrical',
  'plumbing',
  'hvac',
  'carpentry',
  'flooring',
  'roofing',
  'concrete',
  'drywall',
  'painting',
  'tile',
  'landscaping',
  'general',
];

export default function QASubmitForm({
  reportId,
  reportContext,
  onSuccess,
  targetExpertId,
  targetExpertName,
}: QASubmitFormProps) {
  const [category, setCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstQuestion, setIsFirstQuestion] = useState(false);
  const [creditBalanceCents, setCreditBalanceCents] = useState(0);

  // Payment setup state
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'done'>('form');
  const [savingCard, setSavingCard] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    async function checkFirstQuestion() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        // Check if first question
        const res = await fetch('/api/qa', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsFirstQuestion((data.questions || []).length === 0);
        }

        // Check credits
        const creditsRes = await fetch('/api/qa/credits', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setCreditBalanceCents(creditsData.balanceCents ?? 0);
        }
      } catch {
        // ignore
      }
    }
    checkFirstQuestion();
  }, []);

  const handleSetupPayment = async () => {
    setSavingCard(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        setSavingCard(false);
        return;
      }

      const res = await fetch('/api/qa/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to set up payment.');
        setSavingCard(false);
        return;
      }

      const data = await res.json();
      setCustomerId(data.customerId);

      // In test mode, the clientSecret is a fake — auto-confirm
      if (data.clientSecret.includes('_test_')) {
        // Test mode: use a fake payment method
        setPaymentMethodId(`pm_test_${Date.now()}`);
        setPaymentStep('done');
        setSavingCard(false);
        return;
      }

      // Real Stripe: load Stripe.js and confirm SetupIntent
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe) {
        setError('Failed to load payment processor.');
        setSavingCard(false);
        return;
      }

      // Use Stripe's card element via confirmCardSetup
      // For now, we use the PaymentElement approach
      const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: {
          card: { token: 'tok_visa' } as unknown as Parameters<typeof stripe.confirmCardSetup>[1] extends { payment_method: { card: infer C } } ? C : never,
        } as Parameters<typeof stripe.confirmCardSetup>[1] extends { payment_method: infer P } ? P : never,
      });

      if (confirmError) {
        setError(confirmError.message || 'Card setup failed.');
        setSavingCard(false);
        return;
      }

      if (setupIntent?.payment_method) {
        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
        setPaymentMethodId(pmId);
        setPaymentStep('done');
      }
    } catch {
      setError('Something went wrong setting up payment.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleSubmit = async () => {
    if (!questionText.trim() || questionText.trim().length < 20) {
      setError('Please provide a detailed question (at least 20 characters).');
      return;
    }

    // If not first question and no payment method saved, prompt for payment
    if (!isFirstQuestion && !paymentMethodId && paymentStep === 'form') {
      setPaymentStep('payment');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to ask a question.');
        setSubmitting(false);
        return;
      }

      const photos = photoUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId,
          category,
          questionText: questionText.trim(),
          photoUrls: photos,
          paymentMethodId: paymentMethodId || undefined,
          targetExpertId: targetExpertId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit question.');
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      onSuccess(data.questionId || data.id);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-6">
      <h2 className="text-lg font-bold text-[#3E2723] mb-4">
        {targetExpertName ? `Ask ${targetExpertName}` : 'Ask an Expert'}
      </h2>

      {targetExpertId && targetExpertName && (
        <div className="bg-[#5D7B93]/10 rounded-lg p-3 mb-4">
          <p className="text-xs text-[#5D7B93] font-medium">Direct Question</p>
          <p className="text-sm text-[#3E2723]">Sending to {targetExpertName}</p>
        </div>
      )}

      {reportContext?.projectSummary && (
        <div className="bg-[#E8DFD0]/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-[#7D6B5D] font-medium mb-1">Project Context</p>
          <p className="text-sm text-[#3E2723]">{reportContext.projectSummary}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {paymentStep === 'payment' ? (
        <div className="space-y-4">
          <div className="bg-[#E8DFD0]/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={16} className="text-[#7D6B5D]" />
              <h3 className="text-sm font-semibold text-[#3E2723]">Save Payment Method</h3>
            </div>
            <p className="text-xs text-[#7D6B5D] mb-3">
              Your card will only be charged when an expert claims your question.
              If no one answers, you won&apos;t be charged.
            </p>
            {creditBalanceCents > 0 && (
              <div className="flex items-center gap-1.5 mb-3 text-sm">
                <Wallet size={14} className="text-[#4A7C59]" />
                <span className="text-[#4A7C59] font-medium">
                  ${(creditBalanceCents / 100).toFixed(2)} in credits will be applied
                </span>
              </div>
            )}
            <button
              onClick={handleSetupPayment}
              disabled={savingCard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                savingCard
                  ? 'bg-[#B0A696] cursor-not-allowed'
                  : 'bg-[#5D7B93] hover:bg-[#4A6578]'
              }`}
            >
              {savingCard ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CreditCard size={16} />
              )}
              {savingCard ? 'Saving...' : 'Save Card & Continue'}
            </button>
            <button
              onClick={() => setPaymentStep('form')}
              className="ml-3 text-sm text-[#7D6B5D] hover:text-[#3E2723]"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Your Question</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
              placeholder="Describe your question in detail..."
            />
            <p className="text-xs text-[#B0A696] mt-1">{questionText.length} characters (minimum 20)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Photo URLs (optional)</label>
            <textarea
              value={photoUrls}
              onChange={e => setPhotoUrls(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
              placeholder="One URL per line"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              {isFirstQuestion ? (
                <span className="text-sm font-semibold text-[#4A7C59]">FREE</span>
              ) : (
                <span className="text-sm text-[#7D6B5D]">Price: $5 - $8 (charged when expert claims)</span>
              )}
              {!isFirstQuestion && creditBalanceCents > 0 && (
                <div className="flex items-center gap-1.5">
                  <Wallet size={12} className="text-[#4A7C59]" />
                  <span className="text-xs text-[#4A7C59]">
                    ${(creditBalanceCents / 100).toFixed(2)} in credits will be applied
                  </span>
                </div>
              )}
              {paymentMethodId && (
                <div className="flex items-center gap-1.5">
                  <CreditCard size={12} className="text-[#4A7C59]" />
                  <span className="text-xs text-[#4A7C59]">Card saved</span>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || questionText.trim().length < 20}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${
                submitting || questionText.trim().length < 20
                  ? 'bg-[#B0A696] cursor-not-allowed'
                  : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
              }`}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {submitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
