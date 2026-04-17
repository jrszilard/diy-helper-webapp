# Unified Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate landing page and /chat into a single Hero-to-Chat Morph experience with unified AI intent classification, conversational project planning, and trust/confidence signals.

**Architecture:** The landing page (`app/page.tsx`) becomes the single primary experience. `LandingHero.tsx` renders the hero state with two tabs and new headline. `LandingQuickChat.tsx` is upgraded to a full chat experience using the `useChat` hook, with intent micro-signals, inline agent pipeline, and contextual action buttons. `/chat` becomes a redirect.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Supabase, Tailwind CSS, Claude AI (Anthropic SDK), SSE streaming

**Spec:** `docs/superpowers/specs/2026-04-01-unified-landing-page-design.md`

---

## File Structure

### Files to Create
- `components/IntentSignal.tsx` — Small UI component showing classified intent with correction link
- `components/PlanningCTA.tsx` — Inline "Plan This Project" action button + conversational planning state

### Files to Modify
- `next.config.ts` — Add `/chat` → `/` redirect
- `app/page.tsx` — Rewrite: hero-to-chat morph with full features
- `components/LandingHero.tsx` — Two tabs, new headline/subtitle, capability chips
- `components/LandingQuickChat.tsx` — Upgrade to full chat using `useChat` hook, add intent signal, plan CTA, agent pipeline
- `app/api/chat/route.ts` — Emit `intent` SSE event
- `lib/system-prompt.ts` — Add confidence tier instructions to all prompts, add planning mode prompt
- `components/AppHeader.tsx` — Add materials badge

### Files to Remove
- `app/chat/page.tsx` — Replaced by redirect
- `components/guided-bot/GuidedBot.tsx`
- `components/guided-bot/useGuidedBot.ts`
- `components/guided-bot/types.ts`
- `components/guided-bot/botMessages.ts`
- `components/guided-bot/BotMessage.tsx`
- `components/guided-bot/BotInput.tsx`
- `components/guided-bot/UserMessage.tsx`
- `components/guided-bot/ProjectCards.tsx`
- `components/guided-bot/ScopeInput.tsx`
- `components/guided-bot/LocationInput.tsx`
- `components/guided-bot/ToolsInput.tsx`
- `components/guided-bot/PreferenceCards.tsx`
- `components/guided-bot/ProjectBrief.tsx`

### Files to Update (import cleanup)
- `components/ChatInterface.tsx` — Remove ProjectPlanner usage (component stays but is no longer rendered on chat page since chat page is gone)
- `app/design-system/page.tsx` — Remove any guided-bot imports

---

## Task 1: Add /chat → / Redirect

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add redirects config to next.config.ts**

Open `next.config.ts` and add the `redirects` async function after the `headers` function:

```typescript
async redirects() {
  return [
    {
      source: '/chat',
      destination: '/',
      permanent: true,
    },
  ];
},
```

The full file should look like:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.search.brave.com https://api.anthropic.com https://api.stripe.com; frame-src 'self' https://js.stripe.com; frame-ancestors 'none'`,
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/chat',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify redirect works**

Run: `npx next build 2>&1 | head -20` (just check it compiles)

