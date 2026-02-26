'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Inbox, ClipboardList, X } from 'lucide-react';
import QAQueue from '@/components/marketplace/QAQueue';
import ActiveQuestionCard from '@/components/marketplace/ActiveQuestionCard';
import type { QAQuestion } from '@/lib/marketplace/types';

interface ActiveQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents: number;
  status: 'claimed' | 'answered';
  claimedAt: string | null;
  claimExpiresAt: string | null;
  answeredAt: string | null;
  answerText: string | null;
  photoUrls?: string[];
  aiContext?: { projectSummary?: string } | null;
  diyerCity?: string | null;
  diyerState?: string | null;
  createdAt: string;
}

export default function ExpertQAQueuePage() {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModalQuestionId, setBidModalQuestionId] = useState<string | null>(null);
  const [bidPitch, setBidPitch] = useState('');
  const [bidPriceDollars, setBidPriceDollars] = useState('');
  const [bidEstMinutes, setBidEstMinutes] = useState('');
  const [bidExperience, setBidExperience] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const getToken = async () => {
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchQuestions = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [queueRes, activeRes] = await Promise.all([
        fetch('/api/qa/queue', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/qa/queue/active', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (queueRes.ok) {
        const data = await queueRes.json();
        setQuestions(data.questions || []);
      }
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveQuestions(data.questions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleClaim = async (questionId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/qa/${questionId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Remove from open queue
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        // Refresh active questions to pick up the newly claimed one
        const activeRes = await fetch('/api/qa/queue/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (activeRes.ok) {
          const data = await activeRes.json();
          setActiveQuestions(data.questions || []);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleAnswer = async (questionId: string, answerText: string): Promise<boolean> => {
    try {
      const token = await getToken();
      if (!token) return false;

      const res = await fetch(`/api/qa/${questionId}/answer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answerText }),
      });

      if (res.ok) {
        // Update local state to reflect answered status
        setActiveQuestions(prev =>
          prev.map(q =>
            q.id === questionId
              ? { ...q, status: 'answered' as const, answerText, answeredAt: new Date().toISOString() }
              : q
          )
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleOpenBidModal = (questionId: string) => {
    setBidModalQuestionId(questionId);
    setBidPitch('');
    setBidPriceDollars('');
    setBidEstMinutes('');
    setBidExperience('');
    setBidError(null);
  };

  const handleSubmitBid = async () => {
    if (!bidModalQuestionId || !bidPitch.trim() || !bidPriceDollars) return;
    setBidSubmitting(true);
    setBidError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const priceCents = Math.round(parseFloat(bidPriceDollars) * 100);
      const res = await fetch(`/api/qa/${bidModalQuestionId}/bids`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposedPriceCents: priceCents,
          pitch: bidPitch.trim(),
          estimatedMinutes: bidEstMinutes ? parseInt(bidEstMinutes) : null,
          relevantExperience: bidExperience.trim() || null,
        }),
      });

      if (res.ok) {
        setBidModalQuestionId(null);
        // Remove from queue (expert already bid)
        setQuestions(prev => prev.filter(q => q.id !== bidModalQuestionId));
      } else {
        const data = await res.json();
        setBidError(data.error || 'Failed to submit bid');
      }
    } catch {
      setBidError('Failed to submit bid');
    } finally {
      setBidSubmitting(false);
    }
  };

  const bidModalQuestion = bidModalQuestionId
    ? questions.find(q => q.id === bidModalQuestionId)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  const claimedQuestions = activeQuestions.filter(q => q.status === 'claimed');
  const answeredQuestions = activeQuestions.filter(q => q.status === 'answered');

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-[#3E2723] mb-6">Q&A Queue</h1>

      {/* Active Questions Section */}
      {activeQuestions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={18} className="text-[#C67B5C]" />
            <h2 className="text-lg font-semibold text-[#3E2723]">
              Your Active Questions
              <span className="ml-2 text-sm font-normal text-[#7D6B5D]">
                ({claimedQuestions.length} to answer{answeredQuestions.length > 0 ? `, ${answeredQuestions.length} answered` : ''})
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {activeQuestions.map(q => (
              <ActiveQuestionCard
                key={q.id}
                question={q}
                onAnswer={handleAnswer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Open Queue Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Inbox size={18} className="text-[#5D7B93]" />
          <h2 className="text-lg font-semibold text-[#3E2723]">
            Open Questions
            <span className="ml-2 text-sm font-normal text-[#7D6B5D]">
              ({questions.length} available)
            </span>
          </h2>
        </div>
        <QAQueue questions={questions} onClaim={handleClaim} onBid={handleOpenBidModal} />
      </div>

      {/* Bid Submission Modal */}
      {bidModalQuestionId && bidModalQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#D4C8B8]">
              <h3 className="text-lg font-bold text-[#3E2723]">Submit Proposal</h3>
              <button onClick={() => setBidModalQuestionId(null)} className="text-[#7D6B5D] hover:text-[#3E2723]">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Question preview */}
              <div className="bg-[#E8DFD0]/30 rounded-lg p-3">
                <p className="text-sm text-[#3E2723] line-clamp-3">{bidModalQuestion.questionText}</p>
                <span className="text-xs text-[#7D6B5D] mt-1 inline-block">{bidModalQuestion.category}</span>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">
                  Your Price ($15 – $150)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6B5D]">$</span>
                  <input
                    type="number"
                    min="15"
                    max="150"
                    step="5"
                    value={bidPriceDollars}
                    onChange={(e) => setBidPriceDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/40"
                    placeholder="45"
                  />
                </div>
                {bidPriceDollars && (
                  <p className="text-xs text-[#7D6B5D] mt-1">
                    DIYer pays ${bidPriceDollars} · You earn ${(parseFloat(bidPriceDollars || '0') * 0.82).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Pitch */}
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">
                  Your Pitch <span className="text-[#B0A696] font-normal">(why you&apos;re the right expert)</span>
                </label>
                <textarea
                  rows={3}
                  value={bidPitch}
                  onChange={(e) => setBidPitch(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/40 resize-none"
                  placeholder="I've worked on similar projects for 15 years and can help you..."
                />
              </div>

              {/* Estimated time */}
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">
                  Estimated Response Time <span className="text-[#B0A696] font-normal">(minutes, optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={bidEstMinutes}
                  onChange={(e) => setBidEstMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/40"
                  placeholder="15"
                />
              </div>

              {/* Relevant experience */}
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">
                  Relevant Experience <span className="text-[#B0A696] font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={bidExperience}
                  onChange={(e) => setBidExperience(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/40 resize-none"
                  placeholder="Licensed electrician with 20 years of residential experience..."
                />
              </div>

              {bidError && (
                <p className="text-sm text-red-600">{bidError}</p>
              )}

              <button
                onClick={handleSubmitBid}
                disabled={bidSubmitting || !bidPitch.trim() || !bidPriceDollars}
                className="w-full py-3 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors disabled:opacity-50"
              >
                {bidSubmitting ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  'Submit Proposal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
