'use client';

import { useState, useCallback, useRef } from 'react';
import type { BotPhase, BotMessage, GatheredData } from './types';
import { INITIAL_GATHERED } from './types';
import * as msg from './botMessages';

let messageIdCounter = 0;
function nextId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

export type PipelineState = 'idle' | 'running' | 'complete';

export interface GuidedBotState {
  phase: BotPhase;
  messages: BotMessage[];
  gathered: GatheredData;
  isTyping: boolean;
  pipelineState: PipelineState;
  isParsingFreeform: boolean;
}

export function useGuidedBot() {
  const [state, setState] = useState<GuidedBotState>(() => ({
    phase: 'project',
    messages: [
      {
        id: nextId(),
        sender: 'bot',
        content: msg.greeting,
        component: 'project-cards',
        timestamp: Date.now(),
      },
    ],
    gathered: { ...INITIAL_GATHERED },
    isTyping: false,
    pipelineState: 'idle',
    isParsingFreeform: false,
  }));

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmitting = useRef(false);

  // Helper: mark all interactive messages as completed (collapses their components)
  const markCompleted = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m =>
        m.component ? { ...m, completed: true } : m
      ),
    }));
  }, []);

  // Helper: add a user message
  const addUserMessage = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: nextId(),
        sender: 'user',
        content,
        timestamp: Date.now(),
      }],
    }));
  }, []);

  // Helper: show typing then add bot message
  const addBotMessage = useCallback((content: string, component?: string): Promise<void> => {
    return new Promise((resolve) => {
      setState(prev => ({ ...prev, isTyping: true }));
      typingTimerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isTyping: false,
          messages: [...prev.messages, {
            id: nextId(),
            sender: 'bot',
            content,
            component,
            timestamp: Date.now(),
          }],
        }));
        resolve();
      }, 350);
    });
  }, []);

  // ── Phase Handlers ──

  const handleProjectSelect = useCallback(async (type: string, description: string, _templateId?: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    addUserMessage(description.length > 80 ? description.slice(0, 80) + '...' : description);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, projectType: type, projectDescription: description },
    }));
    await addBotMessage(msg.projectConfirmation(type.charAt(0).toUpperCase() + type.slice(1)));
    await addBotMessage(msg.scopePrompt(type), 'scope-input');
    setState(prev => ({ ...prev, phase: 'scope' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleFreeformProject = useCallback(async (text: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    addUserMessage(text);
    setState(prev => ({ ...prev, isParsingFreeform: true }));

    try {
      const response = await fetch('/api/guided-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, phase: 'project' }),
      });

      let projectType = 'general';
      let description = text;

      if (response.ok) {
        const data = await response.json();
        projectType = data.projectType || 'general';
        description = data.description || text;
      }

      setState(prev => ({
        ...prev,
        isParsingFreeform: false,
        gathered: { ...prev.gathered, projectType, projectDescription: description },
      }));

      await addBotMessage(msg.freeformConfirmation(projectType, description));
      await addBotMessage(msg.scopePrompt(projectType), 'scope-input');
      setState(prev => ({ ...prev, phase: 'scope' }));
    } catch {
      // Fallback — use raw text
      setState(prev => ({
        ...prev,
        isParsingFreeform: false,
        gathered: { ...prev.gathered, projectType: 'general', projectDescription: text },
      }));
      await addBotMessage(msg.projectConfirmation('DIY'));
      await addBotMessage(msg.scopePrompt('general'), 'scope-input');
      setState(prev => ({ ...prev, phase: 'scope' }));
    }
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleScopeSubmit = useCallback(async (dimensions: string, details: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    const summary = details ? `${dimensions} — ${details}` : dimensions;
    addUserMessage(summary);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, dimensions, scopeDetails: details || null },
    }));
    await addBotMessage(msg.locationPrompt, 'location-input');
    setState(prev => ({ ...prev, phase: 'location' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleLocationSubmit = useCallback(async (city: string, stateName: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    addUserMessage(`${city}, ${stateName}`);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, city, state: stateName },
    }));
    await addBotMessage(msg.toolsPrompt, 'tools-input');
    setState(prev => ({ ...prev, phase: 'tools' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleToolsSubmit = useCallback(async (tools: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    addUserMessage(tools);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, existingTools: tools },
    }));
    await addBotMessage(msg.experiencePrompt, 'experience-cards');
    setState(prev => ({ ...prev, phase: 'preferences-experience' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleToolsSkip = useCallback(async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    addUserMessage("I don't have any yet");
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, existingTools: null },
    }));
    await addBotMessage(msg.experiencePrompt, 'experience-cards');
    setState(prev => ({ ...prev, phase: 'preferences-experience' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleExperienceSelect = useCallback(async (value: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    const labels: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    addUserMessage(labels[value] || value);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, experienceLevel: value as GatheredData['experienceLevel'] },
    }));
    await addBotMessage(msg.budgetPrompt, 'budget-cards');
    setState(prev => ({ ...prev, phase: 'preferences-budget' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleBudgetSelect = useCallback(async (value: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    markCompleted();
    const labels: Record<string, string> = { budget: 'Budget', 'mid-range': 'Mid-Range', premium: 'Premium' };
    addUserMessage(labels[value] || value);
    setState(prev => ({
      ...prev,
      gathered: { ...prev.gathered, budgetLevel: value as GatheredData['budgetLevel'] },
    }));
    await addBotMessage(msg.summaryIntro, 'project-brief');
    setState(prev => ({ ...prev, phase: 'summary' }));
    isSubmitting.current = false;
  }, [addUserMessage, addBotMessage, markCompleted]);

  const handleEdit = useCallback(async (field: string) => {
    // Map field to the corresponding phase
    const phaseMap: Record<string, BotPhase> = {
      project: 'project',
      scope: 'scope',
      location: 'location',
      tools: 'tools',
      'preferences-experience': 'preferences-experience',
      'preferences-budget': 'preferences-budget',
    };

    const componentMap: Record<string, string> = {
      project: 'project-cards',
      scope: 'scope-input',
      location: 'location-input',
      tools: 'tools-input',
      'preferences-experience': 'experience-cards',
      'preferences-budget': 'budget-cards',
    };

    const msgMap: Record<string, string> = {
      project: msg.greeting,
      scope: msg.scopePrompt(state.gathered.projectType || 'general'),
      location: msg.locationPrompt,
      tools: msg.toolsPrompt,
      'preferences-experience': msg.experiencePrompt,
      'preferences-budget': msg.budgetPrompt,
    };

    const targetPhase = phaseMap[field];
    if (!targetPhase) return;

    addUserMessage(`Editing ${field}...`);
    await addBotMessage(msgMap[field] || 'Let\'s update that.', componentMap[field]);
    setState(prev => ({ ...prev, phase: targetPhase }));
  }, [state.gathered.projectType, addUserMessage, addBotMessage]);

  const startPipeline = useCallback(() => {
    setState(prev => ({ ...prev, pipelineState: 'running' }));
    addBotMessage(msg.pipelineStarted, 'agent-progress');
  }, [addBotMessage]);

  const setPipelineComplete = useCallback(() => {
    setState(prev => ({ ...prev, pipelineState: 'complete' }));
  }, []);

  // Generic text input handler (routes to appropriate phase handler)
  const handleTextInput = useCallback((text: string) => {
    if (state.phase === 'project') {
      handleFreeformProject(text);
    }
    // Other phases have structured inputs — text input is a fallback
  }, [state.phase, handleFreeformProject]);

  return {
    ...state,
    handleProjectSelect,
    handleFreeformProject,
    handleScopeSubmit,
    handleLocationSubmit,
    handleToolsSubmit,
    handleToolsSkip,
    handleExperienceSelect,
    handleBudgetSelect,
    handleEdit,
    handleTextInput,
    startPipeline,
    setPipelineComplete,
  };
}
