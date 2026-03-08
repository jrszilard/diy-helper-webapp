'use client';

import { useState } from 'react';
import { Filter, DollarSign, Zap } from 'lucide-react';
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
      <div className="mb-4 p-3 bg-[#5D7B93]/5 border border-[#5D7B93]/20 rounded-lg flex items-start gap-2">
        <DollarSign size={16} className="text-[#5D7B93] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[#5D7B93] font-semibold">Charge on Claim</p>
          <p className="text-xs text-[#5D7B93]">
            When you claim a question, the DIYer&apos;s card is charged and you have 2 hours to answer.
            If you don&apos;t answer in time, they&apos;re automatically refunded.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-[#7D6B5D]" />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === opt
                  ? 'bg-[#C67B5C] text-white'
                  : 'bg-[#E8DFD0] text-[#7D6B5D] hover:bg-[#D4C8B8]'
              }`}
            >
              {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[#7D6B5D]">No questions match your filter</p>
        </div>
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
