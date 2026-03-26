'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
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

  // Auto-scroll to bottom on new messages or streaming content
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
      <p className="text-lg font-semibold text-foreground">
        Ask anything about your home project
      </p>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'bg-[var(--surface)] text-foreground border border-earth-sand rounded-2xl rounded-bl-md px-4 py-3'
              }`}
            >
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

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-[var(--surface)] text-foreground border border-earth-sand rounded-2xl rounded-bl-md px-4 py-3">
              <div className="prose prose-sm max-w-none prose-stone">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] border border-earth-sand rounded-2xl rounded-bl-md px-4 py-3">
              <Spinner size="sm" color="primary" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Continue in full chat */}
      {hasConversation && !isStreaming && (
        <Button variant="tertiary" size="sm" rightIcon={ArrowRight} onClick={handleContinue}>
          Continue in full chat
        </Button>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={hasConversation ? 'Ask a follow-up...' : 'What size wire for a 20-amp circuit?'}
          className="flex-1 px-4 py-3 border border-earth-sand rounded-xl bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:border-terracotta"
          disabled={isStreaming}
        />
        <Button
          variant="primary"
          size="lg"
          onClick={() => handleSend()}
          disabled={isStreaming || !input.trim()}
          leftIcon={isStreaming ? undefined : Send}
        >
          {isStreaming ? <Spinner size="sm" color="default" className="text-white" /> : null}
        </Button>
      </div>

      {/* Popular question chips */}
      {!hasConversation && (
        <div className="flex flex-wrap gap-2">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="xs"
              onClick={() => {
                setInput(q);
                handleSend(q);
              }}
            >
              {q}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
