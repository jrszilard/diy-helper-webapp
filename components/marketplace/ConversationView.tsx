'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, CheckCircle2, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ExpertIdentityCard from '@/components/marketplace/ExpertIdentityCard';
import TierUpgradeModal from '@/components/marketplace/TierUpgradeModal';
import type { QAMessage } from '@/lib/marketplace/types';

interface TierGateInfo {
  currentTier: number;
  nextTier: number;
  upgradeCostCents: number;
  upgradeDescription: string;
  diyerMessageCount: number;
}

interface ConversationViewProps {
  questionId: string;
  currentUserId: string;
  userRole: 'diyer' | 'expert';
  questionStatus: string;
  /** Expert info for display */
  expert?: {
    displayName: string;
    profilePhotoUrl: string | null;
    avgRating: number;
    totalReviews: number;
    responseTimeHours: number | null;
    verificationLevel: number;
    specialties: Array<{ specialty: string; yearsExperience: number | null; isPrimary: boolean }>;
  };
  /** Legacy single answer (for backward compat) */
  answerText?: string | null;
  /** Current payment tier for tier gate display */
  currentTier?: number;
  /** Callback when status changes (e.g., after resolve) */
  onStatusChange?: (newStatus: string) => void;
  /** Callback when tier upgrades */
  onTierChange?: (newTier: number) => void;
}

