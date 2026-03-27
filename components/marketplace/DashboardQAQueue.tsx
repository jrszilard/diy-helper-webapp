'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

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
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = currentTime - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-earth-sand">
        <SectionHeader
          size="sm"
          title="Recent Questions"
          action={
            <Button variant="ghost" size="xs" rightIcon={ArrowRight} href="/experts/dashboard/qa">
              View Queue
            </Button>
          }
        />
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          size="sm"
          description="No open questions in your specialties"
          className="py-8"
        />
      ) : (
        <div className="divide-y divide-earth-sand/50">
          {questions.slice(0, 5).map(q => (
            <div key={q.id} className="px-4 py-3 hover:bg-earth-tan/30 transition-colors">
              <p className="text-sm text-foreground line-clamp-2">{q.questionText}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge variant="default" size="sm">{q.category}</Badge>
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
    </Card>
  );
}
