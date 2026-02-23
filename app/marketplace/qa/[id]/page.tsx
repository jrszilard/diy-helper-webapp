'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import QAAnswerView from '@/components/marketplace/QAAnswerView';
import QAAnswerForm from '@/components/marketplace/QAAnswerForm';
import ReviewForm from '@/components/marketplace/ReviewForm';

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
}

export default function QADetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/marketplace/qa"
            className="flex items-center gap-1.5 text-sm text-[#5D7B93] hover:text-[#4A6578] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Q&A
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isDIYer && (
          <>
            <QAAnswerView
              question={question}
              onAccept={question.status === 'answered' ? handleAccept : undefined}
              onReview={question.status === 'accepted' ? () => setShowReview(true) : undefined}
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
              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
                {question.category}
              </span>
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
