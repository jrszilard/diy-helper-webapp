'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, FolderPlus, ShoppingCart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useChat } from '@/hooks/useChat';
import { useAgentRun } from '@/hooks/useAgentRun';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import SaveToProjectModal from '@/components/SaveToProjectModal';
import IntentSignal from '@/components/IntentSignal';
import PlanningCTA from '@/components/PlanningCTA';
import AgentProgress from '@/components/AgentProgress';
import ReportView from '@/components/ReportView';
import type { IntentType } from '@/lib/intelligence/types';
import type { StartAgentRunRequest } from '@/lib/agents/types';

interface SuggestionChip {
  emoji: string;
  text: string;
}

interface LandingQuickChatProps {
  initialConversationId?: string;
  onFirstMessage?: () => void;
  onMaterialsDetected?: (count: number) => void;
  suggestionChips?: SuggestionChip[];
}

export default function LandingQuickChat({
  initialConversationId,
  onFirstMessage,
  onMaterialsDetected,
  suggestionChips,
}: LandingQuickChatProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [detectedIntent, setDetectedIntent] = useState<IntentType | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSentFirstMessage = useRef(false);

  const chat = useChat({
    projectId: undefined,
    conversationId: initialConversationId,
  });

  const agentRun = useAgentRun();

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, chat.streamingContent, agentRun.phases]);

  // Detect first message for hero morph
  useEffect(() => {
    if (chat.messages.length > 0 && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      onFirstMessage?.();
    }
  }, [chat.messages.length, onFirstMessage]);

  // Notify parent about extracted materials
  useEffect(() => {
    if (chat.extractedMaterials?.materials?.length) {
      onMaterialsDetected?.(chat.extractedMaterials.materials.length);
    }
  }, [chat.extractedMaterials, onMaterialsDetected]);

  // Detect planning ready marker in assistant messages
  useEffect(() => {
    if (!isPlanning) return;
    const lastAssistant = [...chat.messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.content.includes('---PLANNING_READY---')) {
      triggerAgentPipeline();
    }
  }, [chat.messages, isPlanning]);

  const triggerAgentPipeline = useCallback(async () => {
    if (agentRun.isRunning) return;

    const allContent = chat.messages.map(m => m.content).join('\n');
    const cityMatch = allContent.match(/(?:in|near|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})/);
    const projectDesc = chat.messages.find(m => m.role === 'user')?.content || 'DIY Project';
    const budgetMatch = allContent.toLowerCase().match(/\b(budget|mid-range|premium)\b/);
    const expMatch = allContent.toLowerCase().match(/\b(beginner|intermediate|advanced)\b/);

    const request: StartAgentRunRequest = {
      projectDescription: projectDesc.slice(0, 500),
      city: cityMatch?.[1] || '',
      state: cityMatch?.[2] || '',
      budgetLevel: (budgetMatch?.[1] as 'budget' | 'mid-range' | 'premium') || 'mid-range',
      experienceLevel: (expMatch?.[1] as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
    };

    await agentRun.startRun(request);
  }, [chat.messages, agentRun]);

  const handleStartPlanning = useCallback(() => {
    setIsPlanning(true);
    chat.sendMessageWithContent("Yes, let's create a full project plan!");
  }, [chat]);

  const handleSend = useCallback(() => {
    chat.sendMessage();
  }, [chat]);

  const handleChipClick = useCallback((text: string) => {
    chat.sendMessageWithContent(text);
  }, [chat]);

  const defaultProjectName = chat.messages.find(m => m.role === 'user')?.content.slice(0, 60) ?? '';
  const hasConversation = chat.messages.length > 0;
  const showMaterialsButton = userId && chat.showMaterialsBanner && !savedProjectId;

  // Agent pipeline: show report when complete
  if (agentRun.report) {
    return (
      <div className="space-y-4">
        <ReportView
          report={agentRun.report}
          onBack={() => agentRun.reset()}
          reportId={agentRun.reportId || undefined}
          isAuthenticated={!!userId}
        />
      </div>
    );
  }

  // Agent pipeline: show progress when running
  if (agentRun.isRunning || agentRun.phases.length > 0) {
    return (
      <div className="space-y-4">
        <AgentProgress
          phases={agentRun.phases}
          overallProgress={agentRun.overallProgress}
          projectDescription={chat.messages.find(m => m.role === 'user')?.content || ''}
          location=""
          error={agentRun.error}
          onCancel={() => agentRun.cancel()}
          onRetry={agentRun.runId ? () => agentRun.retryRun(agentRun.runId!) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto space-y-3">
        {chat.messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5'
                    : 'bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content.replace(/---PLANNING_READY---/g, '')}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>

            {/* Intent micro-signal after first assistant message */}
            {msg.role === 'assistant' && idx === 1 && detectedIntent && (
              <IntentSignal intent={detectedIntent} />
            )}

            {/* Action buttons after last assistant message */}
            {msg.role === 'assistant' && idx === chat.messages.length - 1 && !chat.isLoading && (
              <div className="flex items-center gap-2 mt-2 ml-1 flex-wrap">
                {showMaterialsButton && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={ShoppingCart}
                    iconSize={16}
                    onClick={chat.handleAutoExtractMaterials}
                    disabled={chat.isAutoExtracting}
                  >
                    {chat.isAutoExtracting ? (
                      <span className="flex items-center gap-2"><Spinner size="sm" /> Extracting...</span>
                    ) : (
                      'Save Materials'
                    )}
                  </Button>
                )}
                {userId && !savedProjectId && !showMaterialsButton && hasConversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={FolderPlus}
                    iconSize={16}
                    onClick={() => setShowSaveModal(true)}
                    className="bg-white/8 text-white/70 hover:text-white hover:bg-white/15 border border-white/10"
                  >
                    Save to Project
                  </Button>
                )}
                {detectedIntent === 'full_project' && !isPlanning && (
                  <PlanningCTA onStartPlanning={handleStartPlanning} isPlanning={isPlanning} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming content */}
        {chat.isStreaming && chat.streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{chat.streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {chat.isLoading && !chat.streamingContent && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <Spinner size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {chat.failedMessage && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm">
          Failed to send message.
          <button onClick={chat.handleRetry} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white/10 rounded-2xl p-4">
        <textarea
          value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={hasConversation ? 'Ask a follow-up...' : 'Describe your project or ask a question...'}
          className="w-full bg-transparent text-earth-cream placeholder-earth-cream/40 text-base resize-none focus:outline-none disabled:opacity-50"
          disabled={chat.isLoading}
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            disabled={chat.isLoading || !chat.input.trim()}
            aria-label="Send message"
            className={`p-2 rounded-xl transition-all ${
              chat.input.trim() && !chat.isLoading
                ? 'bg-terracotta text-white hover:bg-terracotta-dark'
                : 'text-white/30 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggestion chips */}
      {!hasConversation && suggestionChips && (
        <div className="grid grid-cols-2 gap-2">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip.text)}
              className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-left transition-all p-4 text-earth-cream font-semibold text-sm leading-tight"
            >
              <span className="mr-1.5">{chip.emoji}</span>
              {chip.text}
            </button>
          ))}
        </div>
      )}

      {/* Save to Project modal */}
      {userId && (
        <SaveToProjectModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          userId={userId}
          defaultName={defaultProjectName}
          onSaved={(projectId) => {
            setSavedProjectId(projectId);
            setShowSaveModal(false);
          }}
        />
      )}
    </div>
  );
}
