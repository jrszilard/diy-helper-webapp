'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, CreditCard, Wallet, Shield, CheckCircle2, Zap, MessageSquare, FileCheck, Users, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { supabase } from '@/lib/supabase';
import { Spinner, Button, Select, Textarea, FileUpload } from '@/components/ui';
import type { ExpertContext } from '@/lib/marketplace/types';
import ProjectContextCard from '@/components/marketplace/ProjectContextCard';

interface QASubmitFormProps {
  reportId?: string;
  reportContext?: { projectSummary?: string; projectType?: string };
  expertContext?: ExpertContext | null;
  onSuccess: (questionId: string) => void;
  targetExpertId?: string;
  targetExpertName?: string;
  initialQuestion?: string;
  initialCategory?: string;
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
  expertContext,
  onSuccess,
  targetExpertId,
  targetExpertName,
  initialQuestion,
  initialCategory,
}: QASubmitFormProps) {
  const [category, setCategory] = useState(initialCategory || 'general');
  const [questionText, setQuestionText] = useState(initialQuestion || '');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstQuestion, setIsFirstQuestion] = useState(false);
  const [creditBalanceCents, setCreditBalanceCents] = useState(0);
  const [isTestMode, setIsTestMode] = useState(false);

  // Payment setup state
  const [savingCard, setSavingCard] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Dynamic pricing state
  const [dynamicPricing, setDynamicPricing] = useState<{
    priceCents: number;
    platformFeeCents: number;
    expertPayoutCents: number;
    tier?: string;
    tierLabel?: string;
    difficultyScore?: number;
    factors?: string[];
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const priceFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced dynamic price fetch
  const fetchPrice = useCallback(async (cat: string, text: string, photos: number) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      setPricingLoading(true);
      const res = await fetch('/api/qa/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reportId, category: cat, questionText: text, photoCount: photos }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pricing) setDynamicPricing(data.pricing);
      }
    } catch {
      // ignore — fall back to static display
    } finally {
      setPricingLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (questionText.trim().length < 20) return;
    if (priceFetchTimer.current) clearTimeout(priceFetchTimer.current);
    priceFetchTimer.current = setTimeout(() => {
      fetchPrice(category, questionText.trim(), photos.length);
    }, 800);
    return () => { if (priceFetchTimer.current) clearTimeout(priceFetchTimer.current); };
  }, [category, questionText, photos.length, fetchPrice]);

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

      // In test mode, the server provides a fake payment method — auto-confirm
      if (data.testMode) {
        setIsTestMode(true);
        setPaymentMethodId(data.paymentMethodId);
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

    // If not first question and no payment method saved, show error
    if (!isFirstQuestion && !paymentMethodId) {
      setError('Please save a payment method before submitting.');
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

      let uploadedUrls: string[] = [];
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrls = uploadData.urls || [];
        }
      }

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
          photoUrls: uploadedUrls,
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

  const needsPayment = !isFirstQuestion;

  return (
    <div className="bg-white border border-earth-sand rounded-lg p-6">
      {/* Test mode banner */}
      {isTestMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2">
          <Zap size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Test Mode — Using fake payment. No real charges will occur.
          </p>
        </div>
      )}

      <h2 className="text-lg font-bold text-foreground mb-1">
        {targetExpertName ? `Get Expert Guidance from ${targetExpertName}` : 'Get Expert Guidance on Your Project'}
      </h2>
      <p className="text-sm text-earth-brown mb-4">
        {expertContext
          ? 'Your AI report gives the expert full context before they even start — no explaining from scratch.'
          : 'Connect with a verified tradesperson who can answer the questions AI can\u2019t.'}
      </p>

      {/* ProjectContextCard — show AI context if available */}
      {expertContext && (
        <div className="mb-4">
          <ProjectContextCard
            context={expertContext}
            photoCount={photos.length || undefined}
            compact
          />
        </div>
      )}

      {/* What you get — value messaging */}
      <div className="mb-4 p-3 bg-slate-blue/5 border border-slate-blue/20 rounded-lg">
        <p className="text-xs text-slate-blue font-semibold mb-2">What you get that a phone call can&apos;t provide</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <FileCheck size={14} className="text-slate-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-blue"><strong>Pre-contextualized answer</strong> — your expert sees your full AI report, photos, and building codes upfront</p>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-slate-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-blue"><strong>Documented record</strong> — every answer stays with your project forever, not lost after a call</p>
          </div>
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-slate-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-blue"><strong>Payment protection</strong> — only charged when an expert claims; full refund if unanswered</p>
          </div>
          <div className="flex items-start gap-2">
            <Users size={14} className="text-slate-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-blue"><strong>Verified tradespeople</strong> — rated experts matched by specialty to your project</p>
          </div>
        </div>
      </div>

      {targetExpertId && targetExpertName && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-purple-600 font-medium">Direct Question</p>
          <p className="text-sm text-foreground">Sending directly to {targetExpertName}</p>
        </div>
      )}

      {reportContext?.projectSummary && !expertContext && (
        <div className="bg-earth-tan/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-earth-brown font-medium mb-1">Project Context</p>
          <p className="text-sm text-foreground">{reportContext.projectSummary}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category</label>
          <Select
            value={category}
            onChange={e => setCategory(e.target.value)}
            fullWidth
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        {/* Question */}
        <div>
          <Textarea
            label="Your Question"
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            rows={5}
            fullWidth
            resize="none"
            placeholder="Describe your question in detail..."
          />
          <p className="text-xs text-[var(--muted)] mt-1">{questionText.length} characters (minimum 20)</p>
        </div>

        {/* Photos */}
        <FileUpload
          files={photos}
          onChange={setPhotos}
          maxFiles={3}
          maxSizeMB={5}
          label="Photos"
        />

        {/* ── Payment Section (always visible) ── */}
        {needsPayment && (
          <div className={`border rounded-lg p-4 ${paymentMethodId ? 'border-forest-green bg-forest-green/5' : 'border-earth-sand bg-earth-tan/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className={paymentMethodId ? 'text-forest-green' : 'text-earth-brown'} />
                <h3 className="text-sm font-semibold text-foreground">Payment Method</h3>
              </div>
              {paymentMethodId && (
                <span className="flex items-center gap-1 text-xs text-forest-green font-medium">
                  <CheckCircle2 size={14} />
                  {isTestMode ? 'Test card saved' : 'Card saved'}
                </span>
              )}
            </div>

            {paymentMethodId ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-forest-green" />
                  <p className="text-xs text-forest-green">
                    Your card is saved. You will only be charged when an expert claims your question.
                  </p>
                </div>
                {isTestMode && (
                  <p className="text-xs text-amber-600 font-medium">
                    Test mode: pm_{customerId?.slice(-8) || 'test'} (fake card)
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-earth-brown">
                  Save a payment method to submit your question. You won&apos;t be charged now — only when an expert claims it.
                </p>
                <Button
                  variant="tertiary"
                  size="sm"
                  leftIcon={savingCard ? Loader2 : CreditCard}
                  iconSize={16}
                  onClick={handleSetupPayment}
                  disabled={savingCard}
                  className={savingCard ? '[&>svg:first-child]:animate-spin' : ''}
                >
                  {savingCard ? 'Saving...' : 'Save Payment Method'}
                </Button>
              </div>
            )}

            {creditBalanceCents > 0 && (
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-earth-sand/50">
                <Wallet size={14} className="text-forest-green" />
                <span className="text-sm text-forest-green font-medium">
                  {formatPrice(creditBalanceCents, true)} in credits will be applied first
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Dynamic Price Breakdown ── */}
        {!isFirstQuestion && dynamicPricing?.tier && (
          <div className="p-3 bg-earth-cream border border-earth-sand rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-terracotta" />
                <span className="text-sm font-semibold text-foreground">
                  {dynamicPricing.tierLabel} Question — {formatPrice(dynamicPricing.priceCents)}
                </span>
              </div>
              {pricingLoading && <Spinner size="sm" className="text-[var(--muted)]" />}
            </div>
            <div className="flex items-center gap-4 text-xs text-earth-brown">
              <span>You pay <strong>{formatPrice(dynamicPricing.priceCents, true)}</strong></span>
              <span className="text-[var(--muted)]">&rarr;</span>
              <span>Expert earns <strong className="text-forest-green">{formatPrice(dynamicPricing.expertPayoutCents, true)}</strong></span>
              <span className="text-[var(--muted)]">&rarr;</span>
              <span>Protected by escrow</span>
            </div>
            {dynamicPricing.factors && dynamicPricing.factors.length > 0 && (
              <p className="text-[10px] text-[var(--muted)] mt-1.5">
                Based on: {dynamicPricing.factors.join(' · ')}
              </p>
            )}
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              A service call for this would cost $75-150
            </p>
          </div>
        )}

        {/* ── Price + Submit ── */}
        <div className="flex items-center justify-between pt-2 border-t border-earth-sand/50">
          <div>
            {isFirstQuestion ? (
              <div>
                <span className="text-sm font-bold text-forest-green">FREE — First question on us!</span>
                <p className="text-xs text-earth-brown mt-0.5">No payment method needed</p>
              </div>
            ) : dynamicPricing?.tier ? (
              <div>
                <span className="text-sm font-medium text-foreground">
                  {dynamicPricing.tierLabel}: {formatPrice(dynamicPricing.priceCents)}
                </span>
                <p className="text-xs text-earth-brown mt-0.5">Charged only when an expert claims</p>
              </div>
            ) : (
              <div>
                <span className="text-sm font-medium text-foreground">Price: $5 - $8</span>
                <p className="text-xs text-earth-brown mt-0.5">Charged only when an expert claims</p>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            leftIcon={submitting ? Loader2 : Send}
            iconSize={16}
            onClick={handleSubmit}
            disabled={submitting || questionText.trim().length < 20 || (needsPayment && !paymentMethodId)}
            className={submitting ? '[&>svg:first-child]:animate-spin' : ''}
          >
            {submitting ? 'Submitting...' : 'Submit Question'}
          </Button>
        </div>
      </div>
    </div>
  );
}
