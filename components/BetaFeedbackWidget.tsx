'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'praise', label: 'Praise' },
  { value: 'other', label: 'Other' },
] as const;

export default function BetaFeedbackWidget() {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>('suggestion');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    window.addEventListener('open-beta-feedback', handleOpen);
    return () => window.removeEventListener('open-beta-feedback', handleOpen);
  }, [handleOpen]);

  if (!isBeta) return null;

  const handleSubmit = async () => {
    if (message.trim().length < 5) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType,
          message: message.trim(),
          pageUrl: window.location.href,
        }),
      });
      if (res.ok) {
        setStatus('sent');
        setMessage('');
        setTimeout(() => {
          setStatus('idle');
          setOpen(false);
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 bg-terracotta hover:bg-terracotta-dark text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors"
          aria-label="Send feedback"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 bg-earth-cream border border-earth-sand rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-terracotta text-white px-4 py-2.5 flex items-center justify-between">
            <span className="font-semibold text-sm">Beta Feedback</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {status === 'sent' ? (
              <div className="text-center py-6">
                <p className="text-forest-green font-semibold">Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="flex gap-1.5">
                  {FEEDBACK_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFeedbackType(value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        feedbackType === value
                          ? 'bg-terracotta text-white'
                          : 'bg-earth-tan text-earth-brown-dark hover:bg-earth-sand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind? (min 5 characters)"
                  className="w-full h-24 px-3 py-2 text-sm bg-white border border-earth-sand rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-terracotta text-earth-brown-dark placeholder:text-earth-brown"
                />

                {status === 'error' && (
                  <p className="text-red-600 text-xs">Failed to send. Please try again.</p>
                )}

                {/* Submit */}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={message.trim().length < 5 || status === 'sending'}
                >
                  {status === 'sending' ? 'Sending...' : 'Send Feedback'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
