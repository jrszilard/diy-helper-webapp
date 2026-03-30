'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowUp, FolderPlus, ShoppingCart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import SaveToProjectModal from '@/components/SaveToProjectModal';
import { extractMaterialsData } from '@/components/ChatMessages';
import type { ExtractedMaterials } from '@/types';

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

const MATERIALS_KEYWORDS = ["you'll need", "you will need", "materials list", "shopping list", "supplies needed", "materials needed", "items needed", "tools needed"];

export default function LandingQuickChat({ initialConversationId }: { initialConversationId?: string } = {}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [extractedMaterials, setExtractedMaterials] = useState<ExtractedMaterials | null>(null);
  const [isExtractingMaterials, setIsExtractingMaterials] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialConversationId) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      try {
        const res = await fetch(`/api/conversations/${initialConversationId}/messages`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const msgs: Array<{ role: string; content: string }> = data.messages ?? data;
        if (msgs.length > 0) setMessages(msgs as Message[]);
      } catch {}
    });
  }, [initialConversationId]);

  const defaultProjectName = messages.find(m => m.role === 'user')?.content.slice(0, 60) ?? '';

  // Check if the last assistant message likely has materials
  const hasMaterialsInChat = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return false;
    const lower = lastAssistant.content.toLowerCase();
    return MATERIALS_KEYWORDS.some(kw => lower.includes(kw));
  }, [messages]);

  const storeSessionHandoff = (projectId: string) => {
    if (conversationId) sessionStorage.setItem('diy-helper-conversation-id', conversationId);
    if (messages.length > 0) sessionStorage.setItem('diy-helper-chat-messages', JSON.stringify(messages));
    sessionStorage.setItem('diy-helper-project-id', projectId);
  };

  const handleSaved = (projectId: string) => {
    setSavedProjectId(projectId);
    storeSessionHandoff(projectId);
  };

  const handleMaterialsSaved = async (projectId: string) => {
    setSavedProjectId(projectId);
    storeSessionHandoff(projectId);

    if (extractedMaterials && userId) {
      const items = extractedMaterials.materials.map(mat => ({
        project_id: projectId,
        user_id: userId,
        product_name: mat.name,
        quantity: parseInt(mat.quantity) || 1,
        category: mat.category || 'General',
        price: mat.estimated_price ? parseFloat(mat.estimated_price.replace(/[^0-9.]/g, '')) || null : null,
        required: mat.required !== false,
      }));
      await supabase.from('shopping_list_items').insert(items);
    }
  };

  const handleSaveMaterials = useCallback(async () => {
    if (isExtractingMaterials) return;

    // Use already-extracted materials if available
    if (extractedMaterials) {
      setShowMaterialsModal(true);
      return;
    }

    // Check for embedded JSON in the last assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      const inline = extractMaterialsData(lastAssistant.content);
      if (inline && inline.materials.length > 0) {
        setExtractedMaterials(inline);
        setShowMaterialsModal(true);
        return;
      }
    }

    // Fall back to the extract API
    setIsExtractingMaterials(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch('/api/extract-materials', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationContext: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.materials?.length > 0) {
          setExtractedMaterials(data);
          setShowMaterialsModal(true);
        } else {
          setError('No materials list found in this conversation.');
        }
      } else {
        setError('Could not extract materials. Please try again.');
      }
    } catch {
      setError('Could not extract materials. Please try again.');
    } finally {
      setIsExtractingMaterials(false);
    }
  }, [isExtractingMaterials, extractedMaterials, messages]);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || input).trim();
    if (!message || isStreaming) return;

    setInput('');
    setError(null);
    setExtractedMaterials(null);
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
        // Auto-detect embedded materials JSON
        const inline = extractMaterialsData(accumulated);
        if (inline && inline.materials.length > 0) {
          setExtractedMaterials(inline);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Something went wrong. Please try again.');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [input, isStreaming, messages]);

  const hasConversation = messages.length > 0;
  const showMaterialsButton = userId && hasMaterialsInChat && !savedProjectId;
  const showSaveButton = userId && !showMaterialsButton && !savedProjectId;

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3'
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
            <div className="max-w-[85%] bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3">
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

      {/* Actions */}
      {hasConversation && !isStreaming && (
        <div className="flex items-center gap-3 flex-wrap">
          {showMaterialsButton && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={isExtractingMaterials ? undefined : ShoppingCart}
              iconSize={16}
              onClick={handleSaveMaterials}
              disabled={isExtractingMaterials}
            >
              {isExtractingMaterials ? (
                <span className="flex items-center gap-2"><Spinner size="sm" /> Extracting...</span>
              ) : (
                'Save Materials'
              )}
            </Button>
          )}
          {showSaveButton && (
            <Button variant="primary" size="sm" leftIcon={FolderPlus} iconSize={16} onClick={() => setShowSaveModal(true)}>
              Save to Project
            </Button>
          )}
        </div>
      )}

      {/* Save to Project modal (no materials) */}
      {userId && (
        <SaveToProjectModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          userId={userId}
          defaultName={defaultProjectName}
          onSaved={handleSaved}
        />
      )}

      {/* Save Materials modal */}
      {userId && (
        <SaveToProjectModal
          isOpen={showMaterialsModal}
          onClose={() => setShowMaterialsModal(false)}
          userId={userId}
          defaultName={extractedMaterials?.project_description || defaultProjectName}
          onSaved={handleMaterialsSaved}
        />
      )}

      {/* Input area */}
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
          className="w-full bg-transparent text-earth-cream placeholder-earth-cream/40 text-base resize-none focus:outline-none disabled:opacity-50"
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

      {/* Popular question chips */}
      {!hasConversation && (
        <div className="grid grid-cols-2 gap-2">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q);
                handleSend(q);
              }}
              className="rounded-2xl bg-white/10 hover:bg-white/15 text-left transition-all p-4 text-earth-cream font-semibold text-sm leading-tight"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
