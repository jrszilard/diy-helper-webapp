'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';

export interface ProgressStep {
  step: string;
  message: string;
  icon: string;
  completed: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

export default function ProgressIndicator({ steps, className = '' }: ProgressIndicatorProps) {
  if (steps.length === 0) return null;

  return (
    <div className={`bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4 ${className}`}>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={`${step.step}-${idx}`}
            className={`flex items-center gap-3 transition-opacity duration-300 ${
              step.completed ? 'opacity-60' : ''
            }`}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <span className="text-lg flex-shrink-0 w-5 text-center">{step.icon}</span>
            )}
            <span
              className={`text-sm ${
                step.completed ? 'text-stone-500' : 'text-stone-700 font-medium'
              }`}
            >
              {step.message}
            </span>
            {!step.completed && idx === steps.length - 1 && (
              <Loader2 className="h-4 w-4 animate-spin text-amber-600 ml-auto flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
