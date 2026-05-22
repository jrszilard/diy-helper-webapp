'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import StarRating from '@/components/ui/StarRating';
import { useExpertStatus } from '@/hooks/useExpertStatus';

const DIYER_PRICE_OPTIONS = ['Free', '$5/mo', '$10/mo', '$15/mo', '$20+/mo'];
const EXPERT_PRICE_OPTIONS = ['$5/q', '$10/q', '$15/q', '$20/q', '$25+/q'];

type UserType = 'diyer' | 'expert';

function PillButton({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--rust)] text-white'
          : 'bg-white/[0.08] text-white hover:bg-white/[0.12]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function BetaFeedbackWidget() {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  const { isExpert, loading: expertLoading } = useExpertStatus();
  const [open, setOpen] = useState(false);
  // manualUserType tracks an explicit override; when null, falls back to auth-derived type
  const [manualUserType, setManualUserType] = useState<UserType | null>(null);
  const [usageScore, setUsageScore] = useState(0);
  const [priceOption, setPriceOption] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const derivedUserType: UserType | null = expertLoading ? null : (isExpert ? 'expert' : 'diyer');
  const userType = manualUserType ?? derivedUserType;

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    window.addEventListener('open-beta-feedback', handleOpen);
    return () => window.removeEventListener('open-beta-feedback', handleOpen);
  }, [handleOpen]);

  if (!isBeta) return null;

  const handleClose = () => {
    setOpen(false);
    setManualUserType(null);
    setUsageScore(0);
    setPriceOption('');
    setMessage('');
    setStatus('idle');
  };

  const handleUserTypeChange = (type: UserType) => {
    setManualUserType(type);
    setPriceOption('');
  };

  const priceOptions = userType === 'expert' ? EXPERT_PRICE_OPTIONS : DIYER_PRICE_OPTIONS;
  const priceLabel = userType === 'expert'
    ? 'How much would you expect to get paid per question?'
    : 'How much would you be willing to pay for this?';

  const canSubmit = userType !== null && usageScore > 0 && priceOption !== '' && status !== 'sending';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType,
          usageScore,
          priceOption,
          message: message.trim() || null,
          pageUrl: window.location.href,
        }),
      });
      if (res.ok) {
        setStatus('sent');
        setTimeout(handleClose, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 bg-[var(--rust)] hover:bg-[var(--rust-glow)] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors"
          aria-label="Send feedback"
        >
          <MessageSquare size={22} />
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 bg-[var(--earth-brown-dark)] border border-white/[0.06] rounded-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--rust)] text-white px-4 py-2.5 flex items-center justify-between">
            <span className="font-semibold text-sm">Beta Feedback</span>
            <button
              onClick={handleClose}
              className="p-1 text-white/80 hover:text-white transition-colors"
              aria-label="Close feedback"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {status === 'sent' ? (
              <div className="text-center py-6">
                <p className="text-[var(--forest-green)] font-semibold">Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                {/* User type */}
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--muted)]">I am a…</p>
                  <div className="flex gap-2">
                    <PillButton
                      active={userType === 'diyer'}
                      onClick={() => handleUserTypeChange('diyer')}
                      className="flex-1"
                    >
                      DIYer
                    </PillButton>
                    <PillButton
                      active={userType === 'expert'}
                      onClick={() => handleUserTypeChange('expert')}
                      className="flex-1"
                    >
                      Expert
                    </PillButton>
                  </div>
                </div>

                {/* Usage Likert */}
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--muted)]">How likely are you to use this product?</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[var(--muted)] shrink-0">Not likely</span>
                    <StarRating
                      value={usageScore}
                      onChange={setUsageScore}
                      size="sm"
                    />
                    <span className="text-[10px] text-[var(--muted)] shrink-0">Very likely</span>
                  </div>
                </div>

                {/* Price / pay — revealed after user type is selected */}
                {userType && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-[var(--muted)]">{priceLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {priceOptions.map((opt) => (
                        <PillButton
                          key={opt}
                          active={priceOption === opt}
                          onClick={() => setPriceOption(opt)}
                        >
                          {opt}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anything else */}
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything else? (optional)"
                  resize="none"
                  fullWidth
                  className="h-20"
                />

                {status === 'error' && (
                  <p className="text-[#E89580] text-xs">Failed to send. Please try again.</p>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {status === 'sending' ? 'Sending…' : 'Send Feedback'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
