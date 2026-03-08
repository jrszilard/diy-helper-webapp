'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Plus, Trash2, X, Clock, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  project_id: string | null;
}

interface ConversationListProps {
  userId: string | undefined;
  onSelectConversation: (conversationId: string, messages: Message[]) => void;
  onNewChat: () => void;
  currentConversationId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationList({
  userId,
  onSelectConversation,
  onNewChat,
  currentConversationId,
  isOpen,
  onClose,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      return refreshed?.access_token || null;
    } catch {
      return null;
    }
  };

  const loadConversations = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadConversations();
    }
  }, [isOpen, userId]);

  const handleSelectConversation = async (conversationId: string) => {
    setLoadingConversationId(conversationId);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const messages: Message[] = (data.messages || []).map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        }));
        onSelectConversation(conversationId, messages);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      setLoadingConversationId(null);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation? This cannot be undone.')) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#3E2723]/50 z-50 flex justify-end">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full max-w-md bg-[#FDFBF7] h-full overflow-hidden flex flex-col shadow-xl relative animate-slide-in-right">
        {/* Header */}
        <div className="bg-[#5D7B93] text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Conversation History</h2>
            <p className="text-[#C4D8E8] text-sm">{conversations.length} conversations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#4A6275] rounded-lg transition-colors"
            aria-label="Close conversation history"
          >
            <X size={24} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-[#D4C8B8]">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#C67B5C] text-white py-3 rounded-xl hover:bg-[#A65D3F] transition-colors font-medium"
          >
            <Plus size={20} />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#7D6B5D]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto text-[#D4C8B8] mb-4" size={48} />
              <p className="text-[#3E2723] mb-2 font-medium">No conversations yet</p>
              <p className="text-sm text-[#7D6B5D]">
                Start chatting to see your history here
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`group relative p-4 rounded-xl cursor-pointer transition ${
                    currentConversationId === conversation.id
                      ? 'bg-[#E8F0F5] border-2 border-[#5D7B93]'
                      : 'bg-white border-2 border-transparent hover:bg-[#F5F0E6] border-[#D4C8B8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {loadingConversationId === conversation.id ? (
                          <Loader2 size={16} className="animate-spin text-[#5D7B93] flex-shrink-0" />
                        ) : (
                          <MessageSquare size={16} className="text-[#5D7B93] flex-shrink-0" />
                        )}
                        <span className="font-semibold text-sm text-[#3E2723] truncate">
                          {conversation.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-6">
                        <Clock size={12} className="text-[#A89880]" />
                        <span className="text-xs text-[#A89880]">
                          {new Date(conversation.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[#FADDD0] rounded-lg transition"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={16} className="text-[#B8593B]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
