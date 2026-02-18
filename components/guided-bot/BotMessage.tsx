'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface BotMessageProps {
  content: string;
  children?: React.ReactNode; // interactive component rendered below text
  animate?: boolean;
}

export default function BotMessage({ content, children, animate = true }: BotMessageProps) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [animate]);

  return (
    <div
      className={`flex justify-start transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="max-w-[90%] sm:max-w-[85%]">
        <div className="bg-[#FDFBF7] border border-[#D4C8B8] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="prose prose-sm max-w-none prose-headings:text-[#3E2723] prose-p:text-[#5A4A3B] prose-p:leading-relaxed prose-strong:text-[#3E2723] prose-li:text-[#5A4A3B]">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#FDFBF7] border border-[#D4C8B8] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#B0A696] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#B0A696] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#B0A696] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
