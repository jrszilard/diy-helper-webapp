'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-2xl mx-auto px-4 py-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#D4C8B8]">
          <Link
            href="/messages"
            className="p-1.5 hover:bg-[#E8DFD0] rounded-lg transition-colors text-[#7D6B5D]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#3E2723]">
              {otherUserName || 'Conversation'}
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl border border-[#D4C8B8] mt-4 overflow-hidden min-h-0">
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            onSend={handleSend}
            sending={sending}
          />
        </div>
      </div>
    </div>
  );
}
