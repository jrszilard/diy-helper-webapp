'use client';

import { CheckCircle2, Star, AlertTriangle, Image } from 'lucide-react';

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
  };
  onAccept?: () => void;
  onReview?: () => void;
}

export default function QAAnswerView({ question, onAccept, onReview }: QAAnswerViewProps) {
  const hasAnswer = question.answerText && question.answerText.trim().length > 0;
  const canAccept = question.status === 'answered' && onAccept;
  const canReview = question.status === 'accepted' && onReview;

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[#7D6B5D] mb-2">Your Question</h3>
        <p className="text-sm text-[#3E2723]">{question.questionText}</p>
        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-[#5D7B93]/10 text-[#5D7B93] rounded-full font-medium">
          {question.category}
        </span>
      </div>

      {/* Answer */}
      {hasAnswer ? (
        <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-[#4A7C59]" />
            <h3 className="text-sm font-semibold text-[#3E2723]">Expert Answer</h3>
          </div>
          <p className="text-sm text-[#3E2723] whitespace-pre-wrap">{question.answerText}</p>

          {question.answerPhotos && question.answerPhotos.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              <Image size={14} className="text-[#7D6B5D]" />
              <span className="text-xs text-[#7D6B5D]">
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
              <button
                onClick={onAccept}
                className="flex items-center gap-2 px-4 py-2 bg-[#4A7C59] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5A3B] transition-colors"
              >
                <CheckCircle2 size={16} />
                Accept Answer
              </button>
            )}
            {canReview && (
              <button
                onClick={onReview}
                className="flex items-center gap-2 px-4 py-2 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors"
              >
                <Star size={16} />
                Leave a Review
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#E8DFD0]/50 border border-[#D4C8B8] rounded-lg p-6 text-center">
          <p className="text-sm text-[#7D6B5D]">Waiting for an expert to answer...</p>
        </div>
      )}
    </div>
  );
}
