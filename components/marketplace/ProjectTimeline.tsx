'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, MessageCircle, CheckCircle, PenLine, StickyNote,
  ArrowUpRight, Users, Clock,
} from 'lucide-react';
import Link from 'next/link';

interface TimelineEvent {
  type: 'question' | 'answer' | 'correction' | 'note' | 'graduation' | 'second_opinion';
  date: string;
  title: string;
  detail: string | null;
  questionId?: string;
  expertName?: string;
}

interface TimelineStats {
  totalQuestions: number;
  totalAnswers: number;
  totalCorrections: number;
  totalNotes: number;
  totalGraduations: number;
  totalSecondOpinions: number;
}

interface ProjectTimelineProps {
  reportId: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  question: <MessageCircle size={14} />,
  answer: <CheckCircle size={14} />,
  correction: <PenLine size={14} />,
  note: <StickyNote size={14} />,
  graduation: <ArrowUpRight size={14} />,
  second_opinion: <Users size={14} />,
};

const EVENT_COLORS: Record<string, string> = {
  question: 'bg-[#5D7B93] text-white',
  answer: 'bg-[#4A7C59] text-white',
  correction: 'bg-[#C67B5C] text-white',
  note: 'bg-[#7D6B5D] text-white',
  graduation: 'bg-[#8B5CF6] text-white',
  second_opinion: 'bg-[#5D7B93] text-white',
};

export default function ProjectTimeline({ reportId }: ProjectTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/reports/${reportId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Failed to load timeline');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || null);
    } catch {
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#5D7B93]" />
      </div>
    );
  }

  if (error || events.length === 0) {
    return null; // Don't show the timeline if there's no Q&A activity
  }

  const totalActivity = (stats?.totalQuestions || 0) + (stats?.totalCorrections || 0) + (stats?.totalSecondOpinions || 0);

  return (
    <div className="bg-white rounded-lg border border-[#D4C8B8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#3E2723] flex items-center gap-2">
          <Clock size={16} className="text-[#5D7B93]" />
          Expert Activity Timeline
        </h3>
        {stats && totalActivity > 0 && (
          <span className="text-xs text-[#7D6B5D]">
            {stats.totalQuestions} {stats.totalQuestions === 1 ? 'consultation' : 'consultations'}
            {stats.totalCorrections > 0 && `, ${stats.totalCorrections} ${stats.totalCorrections === 1 ? 'correction' : 'corrections'}`}
            {stats.totalSecondOpinions > 0 && `, ${stats.totalSecondOpinions} second ${stats.totalSecondOpinions === 1 ? 'opinion' : 'opinions'}`}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#D4C8B8]" />

        <div className="space-y-4">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-start gap-3 relative">
              {/* Icon dot */}
              <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${EVENT_COLORS[event.type] || 'bg-[#7D6B5D] text-white'}`}>
                {EVENT_ICONS[event.type] || <MessageCircle size={14} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#3E2723]">{event.title}</span>
                  {event.expertName && (
                    <span className="text-xs text-[#5D7B93]">by {event.expertName}</span>
                  )}
                </div>
                {event.detail && (
                  <p className="text-xs text-[#7D6B5D] mt-0.5 line-clamp-2">{event.detail}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#B0A696]">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                  {event.questionId && (
                    <Link
                      href={`/marketplace/qa/${event.questionId}`}
                      className="text-[10px] text-[#5D7B93] hover:underline"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
