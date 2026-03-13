'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';

const POPULAR_QUESTIONS = [
  'Do I need a permit to finish my basement?',
  'Can I mix PEX and copper pipe?',
  'What size wire for a 20-amp circuit?',
  'How to fix a leaky faucet',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LandingQuickChat() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || input).trim();
    if (!message || isStreaming) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let authHeaders: Record<string, string> = {};
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.access_token) {
          authHeaders = { Authorization: `Bearer ${session.access_token}` };
        }
      } catch {
        // Unauthenticated is fine
      }

      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          message,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          streaming: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('Unable to read response.');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'text':
                accumulated += event.content;
                setStreamingContent(accumulated);
                break;
              case 'error':
                setError(event.content || 'An error occurred.');
                break;
              case 'done':
                if (event.conversationId) {
                  setConversationId(event.conversationId);
                }
                break;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (accumulated) {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Something went wrong. Please try again.');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [input, isStreaming, messages]);

  const handleContinue = () => {
    if (conversationId) {
      sessionStorage.setItem('diy-helper-conversation-id', conversationId);
    }
    if (messages.length > 0) {
      sessionStorage.setItem('diy-helper-chat-messages', JSON.stringify(messages));
    }
    router.push('/chat');
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-[#3E2723]">Ask anything about your home project</p>

      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-lg p-4 ${
            msg.role === 'user'
              ? 'bg-[#C67B5C] text-white'
              : 'bg-white border border-[#D4C8B8] text-[#3E2723]'
          }`}>
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none prose-stone">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {isStreaming && streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-white border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4">
            <div className="prose prose-sm max-w-none prose-stone">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {isStreaming && !streamingContent && (
        <div className="flex justify-start">
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {hasConversation && !isStreaming && (
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 text-[#5D7B93] hover:text-[#4A6275] font-medium text-sm transition-colors"
        >
          Continue this conversation
          <ArrowRight size={14} />
        </button>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={hasConversation ? 'Ask a follow-up...' : 'What size wire for a 20-amp circuit?'}
          className="flex-1 px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          disabled={isStreaming}
        />
        <button
          onClick={() => handleSend()}
          disabled={isStreaming || !input.trim()}
          className={`px-4 py-3 rounded-xl font-semibold text-white transition-colors ${
            isStreaming || !input.trim()
              ? 'bg-[#B0A696] cursor-not-allowed'
              : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
          }`}
        >
          {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {!hasConversation && (
        <div className="flex flex-wrap gap-2">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q);
                handleSend(q);
              }}
              className="px-3 py-1.5 text-sm bg-[#F0E8DC] text-[#5C4D42] rounded-full hover:bg-[#E8DFD0] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
