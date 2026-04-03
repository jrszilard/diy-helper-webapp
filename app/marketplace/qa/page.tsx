'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { MessageSquare } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import DIYerHeader from '@/components/DIYerHeader';
import QASubmitForm from '@/components/marketplace/QASubmitForm';
import QAQuestionList from '@/components/marketplace/QAQuestionList';
import SectionHeader from '@/components/ui/SectionHeader';
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

  const showSubmitForm = !!(reportId || targetExpertId || initialQuestion);

  const handleSuccess = (questionId: string) => {
    router.push(`/marketplace/qa/${questionId}`);
  };

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {showSubmitForm && (
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
        )}

        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-white/50" />
              My Questions
            </h1>
            <Link
              href="/?tab=expert"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-terracotta hover:bg-terracotta/80 text-white rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask a Question
            </Link>
          </div>
          {myQuestions.length > 0 ? (
            <QAQuestionList questions={myQuestions} />
          ) : (
            <div className="text-center py-16 text-white/40">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-4">No questions yet. Connect with a verified expert to get started.</p>
              <Link
                href="/?tab=expert"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-terracotta hover:bg-terracotta/80 text-white rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Talk to a Pro
              </Link>
            </div>
          )}
        </div>
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
