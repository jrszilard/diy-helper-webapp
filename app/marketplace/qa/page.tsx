'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import QASubmitForm from '@/components/marketplace/QASubmitForm';
import QAQuestionList from '@/components/marketplace/QAQuestionList';
import type { QAQuestion } from '@/lib/marketplace/types';

function QAPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId') || undefined;
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [reportContext, setReportContext] = useState<{ projectSummary?: string; projectType?: string } | undefined>();
  const [myQuestions, setMyQuestions] = useState<QAQuestion[]>([]);

  const fetchMyQuestions = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/qa?mine=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyQuestions(data.questions || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/chat');
        return;
      }
      setAuthenticated(true);

      // Fetch report context if reportId provided
      if (reportId) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const res = await fetch(`/api/reports/${reportId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setReportContext({
              projectSummary: data.report?.summary,
              projectType: data.report?.title,
            });
          }
        } catch {
          // no context, that's ok
        }
      }

      await fetchMyQuestions();
      setLoading(false);
    }
    init();
  }, [router, reportId, fetchMyQuestions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!authenticated) return null;

  const handleSuccess = (questionId: string) => {
    router.push(`/marketplace/qa/${questionId}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-sm text-[#5D7B93] hover:text-[#4A6578] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <QASubmitForm
          reportId={reportId}
          reportContext={reportContext}
          onSuccess={handleSuccess}
        />

        {myQuestions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[#3E2723] mb-4">Your Questions</h2>
            <QAQuestionList questions={myQuestions} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function QAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    }>
      <QAPageContent />
    </Suspense>
  );
}
