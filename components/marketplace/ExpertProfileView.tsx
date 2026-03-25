'use client';

import { Star, MapPin, DollarSign, Clock, Shield, MessageSquare, HelpCircle, CheckCircle, TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import type { ExpertProfile } from '@/lib/marketplace/types';
import ExpertLevelBadge from './ExpertLevelBadge';
import type { ExpertLevel } from './ExpertLevelBadge';
import ReviewCard from './ReviewCard';
import ConsultationBooking from './ConsultationBooking';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ExpertProfileViewProps {
  expert: ExpertProfile & {
    reputationScore?: number;
    expertLevel?: string;
    acceptanceRate?: number;
    avgResponseMinutes?: number | null;
    totalQuestionsAnswered?: number;
  };
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
  const [projects, setProjects] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (projectsLoaded) return;
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('updated_at', { ascending: false })
        .limit(20);
      if (data) {
        setProjects(data.filter(p => p.name));
      }
    } catch {
      // Projects fetch is optional — silently ignore
    } finally {
      setProjectsLoaded(true);
    }
  }, [projectsLoaded]);

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
      if (selectedProjectId) {
        const selected = projects.find(p => p.id === selectedProjectId);
        if (selected) {
          const lines = [`[Project: ${selected.name}]`];
          if (selected.description) lines.push(selected.description);
          lines.push(`Details: /chat?project=${selected.id}`);
          lines.push('---');
          lines.push(fullContent);
          fullContent = lines.join('\n');
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
      <div className="bg-white border border-earth-sand rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-slate-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
            {expert.profilePhotoUrl ? (
              <img
                src={expert.profilePhotoUrl}
                alt={expert.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-slate-blue">
                {expert.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{expert.displayName}</h1>
              {expert.verificationLevel >= 2 && (
                <Shield size={18} className="text-slate-blue" />
              )}
              {expert.expertLevel && expert.expertLevel !== 'bronze' && (
                <ExpertLevelBadge level={expert.expertLevel as ExpertLevel} size="md" />
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= Math.round(expert.avgRating) ? 'fill-terracotta text-terracotta' : 'text-earth-sand'}
                    />
                  ))}
                </div>
                <span className="text-sm text-earth-brown">
                  {expert.avgRating.toFixed(1)} ({expert.totalReviews} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-earth-brown">
                <MapPin size={14} />
                {expert.city}, {expert.state}
              </span>
              {expert.hourlyRateCents && (
                <span className="flex items-center gap-1 text-sm font-medium text-forest-green">
                  <DollarSign size={14} />
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </span>
              )}
              {expert.responseTimeHours && (
                <span className="flex items-center gap-1 text-sm text-earth-brown">
                  <Clock size={14} />
                  ~{expert.responseTimeHours}h response
                </span>
              )}
            </div>
          </div>
        </div>

        {expert.bio && (
          <div className="mt-4 pt-4 border-t border-earth-sand">
            <p className="text-sm text-foreground">{expert.bio}</p>
          </div>
        )}

        {expert.specialties.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-earth-brown mb-2">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {expert.specialties.map(s => (
                <span
                  key={s.specialty}
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    s.isPrimary
                      ? 'bg-terracotta/10 text-terracotta border border-terracotta/30'
                      : 'bg-slate-blue/10 text-slate-blue'
                  }`}
                >
                  {s.specialty.replace('_', ' ')}
                  {s.yearsExperience ? ` (${s.yearsExperience} yr)` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            leftIcon={MessageSquare}
            iconSize={16}
            onClick={() => {
              const willShow = !showMessageBox;
              setShowMessageBox(willShow);
              if (willShow) fetchProjects();
            }}
          >
            Contact {expert.displayName}
          </Button>
          {expert.qaRateCents && (
            <Button
              variant="tertiary"
              size="lg"
              leftIcon={HelpCircle}
              iconSize={16}
              href={`/marketplace/qa?targetExpertId=${expert.id}&targetExpertName=${encodeURIComponent(expert.displayName)}`}
            >
              Ask a Paid Question — ${(expert.qaRateCents / 100).toFixed(0)}
            </Button>
          )}
        </div>

        {/* Inline message composer */}
        {showMessageBox && (
          <div className="mt-4 p-4 bg-earth-cream rounded-lg border border-earth-sand">
            {messageSent ? (
              <div className="text-center py-2">
                <p className="text-sm font-medium text-forest-green">Message sent!</p>
                <Link href={`/messages/${expert.userId}`} className="text-xs text-slate-blue hover:underline mt-1 inline-block">
                  View your messages
                </Link>
              </div>
            ) : (
              <>
                {/* Project selector */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-earth-brown mb-1">
                    Link a project for context (optional)
                  </label>
                  {projectsLoaded && projects.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">
                      No projects yet. <Link href="/chat" className="text-slate-blue hover:underline">Start a project</Link> first to share details with an expert.
                    </p>
                  ) : (
                    <Select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      fullWidth
                    >
                      <option value="">Select a project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  )}
                  {selectedProjectId && (
                    <p className="text-xs text-forest-green mt-1">
                      The expert will see your project name and a link to the full details.
                    </p>
                  )}
                </div>

                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder={`Describe what you need help with...`}
                  rows={4}
                  className="w-full px-3 py-2 border border-earth-sand rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/50 resize-none"
                  maxLength={2000}
                />
                {messageError && (
                  <p className="text-xs text-red-600 mt-1">{messageError}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-earth-brown">{messageText.length}/2000</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={messageSending || !messageText.trim()}
                  >
                    {messageSending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rates */}
      {(expert.hourlyRateCents || expert.qaRateCents) && (
        <div className="bg-white border border-earth-sand rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Rates</h3>
          <div className="grid grid-cols-2 gap-4">
            {expert.hourlyRateCents && (
              <div>
                <p className="text-xs text-earth-brown">Hourly Rate</p>
                <p className="text-lg font-bold text-forest-green">
                  ${(expert.hourlyRateCents / 100).toFixed(0)}/hr
                </p>
              </div>
            )}
            {expert.qaRateCents && (
              <div>
                <p className="text-xs text-earth-brown">Q&A Rate</p>
                <p className="text-lg font-bold text-forest-green">
                  ${(expert.qaRateCents / 100).toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance stats */}
      {(expert.totalQuestionsAnswered ?? 0) > 0 && (
        <div className="bg-white border border-earth-sand rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-blue" />
            Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-earth-brown">Questions Answered</p>
              <p className="text-lg font-bold text-foreground">{expert.totalQuestionsAnswered}</p>
            </div>
            {(expert.acceptanceRate ?? 0) > 0 && (
              <div>
                <p className="text-xs text-earth-brown">Acceptance Rate</p>
                <p className="text-lg font-bold text-forest-green flex items-center gap-1">
                  <CheckCircle size={14} />
                  {expert.acceptanceRate}%
                </p>
              </div>
            )}
            {expert.avgResponseMinutes && (
              <div>
                <p className="text-xs text-earth-brown">Avg Response</p>
                <p className="text-lg font-bold text-foreground">
                  {expert.avgResponseMinutes < 60
                    ? `${expert.avgResponseMinutes}m`
                    : `${(expert.avgResponseMinutes / 60).toFixed(1)}h`}
                </p>
              </div>
            )}
            {expert.expertLevel && (
              <div>
                <p className="text-xs text-earth-brown">Expert Level</p>
                <div className="mt-1">
                  <ExpertLevelBadge level={(expert.expertLevel || 'bronze') as ExpertLevel} size="md" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consultation Booking */}
      {expert.hourlyRateCents && (
        <ConsultationBooking
          expertId={expert.id}
          expertName={expert.displayName}
        />
      )}

      {/* Reviews */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div className="bg-white border border-earth-sand rounded-lg p-6 text-center">
            <p className="text-sm text-earth-brown">No reviews yet</p>
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
