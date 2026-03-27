'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

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
      {/* Messages */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'bg-white/10 text-white rounded-2xl rounded-bl-md px-4 py-3'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white/10 text-white rounded-2xl rounded-bl-md px-4 py-3">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <Spinner size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Continue in full chat */}
      {hasConversation && !isStreaming && (
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 text-sm font-semibold text-terracotta hover:text-terracotta-dark transition-colors"
        >
          Continue in full chat <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Input area — matches GuidedBot BotInput dark style */}
      <div className="bg-white/10 rounded-2xl p-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={hasConversation ? 'Ask a follow-up...' : 'Ask a quick DIY question...'}
          className="w-full bg-transparent text-white placeholder-white/40 text-base resize-none focus:outline-none disabled:opacity-50"
          disabled={isStreaming}
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            aria-label="Send message"
            className={`p-2 rounded-xl transition-all ${
              input.trim() && !isStreaming
                ? 'bg-terracotta text-white hover:bg-terracotta-dark'
                : 'text-white/30 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Popular question chips — match ProjectCards dark style */}
      {!hasConversation && (
        <div className="grid grid-cols-2 gap-2">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q);
                handleSend(q);
              }}
              className="rounded-2xl bg-white/10 hover:bg-white/15 text-left transition-all p-4 text-white font-semibold text-sm leading-tight"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
