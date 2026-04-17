'use client';

import type { IntentType } from '@/lib/intelligence/types';

const INTENT_LABELS: Record<IntentType, string> = {
  quick_question: 'Quick question',
  troubleshooting: 'Troubleshooting',
  mid_project: 'Mid-project help',
  full_project: 'Project planning',
};

interface IntentSignalProps {
  intent: IntentType;
  onCorrect?: () => void;
}

export default function IntentSignal({ intent, onCorrect }: IntentSignalProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/30 mt-1 ml-1">
      <span>Identified as: {INTENT_LABELS[intent]}</span>
      {onCorrect && (
        <button
          onClick={onCorrect}
          className="underline hover:text-white/50 transition-colors"
        >
          Not right?
        </button>
      )}
    </div>
  );
}
