'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Inbox, ClipboardList } from 'lucide-react';
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
        <QAQueue questions={questions} onClaim={handleClaim} />
      </div>
    </div>
  );
}
