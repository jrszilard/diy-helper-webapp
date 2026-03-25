'use client';

import { useState, useEffect } from 'react';
import { Clock, DollarSign, Image, CheckCircle, Send, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface ActiveQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents: number;
  status: 'claimed' | 'answered';
  claimedAt: string | null;
  claimExpiresAt: string | null;
  answeredAt: string | null;
  answerText: string | null;
  photoUrls?: string[];
  aiContext?: { projectSummary?: string } | null;
  diyerCity?: string | null;
  diyerState?: string | null;
  createdAt: string;
}

interface ActiveQuestionCardProps {
  question: ActiveQuestion;
  onAnswer: (questionId: string, answerText: string) => Promise<boolean>;
}

export default function ActiveQuestionCard({ question, onAnswer }: ActiveQuestionCardProps) {
  const [expanded, setExpanded] = useState(question.status === 'claimed');
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isClaimed = question.status === 'claimed';
  const isAnswered = question.status === 'answered';

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

  const getTimeRemaining = () => {
    if (!question.claimExpiresAt) return null;
    const remaining = new Date(question.claimExpiresAt).getTime() - currentTime;
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  const handleSubmit = async () => {
    if (answerText.length < 50) {
      setError('Answer must be at least 50 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    const success = await onAnswer(question.id, answerText);
    if (!success) {
      setError('Failed to submit answer. Please try again.');
    }
    setSubmitting(false);
  };

  const timeRemaining = isClaimed ? getTimeRemaining() : null;
  const isUrgent = timeRemaining && !timeRemaining.includes('h') && timeRemaining !== 'Expired';

  return (
    <Card
      padding="none"
      className={cn('overflow-hidden', isClaimed ? 'border-terracotta' : 'border-forest-green')}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-earth-cream/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge variant={isClaimed ? 'primary' : 'success'}>
            {isClaimed ? 'Claimed' : 'Answered'}
          </Badge>
          <Badge>{question.category}</Badge>
          <p className="text-sm text-foreground truncate">{question.questionText}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isClaimed && timeRemaining && (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              isUrgent ? 'text-terracotta' : 'text-earth-brown'
            }`}>
              {isUrgent && <AlertTriangle size={12} />}
              <Clock size={12} />
              {timeRemaining}
            </span>
          )}
          {isAnswered && (
            <CheckCircle size={14} className="text-forest-green" />
          )}
          {expanded ? <ChevronUp size={16} className="text-earth-brown" /> : <ChevronDown size={16} className="text-earth-brown" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-earth-tan">
          {/* Question text */}
          <div className="mt-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{question.questionText}</p>
          </div>

          {question.aiContext?.projectSummary && (
            <div className="mt-2 bg-earth-tan/30 rounded px-3 py-2">
              <p className="text-xs text-earth-brown">
                <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
              </p>
            </div>
          )}

          {question.photoUrls && question.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Image size={12} className="text-earth-brown" />
              <span className="text-xs text-earth-brown">
                {question.photoUrls.length} photo{question.photoUrls.length !== 1 ? 's' : ''} attached
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1 text-xs font-medium text-forest-green">
              <DollarSign size={12} />
              Your payout: ${(question.expertPayoutCents / 100).toFixed(2)}
            </span>
            {question.diyerCity && question.diyerState && (
              <span className="text-xs text-earth-brown">
                {question.diyerCity}, {question.diyerState}
              </span>
            )}
            <span className="text-xs text-[var(--muted)]">
              Asked {formatTimeAgo(question.createdAt)}
            </span>
          </div>

          {/* Answer form or existing answer */}
          {isClaimed && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Your Answer
              </label>
              <textarea
                value={answerText}
                onChange={(e) => { setAnswerText(e.target.value); setError(''); }}
                rows={5}
                className="w-full border border-earth-sand rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-terracotta bg-white resize-none"
                placeholder="Provide a detailed, helpful answer (min 50 characters)..."
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-earth-brown-light">{answerText.length}/2000</p>
                {error && <p className="text-xs text-terracotta font-medium">{error}</p>}
              </div>
              <Button
                variant="primary"
                leftIcon={submitting ? Loader2 : Send}
                iconSize={16}
                onClick={handleSubmit}
                disabled={submitting || answerText.length < 50}
                className={`mt-2 ${submitting ? '[&>svg:first-child]:animate-spin' : ''}`}
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </div>
          )}

          {isAnswered && question.answerText && (
            <div className="mt-4 bg-forest-green/5 border border-forest-green/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-forest-green mb-1">Your Answer</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{question.answerText}</p>
              {question.answeredAt && (
                <p className="text-xs text-earth-brown mt-2">Answered {formatTimeAgo(question.answeredAt)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
