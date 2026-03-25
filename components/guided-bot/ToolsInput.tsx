'use client';

import { useState } from 'react';

interface ToolsInputProps {
  onSubmit: (tools: string) => void;
  onSkip: () => void;
}

export default function ToolsInput({ onSubmit, onSkip }: ToolsInputProps) {
  const [tools, setTools] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tools.trim()) {
      onSubmit(tools.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1">
          Tools & materials you already have
        </label>
        <textarea
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          placeholder="e.g., drill, circular saw, leftover deck screws, tape measure"
          rows={3}
          className="w-full px-3 py-2.5 text-sm text-white placeholder-white/40 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-[#C67B5C] resize-none"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white/60 border border-white/20 hover:bg-white/10 transition-colors"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={!tools.trim()}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tools.trim()
              ? 'bg-[#C67B5C] text-white hover:bg-[#A65D3F]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </form>
  );
}
