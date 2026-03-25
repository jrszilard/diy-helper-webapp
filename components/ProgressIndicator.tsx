'use client';

import { CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

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
    <div className={`bg-earth-cream border border-earth-sand rounded-lg p-4 mb-4 ${className}`}>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={`${step.step}-${idx}`}
            className={`flex items-center gap-3 transition-opacity duration-300 ${
              step.completed ? 'opacity-60' : ''
            }`}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-forest-green flex-shrink-0" />
            ) : (
              <span className="text-lg flex-shrink-0 w-5 text-center">{step.icon}</span>
            )}
            <span
              className={`text-sm ${
                step.completed ? 'text-earth-brown' : 'text-foreground font-medium'
              }`}
            >
              {step.message}
            </span>
            {!step.completed && idx === steps.length - 1 && (
              <Spinner size="sm" className="text-terracotta ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
