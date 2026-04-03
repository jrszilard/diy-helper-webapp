'use client';

import { Clock, DollarSign, Image, Target, Gavel } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

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
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-3">{question.questionText}</p>

          {question.aiContext?.projectSummary && (
            <div className="mt-2 bg-earth-tan/30 rounded px-2 py-1.5">
              <p className="text-xs text-earth-brown">
                <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
              </p>
            </div>
          )}

          {question.photoUrls && question.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Image size={12} className="text-earth-brown" />
              <span className="text-xs text-earth-brown">
                {question.photoUrls.length} photo{question.photoUrls.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge>{question.category}</Badge>
            {isFree ? (
              <Badge variant="neutral">Free — First Question</Badge>
            ) : (
              <>
                {tierLabel && question.priceTier !== 'standard' && (
                  <Badge variant={
                    question.priceTier === 'specialist' ? 'primary'
                    : question.priceTier === 'complex' ? 'warning'
                    : 'neutral'
                  }>
                    {tierLabel}
                  </Badge>
                )}
                {isBidding && (
                  <Badge variant="primary" icon={Gavel}>
                    Bidding{question.bidCount ? ` · ${question.bidCount} bid${question.bidCount !== 1 ? 's' : ''}` : ''}
                  </Badge>
                )}
                {isDirect && (
                  <Badge variant="purple" icon={Target}>Direct</Badge>
                )}
                {!isBidding && expertEarnings && (
                  <Badge variant="success" icon={DollarSign}>
                    ${expertEarnings} payout
                  </Badge>
                )}
              </>
            )}
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
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
                  <span className="text-xs font-medium text-terracotta">Specialist</span>
                  {bidTimeLeft > 0 && (
                    <p className="text-[10px] text-earth-brown">
                      {bidHoursLeft > 0 ? `${bidHoursLeft}h ` : ''}{bidMinsLeft}m left
                    </p>
                  )}
                  {bidTimeLeft === 0 && question.bidDeadline && (
                    <p className="text-[10px] text-red-500">Deadline passed</p>
                  )}
                </div>
                <Button variant="tertiary" size="sm" onClick={onBid}>
                  Submit Proposal
                </Button>
              </>
            ) : (
              <>
                {/* Fixed mode: show earnings + claim button */}
                {!isFree && expertEarnings && (
                  <div className="text-right">
                    <span className="text-lg font-bold text-forest-green">${expertEarnings}</span>
                    <p className="text-[10px] text-earth-brown">You earn · Est. {estMinutes}</p>
                  </div>
                )}
                {isFree && (
                  <span className="text-xs font-medium text-earth-brown">Free question</span>
                )}
                <Button variant="primary" size="sm" onClick={onClaim}>
                  Claim
                </Button>
              </>
            )}
          </div>
        )}

        {/* Non-claim view: still show price */}
        {!showClaim && !isFree && (
          <div className="flex-shrink-0">
            <span className="flex items-center gap-1 text-sm font-bold text-forest-green">
              <DollarSign size={14} />
              {expertEarnings || (question.priceCents / 100).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
