'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
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

export default function ExpertMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <SectionHeader size="lg" title="Messages" />
      <Card surface rounded="xl" padding="none" className="overflow-hidden">
        <MessageList threads={threads} basePath="/experts/dashboard/messages" />
      </Card>
    </div>
  );
}