export default function ConversationView({
  questionId,
  currentUserId,
  userRole,
  questionStatus,
  expert,
  answerText,
  currentTier = 1,
  onStatusChange,
  onTierChange,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [tierGate, setTierGate] = useState<TierGateInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSendMessage = ['claimed', 'answered', 'in_conversation', 'resolve_proposed'].includes(questionStatus);
  const isResolveProposed = questionStatus === 'resolve_proposed';
  const isAccepted = questionStatus === 'accepted';
  const isDisputed = questionStatus === 'disputed';

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/qa/${questionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`qa-messages-${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qa_messages',
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id as string,
              questionId: newMsg.question_id as string,
              senderUserId: newMsg.sender_user_id as string,
              senderRole: newMsg.sender_role as 'diyer' | 'expert',
              content: newMsg.content as string,
              attachments: (newMsg.attachments as string[]) || [],
              createdAt: newMsg.created_at as string,
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        setSending(false);
        return;
      }

      const res = await fetch(`/api/qa/${questionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'tier_upgrade_required' && data.tierGate) {
          setTierGate(data.tierGate);
        } else {
          setError(data.error || 'Failed to send message.');
        }
      } else {
        setNewMessage('');
        // Message will arrive via Realtime, but also fetch to be safe
        fetchMessages();
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const handleResolveAction = async (action: 'propose_resolve' | 'accept' | 'continue' | 'not_helpful') => {
    setResolving(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/qa/${questionId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        onStatusChange?.(data.status);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Action failed.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setResolving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#D4C8B8] bg-[#F5F0E6]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#5D7B93]" />
            <h3 className="text-sm font-semibold text-[#3E2723]">Conversation</h3>
            {messages.length > 0 && (
              <span className="text-xs text-[#7D6B5D]">({messages.length} messages)</span>
            )}
          </div>
          {currentTier > 1 && (
            <span className="text-xs px-2 py-0.5 bg-[#C67B5C]/10 text-[#C67B5C] rounded-full font-medium">
              Tier {currentTier}
            </span>
          )}
          {isAccepted && (
            <span className="flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
              <CheckCircle2 size={14} />
              Resolved
            </span>
          )}
          {isDisputed && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <AlertCircle size={14} />
              Disputed
            </span>
          )}
        </div>
        {expert && (
          <div className="mt-2">
            <ExpertIdentityCard {...expert} compact />
          </div>
        )}
      </div>

      {/* Legacy answer (if no threaded messages yet) */}
      {answerText && messages.length === 0 && (
        <div className="px-4 py-3 bg-[#5D7B93]/5 border-b border-[#D4C8B8]/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#5D7B93] rounded">Expert</span>
            <span className="text-xs text-[#7D6B5D]">Original answer</span>
          </div>
          <p className="text-sm text-[#3E2723] whitespace-pre-wrap">{answerText}</p>
        </div>
      )}

      {/* Messages */}
      <div className="max-h-[500px] overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#C67B5C]" />
          </div>
        ) : messages.length === 0 && !answerText ? (
          <p className="text-center text-sm text-[#B0A696] py-8">
            No messages yet. {userRole === 'expert' ? 'Send your first response.' : 'Waiting for expert response.'}
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderUserId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwn ? 'order-1' : 'order-0'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${
                      msg.senderRole === 'expert' ? 'bg-[#5D7B93]' : 'bg-[#C67B5C]'
                    }`}>
                      {msg.senderRole === 'expert' ? 'Expert' : 'You'}
                    </span>
                    <span className="text-[10px] text-[#B0A696]">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-lg text-sm ${
                    isOwn
                      ? 'bg-[#C67B5C]/10 text-[#3E2723] border border-[#C67B5C]/20'
                      : 'bg-[#5D7B93]/10 text-[#3E2723] border border-[#5D7B93]/20'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.attachments.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#5D7B93] hover:underline"
                          >
                            Attachment {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Resolve proposal banner */}
      {isResolveProposed && userRole === 'diyer' && (
        <div className="px-4 py-3 bg-[#4A7C59]/10 border-t border-[#4A7C59]/20">
          <p className="text-sm font-medium text-[#4A7C59] mb-2">
            The expert believes your question has been answered.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleResolveAction('accept')}
              disabled={resolving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4A7C59] text-white text-sm font-semibold rounded-lg hover:bg-[#3A6A49] transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Accept Answer
            </button>
            <button
              onClick={() => handleResolveAction('continue')}
              disabled={resolving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors disabled:opacity-50"
            >
              <ArrowRight size={14} />
              Continue Conversation
            </button>
            <button
              onClick={() => handleResolveAction('not_helpful')}
              disabled={resolving}
              className="px-4 py-2 text-sm font-medium text-[#7D6B5D] border border-[#D4C8B8] rounded-lg hover:bg-[#E8DFD0]/50 transition-colors disabled:opacity-50"
            >
              Not Helpful
            </button>
          </div>
        </div>
      )}

      {/* Expert resolve button */}
      {canSendMessage && userRole === 'expert' && !isResolveProposed && (
        <div className="px-4 py-2 border-t border-[#D4C8B8]/50 bg-[#F5F0E6]/30">
          <button
            onClick={() => handleResolveAction('propose_resolve')}
            disabled={resolving}
            className="text-xs text-[#5D7B93] hover:text-[#4A6578] font-medium disabled:opacity-50"
          >
            {resolving ? 'Submitting...' : 'Propose Resolution'}
          </button>
        </div>
      )}

      {/* Message input */}
      {canSendMessage && (
        <div className="px-4 py-3 border-t border-[#D4C8B8]">
          {error && (
            <p className="text-xs text-red-600 mb-2">{error}</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={userRole === 'expert' ? 'Type your response...' : 'Ask a follow-up question...'}
              rows={2}
              className="flex-1 px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
              maxLength={5000}
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className={`flex items-center justify-center w-10 h-10 rounded-lg text-white transition-colors ${
                sending || !newMessage.trim()
                  ? 'bg-[#B0A696] cursor-not-allowed'
                  : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
              }`}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-[#B0A696] mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Closed state */}
      {(isAccepted || isDisputed) && (
        <div className="px-4 py-3 border-t border-[#D4C8B8] bg-[#F5F0E6]/50 text-center">
          <p className="text-xs text-[#7D6B5D]">
            {isAccepted
              ? 'This conversation has been resolved. The answer is now part of your project record.'
              : 'This conversation has been marked as disputed.'}
          </p>
        </div>
      )}

      {/* Tier upgrade modal */}
      {tierGate && (
        <TierUpgradeModal
          questionId={questionId}
          currentTier={tierGate.currentTier}
          nextTier={tierGate.nextTier}
          upgradeCostCents={tierGate.upgradeCostCents}
          upgradeDescription={tierGate.upgradeDescription}
          diyerMessageCount={tierGate.diyerMessageCount}
          onUpgradeSuccess={(newTier) => {
            setTierGate(null);
            onTierChange?.(newTier);
            // Re-try sending the message after upgrade
            handleSend();
          }}
          onDecline={() => setTierGate(null)}
        />
      )}
    </div>
  );
}
