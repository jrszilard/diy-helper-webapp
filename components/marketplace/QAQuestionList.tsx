'use client';

import Link from 'next/link';
import { Clock, CheckCircle2, MessageSquare, UserCheck } from 'lucide-react';
import type { QAQuestion } from '@/lib/marketplace/types';

interface QAQuestionListProps {
  questions: QAQuestion[];
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  open: { label: 'Open', bg: 'bg-[#5D7B93]/10', text: 'text-[#5D7B93]', icon: <Clock size={12} /> },
  claimed: { label: 'Claimed', bg: 'bg-amber-100', text: 'text-amber-700', icon: <UserCheck size={12} /> },
  answered: { label: 'Answered', bg: 'bg-[#4A7C59]/10', text: 'text-[#4A7C59]', icon: <MessageSquare size={12} /> },
  accepted: { label: 'Accepted', bg: 'bg-[#4A7C59]/10', text: 'text-[#4A7C59]', icon: <CheckCircle2 size={12} /> },
};

export default function QAQuestionList({ questions }: QAQuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={32} className="mx-auto text-[#D4C8B8] mb-3" />
        <p className="text-sm text-[#7D6B5D]">You haven&apos;t asked any questions yet</p>
      </div>
    );
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
        return (
          <Link
            key={q.id}
            href={`/marketplace/qa/${q.id}`}
            className="block bg-white border border-[#D4C8B8] rounded-lg p-4 hover:bg-[#E8DFD0]/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#3E2723] line-clamp-2">{q.questionText}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
                    {q.category}
                  </span>
                  <span className="text-xs text-[#B0A696]">{formatDate(q.createdAt)}</span>
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
