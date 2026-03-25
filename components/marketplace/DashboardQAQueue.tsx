'use client';

import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface QueueQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  createdAt: string;
}

interface DashboardQAQueueProps {
  questions: QueueQuestion[];
}

export default function DashboardQAQueue({ questions }: DashboardQAQueueProps) {
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white border border-earth-sand rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-earth-sand">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-slate-blue" />
          <h3 className="text-sm font-semibold text-foreground">Recent Questions</h3>
        </div>
        <Link
          href="/experts/dashboard/qa"
          className="flex items-center gap-1 text-xs text-slate-blue hover:text-slate-blue-dark font-medium"
        >
          View Queue
          <ArrowRight size={14} />
        </Link>
      </div>

      {questions.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <MessageSquare size={24} className="mx-auto text-earth-sand mb-2" />
          <p className="text-sm text-earth-brown">No open questions in your specialties</p>
        </div>
      ) : (
        <div className="divide-y divide-earth-sand/50">
          {questions.slice(0, 5).map(q => (
            <div key={q.id} className="px-4 py-3 hover:bg-earth-tan/30 transition-colors">
              <p className="text-sm text-foreground line-clamp-2">{q.questionText}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs px-2 py-0.5 bg-slate-blue/10 text-slate-blue rounded-full font-medium">
                  {q.category}
                </span>
                <span className="text-xs font-medium text-forest-green">
                  ${(q.priceCents / 100).toFixed(2)}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <Clock size={12} />
                  {formatTimeAgo(q.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
