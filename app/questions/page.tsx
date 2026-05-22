'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import QAQuestionList from '@/components/marketplace/QAQuestionList';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { HelpCircle } from 'lucide-react';
import type { QAQuestion } from '@/lib/marketplace/types';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) { setLoading(false); return; }
      setAuthed(true);
      try {
        const res = await fetch('/api/qa?mine=true', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-earth-night flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="font-serif font-normal text-2xl text-white">My Questions</h1>
          {!loading && authed && (
            <span className="text-sm text-white/40">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : !authed ? (
          <EmptyState icon={HelpCircle} title="Sign in to view your questions" description="Questions you ask experts will appear here" className="py-16" />
        ) : (
          <QAQuestionList questions={questions} />
        )}
      </main>
    </div>
  );
}
