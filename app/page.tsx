'use client';

import { useEffect, useState, useCallback } from 'react';
import LandingHero from '@/components/LandingHero';
import AppHeader from '@/components/AppHeader';
import FixBot from '@/components/FixBot';
import { MessageSquare } from 'lucide-react';
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
  const [chatActive, setChatActive] = useState(false);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);

  const fetchConversations = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(6);
    setConversations(data ?? []);
  }, []);

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
  }, [fetchConversations]);

  const openConversation = (id: string) => {
    setActiveChatConversationId(id);
    setChatActive(true);
  };

  const handleNewChat = () => {
    setActiveChatConversationId(undefined);
    setChatActive(false);
  };

  const handleProjectSelect = useCallback(async (project: { id: string } | null) => {
    if (!project) return;
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('project_id', project.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      openConversation(data[0].id);
    } else {
      setChatActive(true);
    }
  }, []);

  // Broadcast materials count to the global sidebar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('diy:materialsCount', { detail: materialsCount }));
  }, [materialsCount]);

  // Listen for project selection from the global sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const project = (e as CustomEvent<{ id: string }>).detail;
      handleProjectSelect(project);
    };
    window.addEventListener('diy:projectSelect', handler);
    return () => window.removeEventListener('diy:projectSelect', handler);
  }, [handleProjectSelect]);

  return (
    <div className="min-h-screen bg-earth-night">
      <AppHeader
        showBack={chatActive}
        onBack={handleNewChat}
      />

      {!chatActive && (
        <section className="pt-[var(--space-2xl)] pb-[var(--space-l)]">
          <div className="u-container">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center max-w-3xl mx-auto">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-3">
                  AI-powered DIY assistant
                </p>
                <h1 className="font-serif italic font-normal leading-[1.05] tracking-[-0.015em] text-white" style={{ fontSize: 'clamp(2.25rem, 5vw, 3rem)' }}>
                  Hi, I&apos;m Fix.
                  <br />
                  I&apos;m here to{' '}
                  <span className="text-[var(--rust)]">terminate</span> your project.
                </h1>
                <p className="mt-3 text-white/40 text-base sm:text-lg max-w-md mx-auto md:mx-0">
                  Building codes, materials lists, store prices, project planning — locked and loaded.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/[0.06] px-3 py-1.5 text-xs text-white/40">
                  <span className="fix-thinking-dot" aria-hidden />
                  I&apos;ll be back… with the receipts from Home Depot.
                </span>
              </div>
              <div className="flex justify-center md:justify-end">
                <FixBot
                  size={180}
                  theme="dark"
                  withNailgun
                  floating
                  withShadow
                  ariaLabel="Fix the FIX-3000, the Fixerator mascot"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={chatActive ? 'pt-[var(--space-3xl)] pb-[var(--space-2xl)]' : 'pb-[var(--space-2xl)]'}>
        <div className="u-container">
          <LandingHero
            chatActive={chatActive}
            onFirstMessage={() => setChatActive(true)}
            initialConversationId={activeChatConversationId}
            onMaterialsDetected={setMaterialsCount}
          />
        </div>
      </section>

      {/* Recent Conversations — only in hero state */}
      {!chatActive && user && conversations.length > 0 && (
        <section className="pb-[var(--space-2xl)]">
          <div className="u-container max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/40 font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Recent conversations
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className="flex items-start gap-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 px-4 py-3 transition-all group"
                >
                  <MessageSquare className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 mt-0.5 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white/70 text-sm font-medium truncate group-hover:text-white transition-colors">
                      {conv.title}
                    </p>
                    <p className="text-white/25 text-xs mt-0.5">{formatRelativeTime(conv.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
