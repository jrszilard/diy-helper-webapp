'use client';

import { useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import type { BotPhase } from './types';

interface BotInputProps {
  phase: BotPhase;
  onSend: (text: string) => void;
  disabled?: boolean;
}

const PLACEHOLDERS: Record<BotPhase, string> = {
  project: 'Describe your project...',
  scope: 'Enter dimensions and details...',
  location: 'Enter your city and state...',
  tools: 'List your tools and materials...',
  'preferences-experience': 'Select your experience level above...',
  'preferences-budget': 'Select your budget preference above...',
  summary: 'Review your project summary above...',
};

export default function BotInput({ phase, onSend, disabled = false }: BotInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && !disabled) {
        onSend(text.trim());
        setText('');
      }
    }
  }, [text, disabled, onSend]);

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 rounded-2xl p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDERS[phase]}
        disabled={disabled}
        rows={3}
        className="w-full bg-transparent text-white placeholder-white/40 text-base resize-none focus:outline-none disabled:opacity-50"
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className={`p-2 rounded-xl transition-all ${
            text.trim() && !disabled
              ? 'bg-terracotta text-white hover:bg-terracotta-dark'
              : 'text-white/30 cursor-not-allowed'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
