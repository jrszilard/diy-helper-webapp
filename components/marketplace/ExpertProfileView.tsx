'use client';

import { Star, MapPin, DollarSign, Clock, Shield, MessageSquare } from 'lucide-react';
import type { ExpertProfile } from '@/lib/marketplace/types';
import ReviewCard from './ReviewCard';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ExpertProfileViewProps {
  expert: ExpertProfile;
  reviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: string;
    expertResponse: string | null;
  }>;
}

export default function ExpertProfileView({ expert, reviews }: ExpertProfileViewProps) {
  const [messageSending, setMessageSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (conversationsLoaded) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const convs = (data.conversations || [])
          .filter((c: { id: string; title: string | null }) => c.title)
          .map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }));
        setConversations(convs);
      }
    } catch {
      // Conversations fetch is optional — silently ignore
    } finally {
      setConversationsLoaded(true);
    }
  }, [conversationsLoaded]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setMessageSending(true);
    setMessageError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setMessageError('Please sign in to send a message.');
        setMessageSending(false);
        return;
      }

      let fullContent = messageText.trim();
      if (selectedConversationId) {
        const selectedConv = conversations.find(c => c.id === selectedConversationId);
        if (selectedConv) {
          fullContent = [
            `[Project: ${selectedConv.title}]`,
            `Details: /chat?id=${selectedConv.id}`,
            `---`,
            fullContent,
          ].join('\n');
        }
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientUserId: expert.userId,
          content: fullContent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessageError(data.error || 'Failed to send message.');
      } else {
        setMessageSent(true);
        setMessageText('');
      }
    } catch {
      setMessageError('Something went wrong.');
    } finally {
      setMessageSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white border border-[#D4C8B8] rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
            {expert.profilePhotoUrl ? (
              <img
                src={expert.profilePhotoUrl}
                alt={expert.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#5D7B93]">
                {expert.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#3E2723]">{expert.displayName}</h1>
              {expert.verificationLevel >= 2 && (
                <Shield size={18} className="text-[#5D7B93]" />
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= Math.round(expert.avgRating) ? 'fill-[#C67B5C] text-[#C67B5C]' : 'text-[#D4C8B8]'}
                    />
                  ))}
                </div>
                <span className="text-sm text-[#7D6B5D]">
                  {expert.avgRating.toFixed(1)} ({expert.totalReviews} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-[#7D6B5D]">
                <MapPin size={14} />
                {expert.city}, {expert.state}
              </span>
              {expert.hourlyRateCents && (
                <span className="flex items-center gap-1 text-sm font-medium text-[#4A7C59]">
                  <DollarSign size={14} />
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </span>
              )}
              {expert.responseTimeHours && (
                <span className="flex items-center gap-1 text-sm text-[#7D6B5D]">
                  <Clock size={14} />
                  ~{expert.responseTimeHours}h response
                </span>
              )}
            </div>
          </div>
        </div>

        {expert.bio && (
          <div className="mt-4 pt-4 border-t border-[#D4C8B8]">
            <p className="text-sm text-[#3E2723]">{expert.bio}</p>
          </div>
        )}

        {expert.specialties.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-[#7D6B5D] mb-2">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {expert.specialties.map(s => (
                <span
                  key={s.specialty}
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    s.isPrimary
                      ? 'bg-[#C67B5C]/10 text-[#C67B5C] border border-[#C67B5C]/30'
                      : 'bg-[#5D7B93]/10 text-[#5D7B93]'
                  }`}
                >
                  {s.specialty.replace('_', ' ')}
                  {s.yearsExperience ? ` (${s.yearsExperience} yr)` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact button */}
        <div className="mt-6">
          <button
            onClick={() => {
              const willShow = !showMessageBox;
              setShowMessageBox(willShow);
              if (willShow) fetchConversations();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors"
          >
            <MessageSquare size={16} />
            Contact {expert.displayName}
          </button>
        </div>

        {/* Inline message composer */}
        {showMessageBox && (
          <div className="mt-4 p-4 bg-[#F5F0E6] rounded-lg border border-[#D4C8B8]">
            {messageSent ? (
              <div className="text-center py-2">
                <p className="text-sm font-medium text-[#4A7C59]">Message sent!</p>
                <Link href={`/messages/${expert.userId}`} className="text-xs text-[#5D7B93] hover:underline mt-1 inline-block">
                  View your messages
                </Link>
              </div>
            ) : (
              <>
                {/* Project selector */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-[#7D6B5D] mb-1">
                    Link a project for context (optional)
                  </label>
                  {conversationsLoaded && conversations.length === 0 ? (
                    <p className="text-xs text-[#B0A696] italic">
                      No projects yet. <Link href="/chat" className="text-[#5D7B93] hover:underline">Start a project</Link> first to share details with an expert.
                    </p>
                  ) : (
                    <select
                      value={selectedConversationId}
                      onChange={e => setSelectedConversationId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
                    >
                      <option value="">Select a project...</option>
                      {conversations.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                  {selectedConversationId && (
                    <p className="text-xs text-[#4A7C59] mt-1">
                      The expert will see your project name and a link to the full details.
                    </p>
                  )}
                </div>

                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder={`Describe what you need help with...`}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
                  maxLength={2000}
                />
                {messageError && (
                  <p className="text-xs text-red-600 mt-1">{messageError}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#7D6B5D]">{messageText.length}/2000</span>
                  <button
                    onClick={handleSendMessage}
                    disabled={messageSending || !messageText.trim()}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors ${
                      messageSending || !messageText.trim()
                        ? 'bg-[#B0A696] cursor-not-allowed'
                        : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
                    }`}
                  >
                    {messageSending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rates */}
      {(expert.hourlyRateCents || expert.qaRateCents) && (
        <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#3E2723] mb-3">Rates</h3>
          <div className="grid grid-cols-2 gap-4">
            {expert.hourlyRateCents && (
              <div>
                <p className="text-xs text-[#7D6B5D]">Hourly Rate</p>
                <p className="text-lg font-bold text-[#4A7C59]">
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </p>
              </div>
            )}
            {expert.qaRateCents && (
              <div>
                <p className="text-xs text-[#7D6B5D]">Q&A Rate</p>
                <p className="text-lg font-bold text-[#4A7C59]">
                  ${(expert.qaRateCents / 100).toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div>
        <h3 className="text-sm font-semibold text-[#3E2723] mb-3">
          Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-6 text-center">
            <p className="text-sm text-[#7D6B5D]">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
