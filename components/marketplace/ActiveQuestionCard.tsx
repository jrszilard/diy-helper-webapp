'use client';

import { useState } from 'react';
import { Clock, DollarSign, Image, CheckCircle, Send, Loader2, ChevronDown, ChevronUp, AlertTriangle, Flag, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
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
  aiContext?: { projectSummary?: string; aiChatResponse?: string } | null;
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
  const [showAiCorrection, setShowAiCorrection] = useState(false);
  const [aiCorrectionDone, setAiCorrectionDone] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [now] = useState(() => Date.now());

  const isClaimed = question.status === 'claimed';
  const isAnswered = question.status === 'answered';

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

  const getTimeRemaining = () => {
    if (!question.claimExpiresAt) return null;
    const remaining = new Date(question.claimExpiresAt).getTime() - now;
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  const handleAiCorrectionSubmit = async () => {
    if (correctionText.length < 10) return;
    setCorrectionSubmitting(true);
    try {
      const res = await fetch(`/api/qa/${question.id}/ai-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctionText,
          aiResponse: question.aiContext?.aiChatResponse,
        }),
      });
      if (res.ok) {
        setAiCorrectionDone(true);
        setShowAiCorrection(false);
      }
    } catch { /* silent */ }
    setCorrectionSubmitting(false);
  };

  const handleSubmit = async () => {
    if (answerText.length < 50) {
      setError('Answer must be at least 50 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    const success = await onAnswer(question.id, answerText);
    if (!success) setError('Failed to submit answer. Please try again.');
    setSubmitting(false);
  };

  const timeRemaining = isClaimed ? getTimeRemaining() : null;
  const isUrgent = timeRemaining && !timeRemaining.includes('h') && timeRemaining !== 'Expired';

  return (
    <div className={cn(
      'bg-white/5 border rounded-lg overflow-hidden',
      isClaimed ? 'border-rust/50' : 'border-forest-green/40'
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge variant={isClaimed ? 'primary' : 'success'}>
            {isClaimed ? 'Claimed' : 'Answered'}
          </Badge>
          <Badge>{question.category}</Badge>
          <p className="text-sm text-white/70 truncate">{question.questionText}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isClaimed && timeRemaining && (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              isUrgent ? 'text-rust' : 'text-white/40'
            }`}>
              {isUrgent && <AlertTriangle size={12} />}
              <Clock size={12} />
              {timeRemaining}
            </span>
          )}
          {isAnswered && <CheckCircle size={14} className="text-forest-green" />}
          {expanded
            ? <ChevronUp size={16} className="text-white/40" />
            : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.08]">
          <p className="text-sm text-white/80 whitespace-pre-wrap mt-3">{question.questionText}</p>

          {question.aiContext && (
            <div className="mt-2">
              {question.aiContext.projectSummary && (
                <div className="bg-white/5 rounded px-3 py-2">
                  <p className="text-xs text-white/40">
                    <span className="font-medium">AI Context:</span> {question.aiContext.projectSummary}
                  </p>
                </div>
              )}
              {question.aiContext.aiChatResponse && (
                <details className="mt-2 border border-white/[0.08] rounded-lg">
                  <summary className="px-3 py-2 text-xs font-medium text-white/40 cursor-pointer hover:bg-white/5">
                    View AI&apos;s Original Response
                  </summary>
                  <div className="px-3 py-2 border-t border-white/[0.08]">
                    <p className="text-xs text-white/70 whitespace-pre-wrap">{question.aiContext.aiChatResponse}</p>
                    {!aiCorrectionDone && isClaimed && (
                      <button
                        onClick={() => setShowAiCorrection(true)}
                        className="mt-2 text-xs text-rust hover:underline flex items-center gap-1"
                      >
                        <Flag size={12} /> Spot an error? Flag &amp; correct
                      </button>
                    )}
                    {aiCorrectionDone && (
                      <p className="mt-2 text-xs text-forest-green flex items-center gap-1">
                        <CheckCircle2 size={12} /> Correction submitted
                      </p>
                    )}
                  </div>
                </details>
              )}
              {showAiCorrection && (
                <div className="mt-2 bg-amber-900/30 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-300 mb-2">What&apos;s wrong with the AI&apos;s response?</p>
                  <textarea
                    value={correctionText}
                    onChange={e => setCorrectionText(e.target.value)}
                    placeholder="Describe the error and the correct information..."
                    rows={3}
                    maxLength={1000}
                    className="w-full text-xs bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-rust"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={handleAiCorrectionSubmit}
                      disabled={correctionText.length < 10 || correctionSubmitting}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg disabled:opacity-50 hover:bg-amber-500/30 transition-colors"
                    >
                      {correctionSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Submit Correction
                    </button>
                    <button
                      onClick={() => { setShowAiCorrection(false); setCorrectionText(''); }}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {question.photoUrls && question.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Image size={12} className="text-white/40" />
              <span className="text-xs text-white/40">
                {question.photoUrls.length} photo{question.photoUrls.length !== 1 ? 's' : ''} attached
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            {question.expertPayoutCents > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-forest-green">
                <DollarSign size={12} />
                Your payout: ${(question.expertPayoutCents / 100).toFixed(2)}
              </span>
            ) : (
              <span className="text-xs font-medium text-white/40">Free question — builds your reputation</span>
            )}
            {question.diyerCity && question.diyerState && (
              <span className="text-xs text-white/40">{question.diyerCity}, {question.diyerState}</span>
            )}
            <span className="text-xs text-white/30">Asked {formatTimeAgo(question.createdAt)}</span>
          </div>

          {isClaimed && (
            <div className="mt-4">
              <Textarea
                label="Your Answer"
                value={answerText}
                onChange={(e) => { setAnswerText(e.target.value); setError(''); }}
                rows={5}
                placeholder="Provide a detailed, helpful answer (min 50 characters)..."
                maxLength={2000}
                resize="none"
                fullWidth
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-white/30">{answerText.length}/2000</p>
              </div>
              {error && <Alert variant="error" className="mt-2">{error}</Alert>}
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
            <div className="mt-4 bg-forest-green/10 border border-forest-green/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-forest-green mb-1">Your Answer</p>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{question.answerText}</p>
              {question.answeredAt && (
                <p className="text-xs text-white/30 mt-2">Answered {formatTimeAgo(question.answeredAt)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
