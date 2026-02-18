'use client';

import { useRef, useEffect, useState } from 'react';
import { useAgentRun } from '@/hooks/useAgentRun';
import { supabase } from '@/lib/supabase';
import { toAgentRequest } from './types';
import { useGuidedBot } from './useGuidedBot';
import BotMessage, { TypingIndicator } from './BotMessage';
import UserMessage from './UserMessage';
import BotInput from './BotInput';
import ProjectCards from './ProjectCards';
import ScopeInput from './ScopeInput';
import LocationInput from './LocationInput';
import ToolsInput from './ToolsInput';
import PreferenceCards from './PreferenceCards';
import ProjectBrief from './ProjectBrief';
import AgentProgress from '@/components/AgentProgress';
import ReportView from '@/components/ReportView';
import { LogIn } from 'lucide-react';

export default function GuidedBot() {
  const bot = useGuidedBot();
  const agentRun = useAgentRun();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [bot.messages, bot.isTyping, agentRun.phases, agentRun.overallProgress]);

  // Watch for pipeline completion — show report when ready
  useEffect(() => {
    if (agentRun.reportId && !agentRun.isRunning && bot.pipelineState === 'running') {
      // Report may already be inline from SSE; fetch only if missing
      if (!agentRun.report) {
        agentRun.fetchReport(agentRun.reportId);
      }
      bot.setPipelineComplete();
    }
  }, [agentRun.reportId, agentRun.report, agentRun.isRunning, bot.pipelineState]);

  const handleBuildPlan = async () => {
    const request = toAgentRequest(bot.gathered);
    bot.startPipeline();
    await agentRun.startRun(request);
  };

  // Render the interactive component for a message
  const renderComponent = (componentKey: string | undefined, messageIndex: number) => {
    if (!componentKey) return null;

    // Only render interactive components on the last message with that key
    const isLatest = bot.messages
      .slice(messageIndex + 1)
      .every(m => m.component !== componentKey);

    if (!isLatest && componentKey !== 'agent-progress') return null;

    switch (componentKey) {
      case 'project-cards':
        return <ProjectCards onSelectProject={bot.handleProjectSelect} />;
      case 'scope-input':
        return <ScopeInput projectType={bot.gathered.projectType || 'general'} onSubmit={bot.handleScopeSubmit} />;
      case 'location-input':
        return <LocationInput onSubmit={bot.handleLocationSubmit} />;
      case 'tools-input':
        return <ToolsInput onSubmit={bot.handleToolsSubmit} onSkip={bot.handleToolsSkip} />;
      case 'experience-cards':
        return <PreferenceCards type="experience" onSelect={bot.handleExperienceSelect} />;
      case 'budget-cards':
        return <PreferenceCards type="budget" onSelect={bot.handleBudgetSelect} />;
      case 'project-brief':
        return (
          <ProjectBrief
            gathered={bot.gathered}
            onEdit={bot.handleEdit}
            onSubmit={handleBuildPlan}
            isSubmitting={agentRun.isRunning}
          />
        );
      case 'agent-progress':
        return (
          <div className="rounded-xl overflow-hidden border border-[#D4C8B8]">
            <AgentProgress
              phases={agentRun.phases}
              overallProgress={agentRun.overallProgress}
              projectDescription={bot.gathered.projectDescription || bot.gathered.projectType || 'DIY Project'}
              location={bot.gathered.city && bot.gathered.state ? `${bot.gathered.city}, ${bot.gathered.state}` : ''}
              error={agentRun.error}
              isCancelling={agentRun.isCancelling}
              onCancel={() => agentRun.cancel()}
              onRetry={agentRun.runId ? () => agentRun.retryRun(agentRun.runId!) : undefined}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Show report view when pipeline completes
  if (bot.pipelineState === 'complete' && agentRun.report) {
    return (
      <div className="flex flex-col">
        {/* Compact conversation summary */}
        <div className="bg-[#FDFBF7] border-b border-[#D4C8B8] p-4">
          <p className="text-sm text-[#5C4D42]">
            Your project plan for <strong>{bot.gathered.projectType || 'DIY Project'}</strong> in{' '}
            <strong>{bot.gathered.city}, {bot.gathered.state}</strong> is ready!
          </p>
        </div>

        {/* Report */}
        <div className="min-h-[600px]">
          <ReportView
            report={agentRun.report}
            onApplyToProject={() => {
              if (agentRun.reportId) {
                agentRun.applyToProject(agentRun.reportId);
              }
            }}
            onBack={() => {
              agentRun.reset();
              window.location.reload();
            }}
          />
        </div>

        {/* Auth CTA for unauthenticated users */}
        {!isAuthenticated && (
          <div className="bg-[#FDF8F3] border-t border-[#D4C8B8] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-[#5C4D42]">
                Sign in to save your project plan, track materials, and access it later.
              </p>
              <a
                href="/chat"
                className="flex items-center gap-2 px-4 py-2 bg-[#C67B5C] text-white text-sm font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[70vh] min-h-[300px]"
      >
        {bot.messages.map((message, i) => {
          if (message.sender === 'bot') {
            return (
              <BotMessage key={message.id} content={message.content} animate={i > 0}>
                {renderComponent(message.component, i)}
              </BotMessage>
            );
          }
          return <UserMessage key={message.id} content={message.content} />;
        })}

        {(bot.isTyping || bot.isParsingFreeform) && <TypingIndicator />}
      </div>

      {/* Input — only show during conversational phases */}
      {bot.pipelineState === 'idle' && bot.phase === 'project' && (
        <BotInput
          phase={bot.phase}
          onSend={bot.handleTextInput}
          disabled={bot.isTyping || bot.isParsingFreeform}
        />
      )}
    </div>
  );
}
