'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Target, Users, RotateCcw, XCircle, CreditCard, Shield, Zap, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import QAAnswerView from '@/components/marketplace/QAAnswerView';
import QAAnswerForm from '@/components/marketplace/QAAnswerForm';
import ReviewForm from '@/components/marketplace/ReviewForm';
import CreditBalance from '@/components/marketplace/CreditBalance';

interface QuestionDetail {
  id: string;
  diyerUserId: string;
  expertId: string | null;
  questionText: string;
  category: string;
  status: string;
  answerText: string | null;
  answerPhotos: string[];
  recommendsProfessional: boolean;
  proRecommendationReason: string | null;
  priceCents: number;
  createdAt: string;
  questionMode: 'pool' | 'direct';
  targetExpertId: string | null;
  markedNotHelpful: boolean;
  creditAppliedCents: number;
  refundId: string | null;
  refundedAt: string | null;
  paymentIntentId: string | null;
  payoutStatus: string;
}

export default function QADetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [showCreditNotice, setShowCreditNotice] = useState(false);

  const fetchQuestion = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestion(data.question);
      }
    } catch {
      // ignore
    }
  }, [questionId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/chat');
        return;
      }
      setCurrentUserId(user.id);
      await fetchQuestion();
      setLoading(false);
    }
    init();
  }, [router, fetchQuestion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#7D6B5D] mb-4">Question not found</p>
          <Link href="/marketplace/qa" className="text-sm text-[#5D7B93] hover:underline">
            Back to Q&A
          </Link>
        </div>
      </div>
    );
  }

  const isDIYer = currentUserId === question.diyerUserId;
  const isExpert = currentUserId !== question.diyerUserId && question.expertId !== null;
  const isFree = question.priceCents === 0;
  const isTestPayment = question.paymentIntentId?.startsWith('pi_test_') || question.refundId?.startsWith('re_test_');

  const handleAccept = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchQuestion();
      }
    } catch {
      // ignore
    }
  };

  const handleNotHelpful = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/not-helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowCreditNotice(true);
        await fetchQuestion();
      }
    } catch {
      // ignore
    }
  };

  // Payment status for DIYer
  const q = question; // alias for non-null access
  const paymentStatus = isFree
    ? { label: 'Free', color: 'green', detail: 'First question — no charge' }
    : q.refundId
    ? { label: 'Refunded', color: 'green', detail: `Refund issued${q.refundedAt ? ` on ${new Date(q.refundedAt).toLocaleDateString()}` : ''}` }
    : q.markedNotHelpful
    ? { label: 'Credit issued', color: 'green', detail: `$${((q.priceCents - q.creditAppliedCents) / 100).toFixed(2)} added as platform credit` }
    : q.paymentIntentId
    ? { label: 'Charged', color: 'amber', detail: `$${(q.priceCents / 100).toFixed(2)} charged when expert claimed${q.creditAppliedCents > 0 ? ` ($${(q.creditAppliedCents / 100).toFixed(2)} covered by credits)` : ''}` }
    : q.status === 'open'
    ? { label: 'Not charged', color: 'blue', detail: 'Your card will only be charged when an expert claims this question' }
    : q.status === 'expired'
    ? { label: 'Not charged', color: 'gray', detail: 'Question expired — you were not charged' }
    : { label: 'Pending', color: 'gray', detail: 'Payment pending' };
  const statusColors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/marketplace/qa"
            className="flex items-center gap-1.5 text-sm text-[#5D7B93] hover:text-[#4A6578] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Q&A
          </Link>
          <div className="flex items-center gap-2">
            {/* Mode badge */}
            {question.questionMode === 'direct' ? (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                <Target size={12} />
                Direct
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-[#E8DFD0] text-[#7D6B5D] rounded-full font-medium">
                <Users size={12} />
                Pool
              </span>
            )}
            {/* Status badges */}
            {question.status === 'expired' && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                <XCircle size={12} />
                Expired
              </span>
            )}
            {question.refundId && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                <RotateCcw size={12} />
                Refunded
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {/* Test mode banner */}
        {isTestPayment && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2">
            <Zap size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Test Mode — This question uses fake payments. No real money was charged.
            </p>
          </div>
        )}

        {/* Payment status card (DIYer only) */}
        {isDIYer && (
          <div className={`border rounded-lg p-4 ${statusColors[paymentStatus.color]}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {paymentStatus.color === 'blue' ? (
                  <Shield size={16} />
                ) : paymentStatus.color === 'green' ? (
                  <RotateCcw size={16} />
                ) : (
                  <DollarSign size={16} />
                )}
                <span className="text-sm font-semibold">{paymentStatus.label}</span>
              </div>
              {!isFree && question.priceCents > 0 && (
                <span className="text-sm font-bold">${(question.priceCents / 100).toFixed(2)}</span>
              )}
            </div>
            <p className="text-xs mt-1 opacity-80">{paymentStatus.detail}</p>
            {isTestPayment && question.paymentIntentId && (
              <p className="text-xs mt-1 font-mono opacity-60">ID: {question.paymentIntentId}</p>
            )}
          </div>
        )}

        {/* Credit notice after not-helpful */}
        {showCreditNotice && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium">
              Platform credit has been added to your account.
            </p>
            <CreditBalance className="mt-2" showZero />
          </div>
        )}

        {isDIYer && (
          <>
            <QAAnswerView
              question={question}
              onAccept={question.status === 'answered' ? handleAccept : undefined}
              onReview={question.status === 'accepted' && !question.markedNotHelpful ? () => setShowReview(true) : undefined}
              onNotHelpful={question.status === 'answered' ? handleNotHelpful : undefined}
            />
            {showReview && question.expertId && (
              <ReviewForm
                expertId={question.expertId}
                questionId={question.id}
                onSuccess={() => {
                  setShowReview(false);
                  fetchQuestion();
                }}
              />
            )}
          </>
        )}

        {isExpert && question.status === 'claimed' && (
          <>
            <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#7D6B5D] mb-2">Question</h3>
              <p className="text-sm text-[#3E2723]">{question.questionText}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-block text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
                  {question.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-[#7D6B5D]">
                  <Clock size={12} />
                  You have 2 hours to answer
                </span>
              </div>
            </div>
            <QAAnswerForm
              questionId={question.id}
              onSuccess={() => fetchQuestion()}
            />
          </>
        )}

        {!isDIYer && !isExpert && (
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#7D6B5D] mb-2">Question</h3>
            <p className="text-sm text-[#3E2723]">{question.questionText}</p>
          </div>
        )}
      </main>
    </div>
  );
}
