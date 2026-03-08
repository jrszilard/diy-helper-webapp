'use client';

import { useState, useCallback } from 'react';
import { Send } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-[#FDFBF7] border-t border-[#D4C8B8]">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDERS[phase]}
        disabled={disabled}
        className="flex-1 px-4 py-3 text-sm text-[#3E2723] placeholder-[#7D6B5D] bg-white border border-[#D4C8B8] rounded-xl focus:outline-none focus:border-[#C67B5C] disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        aria-label="Send message"
        className={`p-3 rounded-xl transition-all duration-200 ${
          text.trim() && !disabled
            ? 'bg-[#C67B5C] text-white shadow-sm hover:bg-[#A65D3F]'
            : 'bg-[#E8DFD0] text-[#7D6B5D] cursor-not-allowed'
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
