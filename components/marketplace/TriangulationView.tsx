'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Star, CheckCircle, ArrowRight } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

interface ExpertAnswer {
  expertId: string | null;
  expertName: string;
  expertRating: number;
  expertReviews: number;
  answerText: string | null;
  status: string;
  questionId: string;
  isOriginal: boolean;
}

interface TriangulationViewProps {
  parentQuestionId: string;
  secondOpinionId: string | null;
  originalExpertName: string;
  originalExpertRating: number;
  originalExpertReviews: number;
  originalAnswerText: string | null;
  originalStatus: string;
  onRequestSecondOpinion: () => Promise<void>;
  canRequest: boolean;
}

export default function TriangulationView({
  parentQuestionId,
  secondOpinionId,
  originalExpertName,
  originalExpertRating,
  originalExpertReviews,
  originalAnswerText,
  originalStatus,
  onRequestSecondOpinion,
  canRequest,
}: TriangulationViewProps) {
  const [secondAnswer, setSecondAnswer] = useState<ExpertAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const fetchSecondOpinion = useCallback(async () => {
    if (!secondOpinionId) return;
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/qa/${secondOpinionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const q = data.question;
        const expert = data.question?.expert;
        setSecondAnswer({
          expertId: q.expertId,
          expertName: expert?.displayName || 'Expert',
          expertRating: expert?.avgRating || 0,
          expertReviews: expert?.totalReviews || 0,
          answerText: q.answerText,
          status: q.status,
          questionId: q.id,
          isOriginal: false,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [secondOpinionId]);

  useEffect(() => {
    if (secondOpinionId) {
      fetchSecondOpinion();
    }
  }, [secondOpinionId, fetchSecondOpinion]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await onRequestSecondOpinion();
    } finally {
      setRequesting(false);
    }
  };

  // No second opinion yet — show request button
  if (!secondOpinionId) {
    if (!canRequest) return null;

    return (
      <div className="bg-white border border-slate-blue/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users size={20} className="text-slate-blue flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Get a Second Opinion</h3>
            <p className="text-xs text-earth-brown mt-1">
              Want another expert&apos;s perspective? A second expert will see your question, project context,
              and the first expert&apos;s answer — then provide their own independent assessment.
            </p>
            <p className="text-xs text-slate-blue font-medium mt-2">
              Two expert opinions for less than one service call — $15
            </p>
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="mt-3 px-4 py-2 bg-slate-blue text-white text-sm font-semibold rounded-lg hover:bg-slate-blue-dark transition-colors disabled:opacity-50"
            >
              {requesting ? (
                <Spinner size="sm" />
              ) : (
                'Request Second Opinion — $15'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading second opinion
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner className="text-slate-blue" />
      </div>
    );
  }

  // Show side-by-side comparison
  return (
    <div className="bg-white border border-earth-sand rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users size={16} className="text-slate-blue" />
        Expert Opinions ({secondAnswer?.answerText ? '2' : '1 of 2'})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original expert */}
        <div className="border border-earth-sand rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-earth-brown bg-earth-tan px-2 py-0.5 rounded-full">
              Expert 1
            </span>
            <span className="text-sm font-semibold text-foreground">{originalExpertName}</span>
            {originalExpertRating > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-earth-brown">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                {originalExpertRating.toFixed(1)}
              </span>
            )}
          </div>
          {originalAnswerText ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{originalAnswerText}</p>
          ) : (
            <p className="text-sm text-earth-brown italic">
              {['in_conversation', 'resolve_proposed'].includes(originalStatus)
                ? 'Conversation in progress...'
                : 'Answer pending...'}
            </p>
          )}
        </div>

        {/* Second expert */}
        <div className={`border rounded-lg p-3 ${
          secondAnswer?.answerText
            ? 'border-slate-blue/30 bg-slate-blue/5'
            : 'border-dashed border-earth-sand'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-blue bg-slate-blue/10 px-2 py-0.5 rounded-full">
              Expert 2
            </span>
            {secondAnswer?.expertId ? (
              <>
                <span className="text-sm font-semibold text-foreground">{secondAnswer.expertName}</span>
                {secondAnswer.expertRating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-earth-brown">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    {secondAnswer.expertRating.toFixed(1)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-earth-brown">Awaiting expert...</span>
            )}
          </div>
          {secondAnswer?.answerText ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{secondAnswer.answerText}</p>
          ) : secondAnswer?.status === 'claimed' || secondAnswer?.status === 'in_conversation' ? (
            <p className="text-sm text-earth-brown italic">Expert is working on their response...</p>
          ) : (
            <p className="text-sm text-[var(--muted)] italic">Waiting for a second expert to claim this question.</p>
          )}
        </div>
      </div>

      {/* Link to full second opinion detail */}
      {secondOpinionId && (
        <Link
          href={`/marketplace/qa/${secondOpinionId}`}
          className="flex items-center gap-1 text-xs text-slate-blue hover:underline mt-3"
        >
          View full second opinion details
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