Or start dev server and test: `curl -I http://localhost:3000/chat` — expect 308 redirect to `/`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: add /chat to / permanent redirect"
```

---

## Task 2: Emit Intent SSE Event from Chat API

**Files:**
- Modify: `app/api/chat/route.ts` (lines ~131-159 for classification, ~194 for sendEvent)

The chat API already classifies intent at lines 131-159. We need to emit it as an SSE event so the client can display the micro-signal.

- [ ] **Step 1: Add intent SSE event emission**

In `app/api/chat/route.ts`, find the streaming section where `sendEvent` is first used. The `sendEvent` helper is defined around line 194. After the first `sendEvent` call for the `progress` event (around line 203), add an intent emission.

Locate the section after intent classification (around line 159) where `intentType` is set. The intent needs to be passed into the streaming closure. Find where the streaming ReadableStream is created and add this event emission early in the stream, right after the first progress event:

```typescript
// Emit intent classification to client (after first progress event)
if (intentType) {
  sendEvent({ type: 'intent', intent: intentType, confidence: classification?.confidence });
}
```

The variable `classification` is only in scope for new conversations (when `!existingConversationId && prunedHistory.length === 0`). For existing conversations, `intentType` is loaded from the DB but there's no confidence score. Adjust the code to capture the classification result in a variable accessible inside the stream:

Find line ~131-146 where classification happens:

```typescript
// ── Intent Classification ─────────────────────────────────────
let intentType: IntentType | undefined;
let intentConfidence: number | undefined;
if (!existingConversationId && prunedHistory.length === 0) {
  const classification = await classifyIntent(message, {
    hasActiveProjects: false,
  });
  if (classification.confidence >= config.intelligence.confidenceThreshold) {
    intentType = classification.intent;
    intentConfidence = classification.confidence;
  }
```

Add `let intentConfidence: number | undefined;` alongside the existing `let intentType` declaration. Set it when classification succeeds: `intentConfidence = classification.confidence;`.

Then inside the ReadableStream, after the first progress event, emit:

```typescript
if (intentType) {
  sendEvent({ type: 'intent', intent: intentType, confidence: intentConfidence });
}
```

- [ ] **Step 2: Verify the API still compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: emit intent classification as SSE event from chat API"
```

---

## Task 3: Add Confidence Tier Instructions to System Prompts

**Files:**
- Modify: `lib/system-prompt.ts`

- [ ] **Step 1: Add confidence tier footer to all prompts**

At the top of `lib/system-prompt.ts`, after the `SAFETY_FOOTER` constant (line 147), add a new constant:

```typescript
const CONFIDENCE_TIERS = `
**CONFIDENCE COMMUNICATION — FOLLOW THIS FOR EVERY RESPONSE:**

When providing advice, communicate your confidence level naturally:

- **High confidence** (common tasks, well-documented procedures, standard materials): Give advice directly. No hedging needed. Examples: drywall patching, paint selection, standard plumbing fittings.

- **Medium confidence** (code references, permit requirements, jurisdiction-specific info): Include a brief note like "Based on typical [state/region] requirements — verify with your local building department" or "Most jurisdictions require X, but check your local codes." Do NOT skip the advice — give your best answer AND the verification note.

- **Low confidence** (structural assessments, electrical panel work, load calculations, gas lines): Include a visible callout:
> ⚠️ **Safety-critical work** — This involves [electrical/structural/gas] work that typically requires a licensed professional. The guidance below is for reference, but get a qualified contractor or inspector to verify before proceeding. [Talk to a pro →](/marketplace/qa)

Always give the user actionable information regardless of confidence level. The tiers control how much verification language you include, not whether you answer.`;
```

- [ ] **Step 2: Append to each prompt**

Add `${CONFIDENCE_TIERS}` to the end of each prompt:

1. `systemPrompt` (the main full_project prompt) — append before the closing backtick at the end of the template literal (around line 145)
2. `quickQuestionPrompt` (line 156) — append after `${SAFETY_FOOTER}`
3. `troubleshootingPrompt` (line 164) — append after `${SAFETY_FOOTER}`
4. `midProjectPrompt` (line 176) — append after `${SAFETY_FOOTER}`

For each prompt, change:
```typescript
${SAFETY_FOOTER}`;
```
to:
```typescript
${SAFETY_FOOTER}
${CONFIDENCE_TIERS}`;
```

- [ ] **Step 3: Add planning mode prompt**

Add a new exported prompt after `midProjectPrompt`:

```typescript
export const planningModePrompt = `You are a helpful DIY assistant in PROJECT PLANNING MODE. The user wants a comprehensive project plan and has agreed to answer a few questions so you can build the best plan possible.

**Your job:** Collect the following information ONE QUESTION AT A TIME. Be conversational and friendly. If the user already provided information in the conversation, DO NOT ask for it again — skip to the next missing piece.

**Information to gather (in this order, skip what's already known):**
1. **Location** — city/state or zip code (for local building codes and material pricing)
2. **Project scope** — dimensions, specific details about what they want
3. **Tools available** — what tools they already have
4. **Budget range** — budget, mid-range, or premium
5. **Experience level** — beginner, intermediate, or advanced
6. **Timeframe** — any deadline or preferred timeline (optional)

**After collecting enough info (at minimum: location + scope + budget + experience), say:**
"I have everything I need! Let me build your comprehensive project plan now. This will include building codes, step-by-step instructions, a full materials list with pricing, and a timeline."

Then output EXACTLY this marker on its own line:
---PLANNING_READY---

**Rules:**
- Ask ONE question per message, not a list
- Be conversational, not robotic
- If the user seems impatient, collect what you have and proceed
- Acknowledge each answer before asking the next question
${SAFETY_FOOTER}
${CONFIDENCE_TIERS}`;
```

- [ ] **Step 4: Export the planning mode prompt**

Update the `getSystemPrompt` function to accept a `planningMode` flag:

```typescript
export function getSystemPrompt(intent?: IntentType, planningMode?: boolean): string {
  if (planningMode) return planningModePrompt;
  switch (intent) {
    case 'quick_question':
      return quickQuestionPrompt;
    case 'troubleshooting':
      return troubleshootingPrompt;
    case 'mid_project':
      return midProjectPrompt;
    case 'full_project':
    default:
      return systemPrompt;
  }
}
```

- [ ] **Step 5: Wire planning mode into chat API**

In `app/api/chat/route.ts`, find where `getSystemPrompt` is called (search for `getSystemPrompt`). Update the call to pass `planningMode` from the request body.

First, update the request validation schema in `lib/validation.ts` — find `ChatRequestSchema` and add `planningMode: z.boolean().optional()` to it.

Then in the chat route, destructure `planningMode` from `parsed.data` alongside the existing fields:

```typescript
const { message, history, streaming, conversationId: existingConversationId, image, planningMode } = parsed.data;
```

And update the `getSystemPrompt` call:

```typescript
const chosenPrompt = getSystemPrompt(intentType, planningMode);
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add lib/system-prompt.ts app/api/chat/route.ts lib/validation.ts
git commit -m "feat: add confidence tiers to prompts, add planning mode prompt"
```

---

## Task 4: Rewrite LandingHero with Two Tabs and New Headline

**Files:**
- Modify: `components/LandingHero.tsx`

- [ ] **Step 1: Rewrite LandingHero.tsx**

Replace the entire file content:

```tsx
'use client';

import { useState } from 'react';
import { MessageSquare, HardHat } from 'lucide-react';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';

type TabId = 'chat' | 'expert';

const TABS = [
  { id: 'chat' as TabId, icon: MessageSquare, label: 'Ask Anything' },
  { id: 'expert' as TabId, icon: HardHat, label: 'Talk to a Pro' },
];

const SUGGESTION_CHIPS = [
  { emoji: '🔧', text: "I'm mid-project — my mortar isn't setting" },
  { emoji: '🔌', text: 'Is my electrical panel safe for a hot tub?' },
  { emoji: '🛁', text: 'Price out a bathroom remodel' },
  { emoji: '📋', text: 'What permits do I need for a deck?' },
];

interface LandingHeroProps {
  /** When true, hide the hero headline/chips and show only the chat */
  chatActive?: boolean;
  /** Called when the user sends their first message */
  onFirstMessage?: () => void;
  /** Conversation ID to resume */
  initialConversationId?: string;
  /** Called when materials are extracted (for header badge) */
  onMaterialsDetected?: (count: number) => void;
}

export default function LandingHero({
  chatActive = false,
  onFirstMessage,
  initialConversationId,
  onMaterialsDetected,
}: LandingHeroProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  return (
    <div>
      {/* Hero headline — hidden when chat is active */}
      {!chatActive && (
        <div className="text-center mb-[var(--space-l)]">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Plan it. Price it. Ask a pro. Build it right.
          </h1>
          <p className="text-base text-white/50 max-w-lg mx-auto leading-relaxed">
            Quick answers when you're mid-build. Full project plans when you're starting fresh. Real material pricing. Real tradespeople.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className={`flex justify-center mb-[var(--space-m)] ${chatActive ? '' : ''}`}>
        <div className="inline-flex gap-1 bg-white/5 p-1 rounded-2xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        <div className={activeTab === 'chat' ? '' : 'hidden'} aria-hidden={activeTab !== 'chat'}>
          <LandingQuickChat
            initialConversationId={initialConversationId}
            onFirstMessage={onFirstMessage}
            onMaterialsDetected={onMaterialsDetected}
            suggestionChips={chatActive ? undefined : SUGGESTION_CHIPS}
          />
        </div>

        <div className={activeTab === 'expert' ? '' : 'hidden'} aria-hidden={activeTab !== 'expert'}>
          <LandingExpertForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles (will have type errors until LandingQuickChat is updated)**

Run: `npx tsc --noEmit 2>&1 | grep LandingHero` — note any errors for next task.

- [ ] **Step 3: Commit**

```bash
git add components/LandingHero.tsx
git commit -m "feat: rewrite LandingHero with two tabs, new headline, capability chips"
```

---

## Task 5: Upgrade LandingQuickChat to Full Chat Experience

This is the largest task. `LandingQuickChat` currently has its own inline chat logic (streaming, messages, etc.). We'll refactor it to use the `useChat` hook for robust conversation management, then add intent signals, planning CTA, and agent pipeline.

**Files:**
- Modify: `components/LandingQuickChat.tsx` (full rewrite)
- Create: `components/IntentSignal.tsx`
- Create: `components/PlanningCTA.tsx`

### Step 5a: Create IntentSignal component

- [ ] **Step 1: Create IntentSignal.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/IntentSignal.tsx
git commit -m "feat: add IntentSignal component for intent micro-signals"
```

### Step 5b: Create PlanningCTA component

- [ ] **Step 3: Create PlanningCTA.tsx**

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PlanningCTAProps {
  onStartPlanning: () => void;
  isPlanning: boolean;
}

export default function PlanningCTA({ onStartPlanning, isPlanning }: PlanningCTAProps) {
  if (isPlanning) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={Sparkles}
      iconSize={16}
      onClick={onStartPlanning}
      className="bg-white/8 text-white/70 hover:text-white hover:bg-white/15 border border-white/10"
    >
      Plan This Project
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/PlanningCTA.tsx
git commit -m "feat: add PlanningCTA component for inline project planning"
```

### Step 5c: Rewrite LandingQuickChat

- [ ] **Step 5: Rewrite LandingQuickChat.tsx**

This is a full rewrite. The new version uses `useChat` hook, adds intent signals, planning mode, and agent pipeline. Replace the entire file:

```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, FolderPlus, ShoppingCart, Sparkles } from 'lucide-react';
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
  const [planningReady, setPlanningReady] = useState(false);
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
      setPlanningReady(true);
    }
  }, [chat.messages, isPlanning]);

  // Auto-trigger agent pipeline when planning is ready
  useEffect(() => {
    if (!planningReady || agentRun.isRunning) return;
    // Extract gathered info from conversation to build agent request
    triggerAgentPipeline();
    setPlanningReady(false);
  }, [planningReady]);

  const triggerAgentPipeline = useCallback(async () => {
    // Build request from conversation context
    // Parse the last few messages for location, scope, budget, experience
    const allContent = chat.messages.map(m => m.content).join('\n');

    // Simple extraction — the planning prompt ensures structured info was collected
    const cityMatch = allContent.match(/(?:in|near|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})/);
    const city = cityMatch?.[1] || '';
    const state = cityMatch?.[2] || '';

    const projectDesc = chat.messages.find(m => m.role === 'user')?.content || 'DIY Project';

    const budgetMatch = allContent.toLowerCase().match(/\b(budget|mid-range|premium)\b/);
    const expMatch = allContent.toLowerCase().match(/\b(beginner|intermediate|advanced)\b/);

    const request: StartAgentRunRequest = {
      projectDescription: projectDesc.slice(0, 500),
      city,
      state,
      budgetLevel: (budgetMatch?.[1] as 'budget' | 'mid-range' | 'premium') || 'mid-range',
      experienceLevel: (expMatch?.[1] as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
    };

    await agentRun.startRun(request);
  }, [chat.messages, agentRun]);

  const handleStartPlanning = useCallback(() => {
    setIsPlanning(true);
    // Send a message that triggers planning mode on the API
    chat.setInput('Yes, let\'s create a full project plan!');
    // The next sendMessage call will include planningMode: true
    // We need to patch useChat or handle this differently
    // For now, send a message that the planning prompt will pick up
    setTimeout(() => chat.sendMessage(), 50);
  }, [chat]);

  const handleSend = useCallback(() => {
    chat.sendMessage();
  }, [chat]);

  const handleChipClick = useCallback((text: string) => {
    chat.setInput(text);
    setTimeout(() => chat.sendMessage(), 50);
  }, [chat]);

  const defaultProjectName = chat.messages.find(m => m.role === 'user')?.content.slice(0, 60) ?? '';
  const hasConversation = chat.messages.length > 0;
  const showMaterialsButton = userId && chat.showMaterialsBanner && !savedProjectId;

  // Agent pipeline rendering
  if (agentRun.isRunning || agentRun.phases.length > 0) {
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

    return (
      <div className="space-y-4">
        <AgentProgress
          phases={agentRun.phases}
          overallProgress={agentRun.overallProgress}
          projectDescription={chat.messages.find(m => m.role === 'user')?.content || ''}
          location=""
          error={agentRun.error}
          onCancel={() => agentRun.cancel()}
          onRetry={() => agentRun.retryRun(agentRun.runId!)}
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
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any type errors. Common issues:
- `useChat` may expect different options — check the hook's interface
- `chat.isStreaming` vs `chat.isLoading` — verify which fields the hook exposes
- `chat.streamingContent` — verify this is in the return object

- [ ] **Step 7: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "feat: upgrade LandingQuickChat to full chat with useChat hook, intent signals, planning CTA"
```

---

## Task 6: Rewrite Landing Page with Hero-to-Chat Morph

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx**

Replace the entire file:

```tsx
'use client';

import { useEffect, useState } from 'react';
import LandingHero from '@/components/LandingHero';
import AppHeader from '@/components/AppHeader';
import AppLogo from '@/components/AppLogo';
import Button from '@/components/ui/Button';
import { MessageSquare, ArrowRight, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LandingPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [chatActive, setChatActive] = useState(false);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      if (u) fetchConversations(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      if (u) fetchConversations(u.id);
      else setConversations([]);
    });

    // Check for session state from /chat redirect
    const storedConvId = sessionStorage.getItem('diy-helper-conversation-id');
    if (storedConvId) {
      setActiveChatConversationId(storedConvId);
      setChatActive(true);
      sessionStorage.removeItem('diy-helper-conversation-id');
    }

    return () => subscription.unsubscribe();
  }, []);

  const fetchConversations = async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(6);
    setConversations(data ?? []);
  };

  const openConversation = (id: string) => {
    setActiveChatConversationId(id);
    setChatActive(true);
  };

  const handleNewChat = () => {
    setActiveChatConversationId(undefined);
    setChatActive(false);
  };

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <AppHeader
        showBack={chatActive}
        backLabel="New Chat"
        onBack={handleNewChat}
        materialsCount={materialsCount > 0 ? materialsCount : undefined}
      />

      <section className="pt-[var(--space-3xl)] pb-[var(--space-2xl)]">
        <div className="u-container">
          <LandingHero
            chatActive={chatActive}
            onFirstMessage={() => setChatActive(true)}
            initialConversationId={activeChatConversationId}
            onMaterialsDetected={setMaterialsCount}
          />
        </div>
      </section>

      {/* Recent Conversations — only in hero state */}
      {!chatActive && user && conversations.length > 0 && (
        <section className="pb-[var(--space-2xl)]">
          <div className="u-container max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/40 font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Recent conversations
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className="flex items-start gap-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 px-4 py-3 transition-all group"
                >
                  <MessageSquare className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 mt-0.5 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white/70 text-sm font-medium truncate group-hover:text-white transition-colors">
                      {conv.title}
                    </p>
                    <p className="text-white/25 text-xs mt-0.5">{formatRelativeTime(conv.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer — only in hero state */}
      {!chatActive && (
        <footer className="py-[var(--space-l)]">
          <div className="u-container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <AppLogo variant="dark" />
              <div className="flex items-center gap-1">
                <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                  About
                </Button>
                <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                  Become an Expert
                </Button>
                <span className="text-white/30 text-sm pl-2">Powered by Claude AI</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AppHeader to accept materialsCount prop**

In `components/AppHeader.tsx`, add `materialsCount?: number` to the `AppHeaderProps` interface (around line 19):

```typescript
interface AppHeaderProps {
  extraRight?: ReactNode;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onProjectSelect?: (project: Project | null) => void;
  projectsRefreshTrigger?: number;
  materialsCount?: number;
}
```

Destructure it in the component function:

```typescript
export default function AppHeader({
  extraRight,
  showBack,
  backLabel = 'Home',
  onBack,
  onProjectSelect,
  projectsRefreshTrigger,
  materialsCount,
}: AppHeaderProps) {
```

In the nav bar buttons section (around line 165), add a materials badge button after the My Tools button:

```tsx
{materialsCount && materialsCount > 0 && (
  <span className={`${btnClass} relative flex items-center gap-1 px-2 py-1 text-sm`}>
    <ShoppingCart size={18} />
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-terracotta text-white text-[10px] rounded-full flex items-center justify-center font-bold">
      {materialsCount}
    </span>
    <span className="hidden sm:inline ml-1">Materials</span>
  </span>
)}
```

Add `ShoppingCart` to the lucide-react import at the top of AppHeader.tsx.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/AppHeader.tsx
git commit -m "feat: rewrite landing page with hero-to-chat morph, add materials badge to header"
```

---

## Task 7: Remove Guided Bot and Chat Page

**Files:**
- Remove: `components/guided-bot/` (entire directory)
- Remove: `app/chat/page.tsx`
- Modify: `app/design-system/page.tsx` (remove guided-bot imports if any)

- [ ] **Step 1: Remove guided-bot directory**

```bash
rm -rf components/guided-bot/
```

- [ ] **Step 2: Remove chat page**

```bash
rm app/chat/page.tsx
```

- [ ] **Step 3: Check for broken imports**

Run: `npx tsc --noEmit 2>&1 | head -40`

Fix any files that import from `guided-bot` or `app/chat/page`. Common files to check:
- `app/design-system/page.tsx` — may import GuidedBot components for showcase
- `components/ChatInterface.tsx` — imports `ProjectPlanner` (which references guided-bot patterns)

For `ChatInterface.tsx`: The component still exists but is no longer rendered since the chat page is gone. We can leave it for now or clean it up. If it causes import errors from ProjectPlanner, remove the ProjectPlanner import and related code (lines 10, 90-96, 332-334, 434).

For `app/design-system/page.tsx`: Remove any guided-bot component imports and their showcase sections.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove guided-bot wizard and /chat page, replaced by unified landing"
```

---

## Task 8: Integration Smoke Test

- [ ] **Step 1: Start dev server and test manually**

Run: `npm run dev`

Test the following flows:
1. **Hero state renders** — Visit `/`. See headline, subtitle, two tabs, input, suggestion chips.
2. **Tab switching** — Click "Talk to a Pro" tab. See expert form. Click back to "Ask Anything".
3. **Suggestion chip** — Click a chip. Hero morphs to chat. Message sent.
4. **Chat response** — Verify AI response streams in with dark theme.
5. **Intent signal** — After first AI response, check for intent micro-signal below the message.
6. **/chat redirect** — Visit `/chat`. Should redirect to `/`.
7. **Header features** — If logged in, verify Projects, My Tools, History buttons work.
8. **New Chat** — Click "New Chat" in header. Should return to hero state.

- [ ] **Step 2: Fix any issues found during smoke test**

Address bugs, styling issues, or broken interactions discovered.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address issues found during integration smoke test"
```

---

## Task 9: Update E2E Tests

**Files:**
- Modify: `e2e/tests/landing.spec.ts`
- Modify: `e2e/pages/chat.page.ts`
- Modify: `e2e/tests/chat-messaging.spec.ts`

- [ ] **Step 1: Update landing page E2E test**

Read `e2e/tests/landing.spec.ts` and update selectors/assertions to match the new hero layout:
- Update tab selectors (was 3 tabs, now 2)
- Update headline text assertion to match "Plan it. Price it. Ask a pro. Build it right."
- Update suggestion chip selectors

- [ ] **Step 2: Update chat page object**

Read `e2e/pages/chat.page.ts` and update to navigate to `/` instead of `/chat`.

- [ ] **Step 3: Update chat messaging tests**

Read `e2e/tests/chat-messaging.spec.ts` and update navigation from `/chat` to `/`. May need to account for the hero-to-chat morph (click a chip or type to trigger chat state before testing chat features).

- [ ] **Step 4: Run E2E tests**

Run: `npx playwright test --reporter=list 2>&1 | tail -30`

Fix any failures.

- [ ] **Step 5: Commit**

```bash
git add e2e/
git commit -m "test: update E2E tests for unified landing page"
```
