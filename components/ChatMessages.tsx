'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VideoResults from './VideoResults';
import ProgressIndicator, { ProgressStep } from './ProgressIndicator';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { ExtractedMaterials, Video } from '@/types';
import { sanitizeHref } from '@/lib/security';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  progressSteps: ProgressStep[];
  failedMessage: string | null;
  onRetry: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  conversationDomain?: string;
  user?: { id: string } | null;
}

// Module-scope regex patterns (compiled once)
const INVENTORY_PATTERN = /---INVENTORY_UPDATE---\n([\s\S]*?)\n---END_INVENTORY_UPDATE---/;
const MATERIALS_PATTERN = /---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/;
const VIDEO_PATTERN = /---VIDEO_DATA---\n([\s\S]*?)\n---END_VIDEO_DATA---/;

const CLEAN_PATTERNS = [
  /---MATERIALS_DATA---[\s\S]*?---END_MATERIALS_DATA---/g,
  /---INVENTORY_UPDATE---[\s\S]*?---END_INVENTORY_UPDATE---/g,
  /---INVENTORY_DATA---[\s\S]*?---END_INVENTORY_DATA---/g,
  /---VIDEO_DATA---[\s\S]*?---END_VIDEO_DATA---/g,
  // Streaming: partial markers where closing tag hasn't arrived yet
  /---MATERIALS_DATA---[\s\S]*$/g,
  /---INVENTORY_UPDATE---[\s\S]*$/g,
  /---INVENTORY_DATA---[\s\S]*$/g,
  /---VIDEO_DATA---[\s\S]*$/g,
  // Stray closing markers that appear alone
  /---END_MATERIALS_DATA---/g,
  /---END_INVENTORY_UPDATE---/g,
  /---END_INVENTORY_DATA---/g,
  /---END_VIDEO_DATA---/g,
];

export function cleanMessageContent(content: string): string {
  let result = content;
  for (const pattern of CLEAN_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

export function extractMaterialsData(content: string): ExtractedMaterials | null {
  const match = content.match(MATERIALS_PATTERN);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('Failed to parse materials data:', e);
    }
  }
  return null;
}

export function parseVideoResults(content: string): { found: boolean; videos?: Video[]; query?: string } {
  try {
    // Primary: delimiter-based extraction (injected by SSE handler)
    const delimiterMatch = content.match(VIDEO_PATTERN);
    if (delimiterMatch && delimiterMatch[1]) {
      const data = JSON.parse(delimiterMatch[1].trim());
      if (data.success && data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
        return { found: true, videos: data.videos, query: data.query || 'Project Tutorial' };
      }
    }
  } catch (e) {
    console.error('Error parsing video results:', e);
  }
  return { found: false };
}

export function detectInventoryUpdate(content: string): { added: string[]; existing: string[] } | null {
  const inventoryMatch = content.match(INVENTORY_PATTERN);
  if (inventoryMatch) {
    try {
      const data = JSON.parse(inventoryMatch[1]);
      if (data.added?.length > 0 || data.existing?.length > 0) {
        return data;
      }
    } catch (e) {
      console.error('Error parsing inventory update:', e);
    }
  }
  return null;
}

const MarkdownComponents = (role: 'user' | 'assistant') => ({
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className={`mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className={`list-disc ml-4 mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className={`list-decimal ml-4 mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className={role === 'user' ? 'text-white' : 'text-foreground'}>{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className={`text-xl font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className={`text-lg font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className={`text-md font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</h3>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className={`font-bold ${role === 'user' ? 'text-white' : 'text-foreground'}`}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className={`italic ${role === 'user' ? 'text-white' : 'text-warm-brown'}`}>{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className={`px-1 py-0.5 rounded text-sm ${
      role === 'user' ? 'bg-terracotta-dark text-white' : 'bg-earth-tan text-foreground'
    }`}>{children}</code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={sanitizeHref(href)}
      className={`underline ${role === 'user' ? 'text-white hover:text-[#FFE0D0]' : 'text-slate-blue hover:text-slate-blue-dark'}`}
      target="_blank"
      rel="noopener noreferrer"
    >{children}</a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className={`border-l-4 pl-4 italic ${
      role === 'user' ? 'border-terracotta-dark text-white' : 'border-terracotta text-warm-brown'
    }`}>{children}</blockquote>
  ),
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="text-earth-brown-light line-through">{children}</del>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <table className="w-full border-collapse my-3 text-sm">{children}</table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className={`text-left font-bold px-3 py-2 border-b-2 ${
      role === 'user' ? 'text-white border-white/20' : 'text-foreground border-earth-sand'
    }`}>{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className={`px-3 py-2 border-b ${
      role === 'user' ? 'text-white/90 border-white/10' : 'text-foreground border-earth-sand/50'
    }`}>{children}</td>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
});

const ChatMessages = React.memo(function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  progressSteps,
  failedMessage,
  onRetry,
  messagesEndRef,
  conversationDomain,
  user,
}: ChatMessagesProps) {
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isStreaming && (
        <div className="text-center text-earth-brown mt-8">
          <p className="text-lg mb-2">Welcome to DIY Helper!</p>
          <p className="text-sm">Ask me about any home improvement project.</p>
          <p className="text-xs text-earth-brown-light mt-2">
            Tip: Mention tools you own (e.g., &quot;I have a drill&quot;) and I&apos;ll remember them!
          </p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const videoResults = msg.role === 'assistant' ? parseVideoResults(msg.content) : { found: false };

        return (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg ${
                msg.role === 'user' ? 'bg-terracotta text-white p-4' : 'bg-transparent'
              }`}
            >
              {videoResults.found && (
                <div className="mb-4">
                  <VideoResults
                    videos={videoResults.videos || []}
                    projectQuery={videoResults.query || 'Project'}
                  />
                </div>
              )}

              <div className={msg.role === 'user' ? '' : 'bg-surface border border-earth-sand text-foreground rounded-lg p-4'}>
                <div className={`prose prose-sm max-w-none ${
                  msg.role === 'user' ? 'prose-invert' : 'prose-stone'
                }`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents(msg.role)}>
                    {cleanMessageContent(msg.content)}
                  </ReactMarkdown>
                </div>
                {failedMessage && idx === messages.length - 1 && msg.role === 'assistant' && (
                  <button
                    onClick={onRetry}
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-rust hover:bg-[#FADDD0] rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                )}
                {msg.role === 'assistant' && user && conversationDomain && (
                  <div className="mt-1">
                    {acknowledged.has(idx) ? (
                      <span className="text-xs text-forest-green flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Got it, noted for next time
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await fetch('/api/skill-profile/feedback', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ domain: conversationDomain }),
                            });
                            setAcknowledged((prev) => new Set(prev).add(idx));
                          } catch { /* silent */ }
                        }}
                        className="text-xs text-earth-brown-light hover:text-terracotta transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> I already knew this
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Streaming content with progress indicator */}
      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-3xl w-full">
            {progressSteps.length > 0 && (
              <ProgressIndicator steps={progressSteps} />
            )}

            {streamingContent && (
              <div className="bg-surface border border-earth-sand text-foreground rounded-lg p-4">
                <div className="prose prose-sm max-w-none prose-stone">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents('assistant')}>
                    {cleanMessageContent(streamingContent)}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!streamingContent && progressSteps.length === 0 && (
              <div className="bg-surface border border-earth-sand rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-terracotta rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-terracotta rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-terracotta rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});

export default ChatMessages;
