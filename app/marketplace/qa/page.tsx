'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';
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
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!authenticated) return null;

  const handleSuccess = (questionId: string) => {
    router.push(`/marketplace/qa/${questionId}`);
  };

  return (
    <div className="min-h-screen bg-earth-cream">
      <header className="bg-surface border-b border-earth-sand shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-sm text-slate-blue hover:text-slate-blue-dark transition-colors"
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
          expertContext={expertContext}
          targetExpertId={targetExpertId}
          targetExpertName={targetExpertName}
          onSuccess={handleSuccess}
        />

        {myQuestions.length > 0 && (
          <div>
            <SectionHeader title="Your Questions" className="mb-4" />
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
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    }>
      <QAPageContent />
    </Suspense>
  );
}
