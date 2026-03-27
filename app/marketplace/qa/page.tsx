'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import DIYerHeader from '@/components/DIYerHeader';
import Button from '@/components/ui/Button';
import QASubmitForm from '@/components/marketplace/QASubmitForm';
import QAQuestionList from '@/components/marketplace/QAQuestionList';
import type { QAQuestion, ExpertContext } from '@/lib/marketplace/types';

function QAPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId') || undefined;
  const targetExpertId = searchParams.get('targetExpertId') || undefined;
  const targetExpertName = searchParams.get('targetExpertName') || undefined;
  // Read prefill from sessionStorage (set by landing page redirect)
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();
  const [initialCategory, setInitialCategory] = useState<string | undefined>();

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('diy-expert-question-draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.question) setInitialQuestion(parsed.question);
        if (parsed.trade) setInitialCategory(parsed.trade);
        sessionStorage.removeItem('diy-expert-question-draft');
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [reportContext, setReportContext] = useState<{ projectSummary?: string; projectType?: string } | undefined>();
  const [expertContext, setExpertContext] = useState<ExpertContext | null>(null);
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
        redirectToSignIn(router, '/marketplace/qa');
        return;
      }
      setAuthenticated(true);

      // Fetch report context if reportId provided
      if (reportId) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const [reportRes, contextRes] = await Promise.all([
            fetch(`/api/reports/${reportId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`/api/reports/${reportId}/context`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (reportRes.ok) {
            const data = await reportRes.json();
            setReportContext({
              projectSummary: data.report?.summary,
              projectType: data.report?.title,
            });
          }
          if (contextRes.ok) {
            const data = await contextRes.json();
            if (data.context) setExpertContext(data.context);
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
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!authenticated) return null;

  const handleSuccess = (questionId: string) => {
    router.push(`/marketplace/qa/${questionId}`);
  };

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Button variant="ghost" href="/chat" leftIcon={ArrowLeft} size="sm" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
          Back to Chat
        </Button>
        <QASubmitForm
          reportId={reportId}
          reportContext={reportContext}
          expertContext={expertContext}
          targetExpertId={targetExpertId}
          targetExpertName={targetExpertName}
          initialQuestion={initialQuestion}
          initialCategory={initialCategory}
          onSuccess={handleSuccess}
        />

        {myQuestions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Questions</h2>
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
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    }>
      <QAPageContent />
    </Suspense>
  );
}
