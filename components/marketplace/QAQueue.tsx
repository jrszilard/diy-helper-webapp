'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import type { QAQuestion } from '@/lib/marketplace/types';
import QAQuestionCard from './QAQuestionCard';

interface QAQueueProps {
  questions: QAQuestion[];
  onClaim: (id: string) => void;
  onBid?: (id: string) => void;
}

const FILTER_OPTIONS = [
  'all',
  'electrical',
  'plumbing',
  'hvac',
  'carpentry',
  'flooring',
  'roofing',
  'concrete',
  'drywall',
  'painting',
  'tile',
  'landscaping',
  'general',
];

export default function QAQueue({ questions, onClaim, onBid }: QAQueueProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const filtered = activeFilter === 'all'
    ? questions
    : questions.filter(q => q.category === activeFilter);

  const handleClaim = async (questionId: string) => {
    setClaimingId(questionId);
    await onClaim(questionId);
    setClaimingId(null);
  };

  return (
    <div>
      {/* Info banner */}
      <Alert variant="info" className="mb-4">
        <span className="font-semibold">Charge on Claim</span> — When you claim a question, the DIYer&apos;s card is charged and you have 2 hours to answer. If you don&apos;t answer in time, they&apos;re automatically refunded.
      </Alert>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-earth-brown flex-shrink-0" />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map(opt => (
            <Button
              key={opt}
              variant={activeFilter === opt ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setActiveFilter(opt)}
              className="whitespace-nowrap rounded-full"
            >
              {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState description="No questions match your filter" className="py-12" />
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <QAQuestionCard
              key={q.id}
              question={{
                id: q.id,
                questionText: q.questionText,
                category: q.category,
                priceCents: q.priceCents,
                expertPayoutCents: q.expertPayoutCents,
                createdAt: q.createdAt,
                photoUrls: q.photoUrls,
                aiContext: q.aiContext,
                questionMode: q.questionMode,
                priceTier: q.priceTier ?? undefined,
                difficultyScore: q.difficultyScore ?? undefined,
                pricingMode: q.pricingMode,
                bidCount: q.bidCount,
                bidDeadline: q.bidDeadline,
              }}
              showClaim
              onClaim={() => handleClaim(q.id)}
              onBid={onBid ? () => onBid(q.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
