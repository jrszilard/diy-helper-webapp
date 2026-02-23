'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import type { QAQuestion } from '@/lib/marketplace/types';
import QAQuestionCard from './QAQuestionCard';

interface QAQueueProps {
  questions: QAQuestion[];
  onClaim: (id: string) => void;
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

export default function QAQueue({ questions, onClaim }: QAQueueProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? questions
    : questions.filter(q => q.category === activeFilter);

  return (
    <div>
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
                createdAt: q.createdAt,
                photoUrls: q.photoUrls,
                aiContext: q.aiContext,
              }}
              showClaim
              onClaim={() => onClaim(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
