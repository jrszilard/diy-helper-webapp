'use client';

import Link from 'next/link';
import { Clock, CheckCircle2, MessageSquare, UserCheck, XCircle, RotateCcw, Target } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import type { QAQuestion } from '@/lib/marketplace/types';

interface QAQuestionListProps {
  questions: QAQuestion[];
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  open: { label: 'Open', bg: 'bg-slate-blue/10', text: 'text-slate-blue', icon: <Clock size={12} /> },
  claimed: { label: 'Claimed', bg: 'bg-amber-100', text: 'text-amber-700', icon: <UserCheck size={12} /> },
  answered: { label: 'Answered', bg: 'bg-forest-green/10', text: 'text-forest-green', icon: <MessageSquare size={12} /> },
  accepted: { label: 'Accepted', bg: 'bg-forest-green/10', text: 'text-forest-green', icon: <CheckCircle2 size={12} /> },
  expired: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} /> },
};

export default function QAQuestionList({ questions }: QAQuestionListProps) {
  if (questions.length === 0) {
    return <EmptyState icon={MessageSquare} size="sm" description="You haven't asked any questions yet" className="py-12" />;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-2">
      {questions.map(q => {
        const style = STATUS_STYLES[q.status] || STATUS_STYLES.open;
        const isDirect = q.questionMode === 'direct';
        const isRefunded = !!q.refundId;

        return (
          <Link
            key={q.id}
            href={`/marketplace/qa/${q.id}`}
            className="block bg-white border border-earth-sand rounded-lg p-4 hover:bg-earth-tan/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">{q.questionText}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-slate-blue/10 text-slate-blue rounded-full font-medium">
                    {q.category}
                  </span>
                  {isDirect && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                      <Target size={10} />
                      Direct
                    </span>
                  )}
                  {isRefunded && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                      <RotateCcw size={10} />
                      Refunded
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">{formatDate(q.createdAt)}</span>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text} whitespace-nowrap`}>
                {style.icon}
                {style.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
