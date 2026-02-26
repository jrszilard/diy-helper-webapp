'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Target, Users, RotateCcw, XCircle, CreditCard, Shield, Zap, DollarSign, Clock, Gavel, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import QAAnswerView from '@/components/marketplace/QAAnswerView';
import QAAnswerForm from '@/components/marketplace/QAAnswerForm';
import ConversationView from '@/components/marketplace/ConversationView';
import CorrectionForm from '@/components/marketplace/CorrectionForm';
import InsightNotesPanel from '@/components/marketplace/InsightNotesPanel';
import BidCard from '@/components/marketplace/BidCard';
import TriangulationView from '@/components/marketplace/TriangulationView';
import ReviewForm from '@/components/marketplace/ReviewForm';
import CreditBalance from '@/components/marketplace/CreditBalance';

interface QuestionDetail {
  id: string;
  diyerUserId: string;
  expertId: string | null;
  reportId: string | null;
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
  isThreaded?: boolean;
  messageCount?: number;
  currentTier?: number;
  tierPayments?: Array<{ tier: number; amount_cents: number; payment_intent_id: string; charged_at: string }>;
  expertNotes?: { toolsNeeded?: string[]; estimatedTime?: string; commonMistakes?: string[]; localCodeNotes?: string; additional?: string } | null;
  pricingMode?: 'fixed' | 'bidding';
  bidDeadline?: string | null;
  bidCount?: number;
  acceptedBidId?: string | null;
  graduatedToRfpId?: string | null;
  parentQuestionId?: string | null;
  isSecondOpinion?: boolean;
}

interface ExpertInfo {
  displayName: string;
  profilePhotoUrl: string | null;
  avgRating: number;
  totalReviews: number;
  responseTimeHours: number | null;
  verificationLevel: number;
  specialties: Array<{ specialty: string; yearsExperience: number | null; isPrimary: boolean }>;
}

