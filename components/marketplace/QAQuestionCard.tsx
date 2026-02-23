'use client';

import { Clock, DollarSign, Image } from 'lucide-react';

interface QAQuestionCardProps {
  question: {
    id: string;
    questionText: string;
    category: string;
    priceCents: number;
    createdAt: string;
    photoUrls?: string[];
    aiContext?: { projectSummary?: string } | null;
  };
  onClaim?: () => void;
  showClaim?: boolean;
}

export default function QAQuestionCard({ question, onClaim, showClaim = false }: QAQuestionCardProps) {
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
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#3E2723] line-clamp-3">{question.questionText}</p>

          {question.aiContext?.projectSummary && (
            <div className="mt-2 bg-[#E8DFD0]/30 rounded px-2 py-1.5">
              <p className="text-xs text-[#7D6B5D]">
                <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
              </p>
            </div>
          )}

          {question.photoUrls && question.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Image size={12} className="text-[#7D6B5D]" />
              <span className="text-xs text-[#7D6B5D]">
                {question.photoUrls.length} photo{question.photoUrls.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
              {question.category}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
              <DollarSign size={12} />
              {(question.priceCents / 100).toFixed(2)}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#B0A696]">
              <Clock size={12} />
              {formatTimeAgo(question.createdAt)}
            </span>
          </div>
        </div>

        {showClaim && onClaim && (
          <button
            onClick={onClaim}
            className="px-4 py-2 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors whitespace-nowrap flex-shrink-0"
          >
            Claim
          </button>
        )}
      </div>
    </div>
  );
}
