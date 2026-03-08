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
    <form onSubmit={handleSubmit} className="bg-white border border-[#D4C8B8] rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-[#5C4D42] mb-1">
          Tools & materials you already have
        </label>
        <textarea
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          placeholder="e.g., drill, circular saw, leftover deck screws, tape measure"
          rows={3}
          className="w-full px-3 py-2.5 text-sm text-[#3E2723] placeholder-[#7D6B5D] bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg focus:outline-none focus:border-[#C67B5C] resize-none"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#5C4D42] border border-[#D4C8B8] hover:bg-[#E8E0D4] transition-colors"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={!tools.trim()}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tools.trim()
              ? 'bg-[#C67B5C] text-white hover:bg-[#A65D3F]'
              : 'bg-[#E8DFD0] text-[#7D6B5D] cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </form>
  );
}