export default function QADetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expertInfo, setExpertInfo] = useState<ExpertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [showCreditNotice, setShowCreditNotice] = useState(false);
  const [secondOpinionId, setSecondOpinionId] = useState<string | null>(null);
  const [bids, setBids] = useState<Array<{
    id: string;
    expertId: string;
    proposedPriceCents: number;
    expertPayoutCents: number;
    pitch: string;
    estimatedMinutes: number | null;
    relevantExperience: string | null;
    status: string;
    createdAt: string;
  }>>([]);
  const [bidExperts, setBidExperts] = useState<Record<string, {
    displayName: string;
    profilePhotoUrl: string | null;
    avgRating: number;
    totalReviews: number;
    specialties: Array<{ specialty: string; yearsExperience: number | null; isPrimary: boolean }>;
  }>>({});

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

  // Fetch expert info when question has an expert
  const fetchExpertInfo = useCallback(async (expertId: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/experts/${expertId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const ep = data.expert;
        if (ep) {
          setExpertInfo({
            displayName: ep.displayName || ep.display_name || 'Expert',
            profilePhotoUrl: ep.profilePhotoUrl || ep.profile_photo_url || null,
            avgRating: ep.avgRating || ep.avg_rating || 0,
            totalReviews: ep.totalReviews || ep.total_reviews || 0,
            responseTimeHours: ep.responseTimeHours || ep.response_time_hours || null,
            verificationLevel: ep.verificationLevel || ep.verification_level || 1,
            specialties: ep.specialties || [],
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBids = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/bids`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBids(data.bids || []);
        // Build expert lookup from bids response
        const experts: typeof bidExperts = {};
        for (const bid of data.bids || []) {
          if (bid.expert) {
            experts[bid.expertId] = bid.expert;
          }
        }
        setBidExperts(experts);
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

  // Fetch expert info when question loads with an expert
  useEffect(() => {
    if (question?.expertId) {
      fetchExpertInfo(question.expertId);
    }
  }, [question?.expertId, fetchExpertInfo]);

  // Fetch bids when question is in bidding mode
  useEffect(() => {
    if (question?.pricingMode === 'bidding') {
      fetchBids();
    }
  }, [question?.pricingMode, fetchBids]);

  // Sync second opinion ID from API response
  useEffect(() => {
    if (question && (question as unknown as { secondOpinionId?: string }).secondOpinionId) {
      setSecondOpinionId((question as unknown as { secondOpinionId?: string }).secondOpinionId!);
    }
  }, [question]);

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
  const isThreaded = question.isThreaded || ['in_conversation', 'resolve_proposed'].includes(question.status);
  const isBiddingMode = question.pricingMode === 'bidding';

  const handleSelectBid = async (bidId: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/bids`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'select', bidId }),
      });
      if (res.ok) {
        await fetchQuestion();
        await fetchBids();
      }
    } catch {
      // ignore
    }
  };

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

  const handleRequestSecondOpinion = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/second-opinion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSecondOpinionId(data.secondOpinionId);
        await fetchQuestion();
      }
    } catch {
      // ignore
    }
  };

  const handleGraduateToProject = async () => {
    const title = prompt('Project title (e.g., "Deck repair — needs professional help"):');
    if (!title || title.trim().length < 5) return;

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/qa/${questionId}/graduate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        await fetchQuestion();
      }
    } catch {
      // ignore
    }
  };

  // Can graduate if in conversation state with an assigned expert and not already graduated
  const canGraduate = question.expertId
    && !question.graduatedToRfpId
    && ['claimed', 'answered', 'in_conversation', 'resolve_proposed', 'accepted'].includes(question.status);

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
            {/* Bidding badge */}
            {isBiddingMode && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-[#C67B5C]/10 text-[#C67B5C] rounded-full font-medium">
                <Gavel size={12} />
                Bidding
              </span>
            )}
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
            {(question.currentTier || 1) > 1 && (
              <p className="text-xs mt-1 opacity-80">
                Tier {question.currentTier} &middot; Total: ${(question.priceCents / 100).toFixed(2)}
              </p>
            )}
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

        {/* Question text card (shown for all roles) */}
        <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#7D6B5D] mb-2">Question</h3>
          <p className="text-sm text-[#3E2723]">{question.questionText}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="inline-block text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
              {question.category}
            </span>
            {isExpert && question.status === 'claimed' && !isThreaded && (
              <span className="flex items-center gap-1 text-xs text-[#7D6B5D]">
                <Clock size={12} />
                You have 2 hours to answer
              </span>
            )}
          </div>
        </div>

        {/* Bids section (bidding mode, DIYer view — before expert is selected) */}
        {isBiddingMode && isDIYer && question.status === 'open' && (
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#3E2723] mb-3 flex items-center gap-2">
              <Gavel size={16} className="text-[#C67B5C]" />
              Expert Proposals ({bids.length})
            </h3>
            {bids.length === 0 ? (
              <p className="text-sm text-[#7D6B5D]">
                Waiting for expert proposals. You&apos;ll be notified when experts submit their bids.
              </p>
            ) : (
              <div className="space-y-3">
                {bids.map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    expert={bidExperts[bid.expertId]}
                    canSelect={bid.status === 'pending' && !question.acceptedBidId}
                    onSelect={handleSelectBid}
                    isAccepted={bid.id === question.acceptedBidId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Threaded conversation view */}
        {isThreaded && currentUserId && (isDIYer || isExpert) && (
          <ConversationView
            questionId={question.id}
            currentUserId={currentUserId}
            userRole={isDIYer ? 'diyer' : 'expert'}
            questionStatus={question.status}
            expert={expertInfo || undefined}
            answerText={question.answerText}
            currentTier={question.currentTier || 1}
            onStatusChange={(newStatus) => {
              setQuestion(prev => prev ? { ...prev, status: newStatus } : prev);
              fetchQuestion();
            }}
            onTierChange={(newTier) => {
              setQuestion(prev => prev ? { ...prev, currentTier: newTier } : prev);
              fetchQuestion();
            }}
          />
        )}

        {/* Second opinion / triangulation (DIYer only, non-second-opinion questions) */}
        {isDIYer && !question.isSecondOpinion && question.expertId && expertInfo && (
          <TriangulationView
            parentQuestionId={question.id}
            secondOpinionId={secondOpinionId}
            originalExpertName={expertInfo.displayName}
            originalExpertRating={expertInfo.avgRating}
            originalExpertReviews={expertInfo.totalReviews}
            originalAnswerText={question.answerText}
            originalStatus={question.status}
            onRequestSecondOpinion={handleRequestSecondOpinion}
            canRequest={
              !secondOpinionId &&
              ['answered', 'in_conversation', 'resolve_proposed', 'accepted'].includes(question.status)
            }
          />
        )}

        {/* Expert insight notes & report corrections (threaded questions) */}
        {isThreaded && currentUserId && (isDIYer || isExpert) && question.expertId && (
          <>
            <InsightNotesPanel
              questionId={question.id}
              userRole={isDIYer ? 'diyer' : 'expert'}
            />
            <CorrectionForm
              questionId={question.id}
              userRole={isDIYer ? 'diyer' : 'expert'}
              hasReport={!!question.reportId}
            />
          </>
        )}

        {/* Project graduation */}
        {canGraduate && (isDIYer || isExpert) && (
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#3E2723] mb-2 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-[#5D7B93]" />
              Need Hands-On Help?
            </h3>
            <p className="text-xs text-[#7D6B5D] mb-3">
              If this project needs professional work beyond Q&A advice, graduate it to a project.
              {question.expertId && ' Your current expert gets priority positioning.'}
            </p>
            <button
              onClick={handleGraduateToProject}
              className="px-4 py-2 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors"
            >
              Graduate to Project
            </button>
          </div>
        )}

        {/* Already graduated notice */}
        {question.graduatedToRfpId && (
          <div className="bg-[#5D7B93]/5 border border-[#5D7B93]/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-[#5D7B93]" />
              <p className="text-sm text-[#5D7B93] font-medium">
                This Q&A has been graduated to a project.
              </p>
            </div>
            <Link
              href={`/marketplace/projects/${question.graduatedToRfpId}`}
              className="text-xs text-[#5D7B93] hover:underline mt-1 inline-block"
            >
              View Project &rarr;
            </Link>
          </div>
        )}

        {/* Legacy single-answer view (non-threaded DIYer) */}
        {!isThreaded && isDIYer && (
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

        {/* Legacy expert answer form (non-threaded) */}
        {!isThreaded && isExpert && question.status === 'claimed' && (
          <QAAnswerForm
            questionId={question.id}
            onSuccess={() => fetchQuestion()}
          />
        )}

        {/* Review form (shown after accepted for threaded too) */}
        {isThreaded && isDIYer && question.status === 'accepted' && !question.markedNotHelpful && (
          <>
            {!showReview ? (
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-2 text-sm font-medium text-[#5D7B93] border border-[#D4C8B8] rounded-lg hover:bg-[#E8DFD0]/50 transition-colors"
              >
                Leave a Review
              </button>
            ) : question.expertId && (
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
      </main>
    </div>
  );
}
