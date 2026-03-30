'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { MessageSquare } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import DIYerHeader from '@/components/DIYerHeader';
import QAQuestionList from '@/components/marketplace/QAQuestionList';
import type { QAQuestion } from '@/lib/marketplace/types';

function QAPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
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
      await fetchMyQuestions();
      setLoading(false);
    }
    init();
  }, [router, fetchMyQuestions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-white/50" />
          My Questions
        </h1>
        {myQuestions.length > 0 ? (
          <QAQuestionList questions={myQuestions} />
        ) : (
          <div className="text-center py-16 text-white/40">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No questions yet. Ask an expert from the home page.</p>
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
