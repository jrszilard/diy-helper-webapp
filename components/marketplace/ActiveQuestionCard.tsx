'use client';

import { useState } from 'react';
import { Clock, DollarSign, Image, CheckCircle, Send, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

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

  const isClaimed = question.status === 'claimed';
  const isAnswered = question.status === 'answered';

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

  const getTimeRemaining = () => {
    if (!question.claimExpiresAt) return null;
    const remaining = new Date(question.claimExpiresAt).getTime() - Date.now();
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
    <div className={`bg-white border rounded-lg overflow-hidden ${
      isClaimed ? 'border-[#C67B5C]' : 'border-[#4A7C59]'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#F5F0E6]/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            isClaimed
              ? 'bg-[#C67B5C]/10 text-[#C67B5C]'
              : 'bg-[#4A7C59]/10 text-[#4A7C59]'
          }`}>
            {isClaimed ? 'Claimed' : 'Answered'}
          </span>
          <span className="text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
            {question.category}
          </span>
          <p className="text-sm text-[#3E2723] truncate">{question.questionText}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isClaimed && timeRemaining && (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              isUrgent ? 'text-[#C67B5C]' : 'text-[#7D6B5D]'
            }`}>
              {isUrgent && <AlertTriangle size={12} />}
              <Clock size={12} />
              {timeRemaining}
            </span>
          )}
          {isAnswered && (
            <CheckCircle size={14} className="text-[#4A7C59]" />
          )}
          {expanded ? <ChevronUp size={16} className="text-[#7D6B5D]" /> : <ChevronDown size={16} className="text-[#7D6B5D]" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E8DFD0]">
          {/* Question text */}
          <div className="mt-3">
            <p className="text-sm text-[#3E2723] whitespace-pre-wrap">{question.questionText}</p>
          </div>

          {question.aiContext?.projectSummary && (
            <div className="mt-2 bg-[#E8DFD0]/30 rounded px-3 py-2">
              <p className="text-xs text-[#7D6B5D]">
                <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
              </p>
            </div>
          )}

          {question.photoUrls && question.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Image size={12} className="text-[#7D6B5D]" />
              <span className="text-xs text-[#7D6B5D]">
                {question.photoUrls.length} photo{question.photoUrls.length !== 1 ? 's' : ''} attached
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
              <DollarSign size={12} />
              Your payout: ${(question.expertPayoutCents / 100).toFixed(2)}
            </span>
            {question.diyerCity && question.diyerState && (
              <span className="text-xs text-[#7D6B5D]">
                {question.diyerCity}, {question.diyerState}
              </span>
            )}
            <span className="text-xs text-[#B0A696]">
              Asked {formatTimeAgo(question.createdAt)}
            </span>
          </div>

          {/* Answer form or existing answer */}
          {isClaimed && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">
                Your Answer
              </label>
              <textarea
                value={answerText}
                onChange={(e) => { setAnswerText(e.target.value); setError(''); }}
                rows={5}
                className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white resize-none"
                placeholder="Provide a detailed, helpful answer (min 50 characters)..."
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-[#A89880]">{answerText.length}/2000</p>
                {error && <p className="text-xs text-[#C67B5C] font-medium">{error}</p>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || answerText.length < 50}
                className="mt-2 inline-flex items-center gap-2 bg-[#C67B5C] text-white px-5 py-2 rounded-lg hover:bg-[#A65D3F] font-semibold text-sm disabled:opacity-50 transition"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          )}

          {isAnswered && question.answerText && (
            <div className="mt-4 bg-[#4A7C59]/5 border border-[#4A7C59]/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-[#4A7C59] mb-1">Your Answer</p>
              <p className="text-sm text-[#3E2723] whitespace-pre-wrap">{question.answerText}</p>
              {question.answeredAt && (
                <p className="text-xs text-[#7D6B5D] mt-2">Answered {formatTimeAgo(question.answeredAt)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
