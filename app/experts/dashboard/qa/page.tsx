'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import SectionHeader from '@/components/ui/SectionHeader';
import Modal from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
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
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  const claimedQuestions = activeQuestions.filter(q => q.status === 'claimed');
  const answeredQuestions = activeQuestions.filter(q => q.status === 'answered');

  return (
    <div className="max-w-4xl">
      <SectionHeader size="lg" title="Q&A Queue" className="mb-6" />

      {/* Active Questions Section */}
      {activeQuestions.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            title="Your Active Questions"
            subtitle={`${claimedQuestions.length} to answer${answeredQuestions.length > 0 ? `, ${answeredQuestions.length} answered` : ''}`}
            className="mb-3"
          />

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
        <SectionHeader
          title="Open Questions"
          subtitle={`${questions.length} available`}
          className="mb-3"
        />
        <QAQueue questions={questions} onClaim={handleClaim} onBid={handleOpenBidModal} />
      </div>

      {/* Bid Submission Modal */}
      <Modal
        isOpen={!!bidModalQuestionId && !!bidModalQuestion}
        onClose={() => setBidModalQuestionId(null)}
        title="Submit Proposal"
        size="lg"
      >
        {bidModalQuestion && (
          <div className="space-y-4">
            {/* Question preview */}
            <div className="bg-earth-tan/30 rounded-lg p-3">
              <p className="text-sm text-foreground line-clamp-3">{bidModalQuestion.questionText}</p>
              <Badge variant="neutral" size="sm" className="mt-1">{bidModalQuestion.category}</Badge>
            </div>

            {/* Price */}
            <TextInput
              label="Your Price ($15 – $150)"
              type="number"
              min={15}
              max={150}
              step={5}
              value={bidPriceDollars}
              onChange={(e) => setBidPriceDollars(e.target.value)}
              placeholder="45"
              fullWidth
            />
            {bidPriceDollars && (
              <p className="text-xs text-earth-brown -mt-2">
                DIYer pays ${bidPriceDollars} · You earn ${(parseFloat(bidPriceDollars || '0') * 0.82).toFixed(2)}
              </p>
            )}

            {/* Pitch */}
            <Textarea
              label="Your Pitch (why you're the right expert)"
              rows={3}
              value={bidPitch}
              onChange={(e) => setBidPitch(e.target.value)}
              placeholder="I've worked on similar projects for 15 years and can help you..."
              resize="none"
              fullWidth
            />

            {/* Estimated time */}
            <TextInput
              label="Estimated Response Time (minutes, optional)"
              type="number"
              min={1}
              max={120}
              value={bidEstMinutes}
              onChange={(e) => setBidEstMinutes(e.target.value)}
              placeholder="15"
              fullWidth
            />

            {/* Relevant experience */}
            <Textarea
              label="Relevant Experience (optional)"
              rows={2}
              value={bidExperience}
              onChange={(e) => setBidExperience(e.target.value)}
              placeholder="Licensed electrician with 20 years of residential experience..."
              resize="none"
              fullWidth
            />

            {bidError && (
              <Alert variant="error">{bidError}</Alert>
            )}

            <Button
              variant="tertiary"
              fullWidth
              size="lg"
              onClick={handleSubmitBid}
              disabled={bidSubmitting || !bidPitch.trim() || !bidPriceDollars}
            >
              {bidSubmitting ? (
                <Spinner size="sm" />
              ) : (
                'Submit Proposal'
              )}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
