'use client';

import { useState } from 'react';
import { X, Sparkles, MapPin, User, DollarSign, Clock } from 'lucide-react';
import type { StartAgentRunRequest } from '@/lib/agents/types';

interface AgentIntakeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: StartAgentRunRequest) => void;
  isRunning: boolean;
  initialDescription?: string;
}

export default function AgentIntakeForm({
  isOpen,
  onClose,
  onSubmit,
  isRunning,
  initialDescription = '',
}: AgentIntakeFormProps) {
  const [description, setDescription] = useState(initialDescription);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'mid-range' | 'premium'>('mid-range');
  const [timeframe, setTimeframe] = useState('');

  if (!isOpen) return null;

  const canSubmit = description.trim().length >= 10 && city.trim() && state.trim() && !isRunning;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      projectDescription: description.trim(),
      city: city.trim(),
      state: state.trim(),
      budgetLevel,
      experienceLevel,
      timeframe: timeframe.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-earth-sand">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-blue flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Plan My Project</h2>
              <p className="text-sm text-earth-brown">AI agents will research, design, and price your project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E8E0D4] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-earth-brown" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Project Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              What do you want to build?
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Build a 12x16 composite deck attached to my house with stairs and railing"
              className="w-full px-4 py-3 rounded-lg border border-earth-sand bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-slate-blue resize-none"
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted mt-1">
              Be specific — include dimensions, materials, and special requirements
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <MapPin size={16} className="text-slate-blue" />
              Location
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
                className="flex-1 px-4 py-2.5 rounded-lg border border-earth-sand bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-slate-blue"
                maxLength={100}
              />
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="State"
                className="w-24 px-4 py-2.5 rounded-lg border border-earth-sand bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-slate-blue"
                maxLength={50}
              />
            </div>
            <p className="text-xs text-muted mt-1">
              Used to look up local building codes and find nearby stores
            </p>
          </div>

          {/* Experience Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <User size={16} className="text-slate-blue" />
              Your experience level
            </label>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(level)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    experienceLevel === level
                      ? 'bg-slate-blue text-white border-slate-blue'
                      : 'bg-white text-earth-brown border-earth-sand hover:border-slate-blue'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <DollarSign size={16} className="text-slate-blue" />
              Budget preference
            </label>
            <div className="flex gap-2">
              {(['budget', 'mid-range', 'premium'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setBudgetLevel(level)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    budgetLevel === level
                      ? 'bg-slate-blue text-white border-slate-blue'
                      : 'bg-white text-earth-brown border-earth-sand hover:border-slate-blue'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe (optional) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Clock size={16} className="text-slate-blue" />
              Timeframe
              <span className="text-xs font-normal text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              placeholder="e.g., 2 weekends, 1 week, before summer"
              className="w-full px-4 py-2.5 rounded-lg border border-earth-sand bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-slate-blue"
              maxLength={100}
            />
          </div>

          {/* What will happen */}
          <div className="bg-[var(--status-research-bg)] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">What happens next:</h3>
            <ol className="text-sm text-slate-blue space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Research building codes, permits, and best practices for your area</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Design a step-by-step plan with materials and tools needed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Find real prices at local stores and check your inventory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <span>Generate a comprehensive project report you can follow</span>
              </li>
            </ol>
            <p className="text-xs text-earth-brown mt-3">This typically takes 2-4 minutes.</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
              canSubmit
                ? 'bg-slate-blue hover:bg-slate-blue-dark shadow-lg'
                : 'bg-muted cursor-not-allowed'
            }`}
          >
            <Sparkles size={20} />
            Start Planning
          </button>
        </form>
      </div>
    </div>
  );
}
