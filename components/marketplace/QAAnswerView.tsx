'use client';

import { useState } from 'react';
import { CheckCircle2, Star, AlertTriangle, Image, ThumbsDown, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface QAAnswerViewProps {
  question: {
    id: string;
    questionText: string;
    category: string;
    status: string;
    answerText?: string | null;
    answerPhotos?: string[];
    recommendsProfessional?: boolean;
    proRecommendationReason?: string | null;
    expertId?: string | null;
    priceCents?: number;
    creditAppliedCents?: number;
    markedNotHelpful?: boolean;
  };
  onAccept?: () => void;
  onReview?: () => void;
  onNotHelpful?: () => void;
}

export default function QAAnswerView({ question, onAccept, onReview, onNotHelpful }: QAAnswerViewProps) {
  const [confirmNotHelpful, setConfirmNotHelpful] = useState(false);
  const [notHelpfulLoading, setNotHelpfulLoading] = useState(false);

  const hasAnswer = question.answerText && question.answerText.trim().length > 0;
  const canAccept = question.status === 'answered' && onAccept;
  const canReview = question.status === 'accepted' && onReview;
  const canMarkNotHelpful = question.status === 'answered' && onNotHelpful && !question.markedNotHelpful;

  const creditAmount = (question.priceCents || 0) - (question.creditAppliedCents || 0);

  const handleNotHelpful = async () => {
    if (!confirmNotHelpful) {
      setConfirmNotHelpful(true);
      return;
    }
    setNotHelpfulLoading(true);
    onNotHelpful?.();
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-white border border-earth-sand rounded-lg p-4">
        <h3 className="text-sm font-semibold text-earth-brown mb-2">Your Question</h3>
        <p className="text-sm text-foreground">{question.questionText}</p>
        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-slate-blue/10 text-slate-blue rounded-full font-medium">
          {question.category}
        </span>
      </div>

      {/* Answer */}
      {hasAnswer ? (
        <div className="bg-white border border-earth-sand rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-forest-green" />
            <h3 className="text-sm font-semibold text-foreground">Expert Answer</h3>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{question.answerText}</p>

          {question.answerPhotos && question.answerPhotos.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              <Image size={14} className="text-earth-brown" />
              <span className="text-xs text-earth-brown">
                {question.answerPhotos.length} photo{question.answerPhotos.length !== 1 ? 's' : ''} attached
              </span>
            </div>
          )}

          {question.recommendsProfessional && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Professional Recommended</span>
              </div>
              {question.proRecommendationReason && (
                <p className="text-sm text-amber-700">{question.proRecommendationReason}</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            {canAccept && (
              <Button variant="secondary" leftIcon={CheckCircle2} iconSize={16} onClick={onAccept}>
                Accept Answer
              </Button>
            )}
            {canMarkNotHelpful && (
              <>
                {confirmNotHelpful ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      leftIcon={notHelpfulLoading ? Loader2 : ThumbsDown}
                      iconSize={16}
                      onClick={handleNotHelpful}
                      disabled={notHelpfulLoading}
                      className={notHelpfulLoading ? '[&>svg:first-child]:animate-spin' : ''}
                    >
                      Confirm: Not Helpful
                    </Button>
                    <button
                      onClick={() => setConfirmNotHelpful(false)}
                      className="text-sm text-earth-brown hover:text-foreground"
                    >
                      Cancel
                    </button>
                    {creditAmount > 0 && (
                      <span className="text-xs text-earth-brown">
                        You&apos;ll receive ${(creditAmount / 100).toFixed(2)} in platform credit
                      </span>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    leftIcon={ThumbsDown}
                    iconSize={16}
                    onClick={handleNotHelpful}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Not Helpful
                  </Button>
                )}
              </>
            )}
            {canReview && (
              <Button variant="primary" leftIcon={Star} iconSize={16} onClick={onReview}>
                Leave a Review
              </Button>
            )}
          </div>

          {/* Show if already marked not helpful */}
          {question.markedNotHelpful && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                You marked this answer as not helpful. Platform credit has been applied to your account.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-earth-tan/50 border border-earth-sand rounded-lg p-6 text-center">
          <p className="text-sm text-earth-brown">Waiting for an expert to answer...</p>
        </div>
      )}
    </div>
  );
}
