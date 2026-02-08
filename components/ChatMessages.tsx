'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import VideoResults from './VideoResults';
import ProgressIndicator, { ProgressStep } from './ProgressIndicator';
import { RefreshCw } from 'lucide-react';
import { ExtractedMaterials, Video } from '@/types';

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
}

// Module-scope regex patterns (compiled once)
const INVENTORY_PATTERN = /---INVENTORY_UPDATE---\n([\s\S]*?)\n---END_INVENTORY_UPDATE---/;
const MATERIALS_PATTERN = /---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/;
const VIDEO_PATTERN = /\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/s;

const CLEAN_PATTERNS = [
  /---MATERIALS_DATA---[\s\S]*?---END_MATERIALS_DATA---/g,
  /---INVENTORY_UPDATE---[\s\S]*?---END_INVENTORY_UPDATE---/g,
  /---INVENTORY_DATA---[\s\S]*?---END_INVENTORY_DATA---/g,
  /\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/gs,
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
    const jsonMatch = content.match(VIDEO_PATTERN);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.success && data.videos && Array.isArray(data.videos)) {
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
    <p className={`mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className={`list-disc ml-4 mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className={`list-decimal ml-4 mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className={role === 'user' ? 'text-white' : 'text-[#3E2723]'}>{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className={`text-xl font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className={`text-lg font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className={`text-md font-bold mb-2 ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</h3>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className={`font-bold ${role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className={`italic ${role === 'user' ? 'text-white' : 'text-[#5C4D42]'}`}>{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className={`px-1 py-0.5 rounded text-sm ${
      role === 'user' ? 'bg-[#A65D3F] text-white' : 'bg-[#E8DFD0] text-[#3E2723]'
    }`}>{children}</code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      className={`underline ${role === 'user' ? 'text-white hover:text-[#FFE0D0]' : 'text-[#5D7B93] hover:text-[#4A6275]'}`}
      target="_blank"
      rel="noopener noreferrer"
    >{children}</a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className={`border-l-4 pl-4 italic ${
      role === 'user' ? 'border-[#A65D3F] text-white' : 'border-[#C67B5C] text-[#5C4D42]'
    }`}>{children}</blockquote>
  ),
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="text-[#A89880] line-through">{children}</del>
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
}: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isStreaming && (
        <div className="text-center text-[#7D6B5D] mt-8">
          <p className="text-lg mb-2">Welcome to DIY Helper!</p>
          <p className="text-sm">Ask me about any home improvement project.</p>
          <p className="text-xs text-[#A89880] mt-2">
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
                msg.role === 'user' ? 'bg-[#C67B5C] text-white p-4' : 'bg-transparent'
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

              <div className={msg.role === 'user' ? '' : 'bg-[#FDFBF7] border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4'}>
                <div className={`prose prose-sm max-w-none ${
                  msg.role === 'user' ? 'prose-invert' : 'prose-stone'
                }`}>
                  <ReactMarkdown components={MarkdownComponents(msg.role)}>
                    {cleanMessageContent(msg.content)}
                  </ReactMarkdown>
                </div>
                {failedMessage && idx === messages.length - 1 && msg.role === 'assistant' && (
                  <button
                    onClick={onRetry}
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-[#B8593B] hover:bg-[#FADDD0] rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
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
              <div className="bg-[#FDFBF7] border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4">
                <div className="prose prose-sm max-w-none prose-stone">
                  <ReactMarkdown>
                    {cleanMessageContent(streamingContent)}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!streamingContent && progressSteps.length === 0 && (
              <div className="bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
