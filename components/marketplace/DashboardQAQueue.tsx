'use client';

import { useState } from 'react';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface QueueQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents?: number;
  createdAt: string;
}

interface DashboardQAQueueProps {
  questions: QueueQuestion[];
}

export default function DashboardQAQueue({ questions }: DashboardQAQueueProps) {
  const [now] = useState(() => Date.now());
  const formatTimeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white/5 border border-white/[0.08] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Recent Questions</span>
        <Button variant="ghost" size="xs" rightIcon={ArrowRight} href="/experts/dashboard/qa"
          className="text-white/50 hover:text-white hover:bg-white/10">
          View Queue
        </Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          size="sm"
          description="No open questions in your specialties"
          className="py-8 text-white/40"
        />
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {questions.map(q => (
            <div key={q.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
              <p className="text-sm text-white/80 line-clamp-2">{q.questionText}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge variant="default" size="sm">{q.category}</Badge>
                {q.priceCents === 0 ? (
                  <span className="text-xs font-medium text-white/30">Free</span>
                ) : (
                  <span className="text-xs font-medium text-forest-green">
                    ${((q.expertPayoutCents ?? q.priceCents) / 100).toFixed(2)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-white/30">
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
