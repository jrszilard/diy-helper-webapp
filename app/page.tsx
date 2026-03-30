'use client';

import { useEffect, useState } from 'react';
import LandingHero from '@/components/LandingHero';
import AppHeader from '@/components/AppHeader';
import LandingQuickChat from '@/components/LandingQuickChat';
import AppLogo from '@/components/AppLogo';
import Button from '@/components/ui/Button';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LandingPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      if (u) fetchConversations(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      if (u) fetchConversations(u.id);
      else setConversations([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConversations = async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(6);
    setConversations(data ?? []);
  };

  const openConversation = (id: string) => {
    setActiveChatConversationId(id);
    setShowChat(true);
  };

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <AppHeader
        showBack={showChat}
        backLabel="Home"
        onBack={() => setShowChat(false)}
      />

      {showChat ? (
        <section className="pt-[var(--space-3xl)] pb-[var(--space-2xl)]">
          <div className="u-container">
            <LandingQuickChat initialConversationId={activeChatConversationId} />
          </div>
        </section>
      ) : (
        <>
          {/* Hero */}
          <section className="pt-[var(--space-3xl)] pb-[var(--space-2xl)]">
            <div className="u-container">
              <LandingHero />
            </div>
          </section>

          {/* Recent Conversations */}
          {user && conversations.length > 0 && (
            <section className="pb-[var(--space-2xl)]">
              <div className="u-container">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-white/50" />
                    Recent conversations
                  </h2>
                  <button
                    onClick={() => { window.location.href = '/chat'; }}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv.id)}
                      className="flex items-start gap-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-3 transition-all group"
                    >
                      <MessageSquare className="w-4 h-4 text-white/30 group-hover:text-white/50 flex-shrink-0 mt-0.5 transition-colors" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white/80 text-sm font-medium truncate group-hover:text-white transition-colors">
                          {conv.title}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">{formatRelativeTime(conv.updated_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="py-[var(--space-l)]">
            <div className="u-container">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <AppLogo variant="dark" />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                    About
                  </Button>
                  <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                    Become an Expert
                  </Button>
                  <span className="text-white/30 text-sm pl-2">Powered by Claude AI</span>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
