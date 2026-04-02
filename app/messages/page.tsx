'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, LogIn } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import DIYerHeader from '@/components/DIYerHeader';
import AuthButton from '@/components/AuthButton';
import MessageList from '@/components/marketplace/MessageList';

interface Thread {
  id: string;
  contextType?: string;
  otherUserId: string;
  otherUserName: string;
  messageCount: number;
  unreadCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    attachments?: string[];
  };
}

export default function DIYerMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email, name: user.user_metadata?.display_name });
      }
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email, name: u.user_metadata?.display_name } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function fetchThreads() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/messages', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setThreads(data.threads || data || []);
        }
      } catch {
        // ignore
      }
    }
    fetchThreads();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-earth-brown-dark">
        <DIYerHeader />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <EmptyState
            icon={LogIn}
            title="Sign in to view messages"
            description="You need to be signed in to access your messages."
            action={<AuthButton user={null} externalShowAuth={showAuth} onAuthToggle={setShowAuth} />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" href="/" leftIcon={ArrowLeft} size="sm" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10" />
          <h2 className="text-2xl font-bold text-white">My Messages</h2>
        </div>

        <Card surface rounded="xl" padding="none">
          <MessageList threads={threads} basePath="/messages" />
        </Card>
      </div>
    </div>
  );
}
