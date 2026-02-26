'use client';

import { Clock, DollarSign, Image, Target, Users, Gavel } from 'lucide-react';

interface QAQuestionCardProps {
  question: {
    id: string;
    questionText: string;
    category: string;
    priceCents: number;
    platformFeeCents?: number;
    expertPayoutCents?: number;
    createdAt: string;
    photoUrls?: string[];
    aiContext?: { projectSummary?: string } | null;
    questionMode?: 'pool' | 'direct';
    priceTier?: string;
    difficultyScore?: number;
    pricingMode?: 'fixed' | 'bidding';
    bidCount?: number;
    bidDeadline?: string | null;
  };
  onClaim?: () => void;
  onBid?: () => void;
  showClaim?: boolean;
}

export default function QAQuestionCard({ question, onClaim, onBid, showClaim = false }: QAQuestionCardProps) {
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

  const isDirect = question.questionMode === 'direct';
  const isBidding = question.pricingMode === 'bidding';
  const isFree = question.priceCents === 0;
  const expertEarnings = question.expertPayoutCents
    ? (question.expertPayoutCents / 100).toFixed(2)
    : null;
  const tierLabel = question.priceTier
    ? question.priceTier.charAt(0).toUpperCase() + question.priceTier.slice(1)
    : null;

  // Estimate response time based on difficulty
  const estMinutes = (question.difficultyScore ?? 3) <= 3 ? '~5 min' : (question.difficultyScore ?? 5) <= 6 ? '~10 min' : '~15 min';

  // Bid deadline countdown
  const bidTimeLeft = isBidding && question.bidDeadline
    ? Math.max(0, new Date(question.bidDeadline).getTime() - Date.now())
    : 0;
  const bidHoursLeft = Math.floor(bidTimeLeft / (60 * 60 * 1000));
  const bidMinsLeft = Math.floor((bidTimeLeft % (60 * 60 * 1000)) / (60 * 1000));

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

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
              {question.category}
            </span>
            {tierLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                question.priceTier === 'specialist'
                  ? 'bg-[#C67B5C]/10 text-[#C67B5C]'
                  : question.priceTier === 'complex'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#E8DFD0] text-[#7D6B5D]'
              }`}>
                {tierLabel}
              </span>
            )}
            {isBidding && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[#C67B5C]/10 text-[#C67B5C] rounded-full font-medium">
                <Gavel size={10} />
                Bidding{question.bidCount ? ` · ${question.bidCount} bid${question.bidCount !== 1 ? 's' : ''}` : ''}
              </span>
            )}
            {isDirect ? (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                <Target size={10} />
                Direct
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[#E8DFD0] text-[#7D6B5D] rounded-full font-medium">
                <Users size={10} />
                Pool
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[#B0A696]">
              <Clock size={12} />
              {formatTimeAgo(question.createdAt)}
            </span>
          </div>
        </div>

        {showClaim && (isBidding ? onBid : onClaim) && (
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {isBidding ? (
              <>
                {/* Bidding mode: show reference price + deadline */}
                <div className="text-right">
                  <span className="text-xs font-medium text-[#C67B5C]">Specialist</span>
                  {bidTimeLeft > 0 && (
                    <p className="text-[10px] text-[#7D6B5D]">
                      {bidHoursLeft > 0 ? `${bidHoursLeft}h ` : ''}{bidMinsLeft}m left
                    </p>
                  )}
                  {bidTimeLeft === 0 && question.bidDeadline && (
                    <p className="text-[10px] text-red-500">Deadline passed</p>
                  )}
                </div>
                <button
                  onClick={onBid}
                  className="px-4 py-2 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors whitespace-nowrap"
                >
                  Submit Proposal
                </button>
              </>
            ) : (
              <>
                {/* Fixed mode: show earnings + claim button */}
                {!isFree && expertEarnings && (
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#4A7C59]">${expertEarnings}</span>
                    <p className="text-[10px] text-[#7D6B5D]">You earn · Est. {estMinutes}</p>
                  </div>
                )}
                {isFree && (
                  <span className="text-xs font-medium text-[#7D6B5D]">Free question</span>
                )}
                <button
                  onClick={onClaim}
                  className="px-4 py-2 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors whitespace-nowrap"
                >
                  Claim
                </button>
              </>
            )}
          </div>
        )}

        {/* Non-claim view: still show price */}
        {!showClaim && !isFree && (
          <div className="flex-shrink-0">
            <span className="flex items-center gap-1 text-sm font-bold text-[#4A7C59]">
              <DollarSign size={14} />
              {expertEarnings || (question.priceCents / 100).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
