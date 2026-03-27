'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DIYerHeader from '@/components/DIYerHeader';
import MessageThread from '@/components/marketplace/MessageThread';

interface ApiMessage {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  senderName: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

interface Message {
  id: string;
  senderUserId: string;
  senderName?: string;
  content: string;
  attachments?: string[];
  createdAt: string;
}

export default function DIYerThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [otherUserName, setOtherUserName] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/messages/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const apiMessages: ApiMessage[] = data.messages || data || [];

        const mapped: Message[] = apiMessages.map(m => ({
          id: m.id,
          senderUserId: m.senderUserId,
          senderName: m.senderName,
          content: m.content,
          attachments: m.attachments,
          createdAt: m.createdAt,
        }));

        setMessages(mapped);

        // Determine other user's name from messages
        if (mapped.length > 0 && currentUserId) {
          const otherMsg = mapped.find(m => m.senderUserId !== currentUserId);
          if (otherMsg?.senderName) {
            setOtherUserName(otherMsg.senderName);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [threadId, currentUserId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchMessages();
    }
  }, [currentUserId, fetchMessages]);

  const handleSend = async (content: string, attachments: string[]) => {
    try {
      setSending(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      await fetch(`/api/messages/${threadId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, attachments }),
      });

      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-earth-brown-dark">
        <DIYerHeader />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" className="text-terracotta" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-earth-brown-dark">
      <DIYerHeader />
      <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--blueprint-grid-major)]">
          <Button
            variant="ghost"
            href="/messages"
            leftIcon={ArrowLeft}
            size="sm"
            className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10"
          />
          <h2 className="text-lg font-bold text-white">
            {otherUserName || 'Conversation'}
          </h2>
        </div>

        {/* Messages */}
        <Card surface rounded="xl" padding="none" className="flex-1 mt-4 overflow-hidden">
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            onSend={handleSend}
            sending={sending}
          />
        </Card>
      </div>
    </div>
  );
}
