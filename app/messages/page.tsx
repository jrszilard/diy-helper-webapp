'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, LogIn } from 'lucide-react';
import Link from 'next/link';
import MessageList from '@/components/marketplace/MessageList';
import AuthButton from '@/components/AuthButton';

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
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email });
      }
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email });
      } else {
        setUser(null);
      }
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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <LogIn size={40} className="mx-auto text-[#D4C8B8] mb-4" />
            <h1 className="text-xl font-bold text-[#3E2723] mb-2">Sign in to view messages</h1>
            <p className="text-sm text-[#7D6B5D] mb-6">
              You need to be signed in to access your messages.
            </p>
            <AuthButton
              user={null}
              externalShowAuth={showAuth}
              onAuthToggle={setShowAuth}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/chat"
            className="p-1.5 hover:bg-[#E8DFD0] rounded-lg transition-colors text-[#7D6B5D]"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-[#3E2723]">My Messages</h1>
        </div>

        {/* Thread list */}
        <div className="bg-white rounded-xl border border-[#D4C8B8] overflow-hidden">
          <MessageList threads={threads} basePath="/messages" />
        </div>
      </div>
    </div>
  );
}
