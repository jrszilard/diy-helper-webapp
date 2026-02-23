'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  senderUserId: string;
  content: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessageThread({ messages, currentUserId }: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    // Parent component handles the actual send via API
    // This component emits via a custom event or callback
    const event = new CustomEvent('message-send', { detail: { content: newMessage } });
    window.dispatchEvent(event);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[#7D6B5D] py-8">No messages yet</p>
        )}
        {messages.map(msg => {
          const isCurrentUser = msg.senderUserId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isCurrentUser
                    ? 'bg-[#4A7C59] text-white'
                    : 'bg-[#E8DFD0] text-[#3E2723]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  isCurrentUser ? 'text-white/70' : 'text-[#B0A696]'
                }`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#D4C8B8] p-3 bg-[#FDFBF7]">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`p-2 rounded-lg transition-colors ${
              newMessage.trim()
                ? 'bg-[#5D7B93] text-white hover:bg-[#4A6578]'
                : 'bg-[#E8DFD0] text-[#B0A696] cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
