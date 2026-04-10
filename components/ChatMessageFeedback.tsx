'use client';

import React, { useState } from 'react';
import { ThumbsUp, Flag, X, Send, Loader2 } from 'lucide-react';

interface ChatMessageFeedbackProps {
  messageIndex: number;
  conversationId: string | null;
  userMessage: string;
  aiResponse: string;
}

const FLAG_TYPES = [
  { value: 'safety', label: 'Safety concern' },
  { value: 'incorrect', label: 'Incorrect information' },
  { value: 'missing_steps', label: 'Missing important steps' },
  { value: 'wrong_for_situation', label: 'Wrong for my situation' },
] as const;

type FlagType = typeof FLAG_TYPES[number]['value'];

export default function ChatMessageFeedback({
  messageIndex,
  conversationId,
  userMessage,
  aiResponse,
}: ChatMessageFeedbackProps) {
  const [thumbsUpDone, setThumbsUpDone] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagType, setFlagType] = useState<FlagType | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flagDone, setFlagDone] = useState(false);

  const handleThumbsUp = async () => {
    setThumbsUpDone(true);
    try {
      await fetch('/api/chat/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageIndex,
          feedbackType: 'thumbs_up',
        }),
      });
    } catch { /* silent */ }
  };

  const handleFlagSubmit = async () => {
    if (!flagType) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/chat/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageIndex,
          feedbackType: 'flag',
          flagType,
          details: details.trim() || undefined,
          userMessage,
          aiResponse,
        }),
      });
      if (res.ok) {
        setFlagDone(true);
        setShowFlagForm(false);
      }
    } catch { /* silent */ }
    setSubmitting(false);
  };

  if (flagDone) {
    return (
      <span className="text-xs text-forest-green flex items-center gap-1 mt-1">
        <Flag className="w-3.5 h-3.5" /> Thanks for the feedback
      </span>
    );
  }

  return (
    <div className="mt-1">
      {!showFlagForm && (
        <div className="flex items-center gap-2">
          {thumbsUpDone ? (
            <span className="text-xs text-forest-green flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" /> Helpful
            </span>
          ) : (
            <button
              onClick={handleThumbsUp}
              className="text-xs text-earth-brown-light hover:text-forest-green transition-colors flex items-center gap-1"
              title="This response was helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowFlagForm(true)}
            className="text-xs text-earth-brown-light hover:text-rust transition-colors flex items-center gap-1"
            title="Flag an issue with this response"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showFlagForm && (
        <div className="mt-2 bg-earth-tan/20 border border-earth-sand rounded-lg p-3 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">What&apos;s wrong?</span>
            <button onClick={() => setShowFlagForm(false)} className="text-earth-brown-light hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {FLAG_TYPES.map(ft => (
              <button
                key={ft.value}
                onClick={() => setFlagType(ft.value)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  flagType === ft.value
                    ? 'bg-rust text-white border-rust'
                    : 'bg-white border-earth-sand text-earth-brown hover:border-rust'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Tell us more (optional)..."
            rows={2}
            maxLength={500}
            className="w-full text-xs border border-earth-sand rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-rust"
          />

          <button
            onClick={handleFlagSubmit}
            disabled={!flagType || submitting}
            className="mt-1.5 flex items-center gap-1 px-3 py-1 text-xs bg-rust text-white rounded-lg disabled:opacity-50 hover:bg-rust/90 transition-colors"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
