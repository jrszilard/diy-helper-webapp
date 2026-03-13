# Landing Page Three-Path Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page hero with a three-path tabbed entry (Quick Answer, Plan a Project, Ask an Expert) that showcases the app's full capabilities.

**Architecture:** A `LandingHero` container manages tab state and renders three child components: `LandingQuickChat` (mini streaming chat), the existing `GuidedBot` (lazy-mounted), and `LandingExpertForm` (simplified Q&A form). The chat uses the existing `/api/chat` route with intent classification. Expert form hands off to `/marketplace/qa` via URL params.

**Tech Stack:** Next.js 16 (App Router), TypeScript, TailwindCSS, Anthropic SSE streaming, Supabase auth

**Spec:** `docs/superpowers/specs/2026-03-12-landing-page-three-path-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `components/LandingHero.tsx` | Three-tab container with path switching |
| Create | `components/LandingQuickChat.tsx` | Mini chat with SSE streaming, popular question chips, "Continue" handoff |
| Create | `components/LandingExpertForm.tsx` | Simplified expert Q&A form with social proof |
| Modify | `app/page.tsx` | Replace `<GuidedBot>` in hero with `<LandingHero>` |
| Modify | `components/marketplace/QASubmitForm.tsx` | Add `initialQuestion` and `initialCategory` optional props |
| Modify | `app/marketplace/qa/page.tsx` | Read URL query params, pass to QASubmitForm |

---

## Chunk 1: Landing Page Three-Path Redesign

### Task 1: LandingQuickChat Component

The most complex new component — a mini streaming chat. Build this first since it's independent.

**Files:**
- Create: `components/LandingQuickChat.tsx`

- [ ] **Step 1: Create the component with input and question chips**

```tsx
// components/LandingQuickChat.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';

const POPULAR_QUESTIONS = [
  'Do I need a permit to finish my basement?',
  'Can I mix PEX and copper pipe?',
  'What size wire for a 20-amp circuit?',
  'How to fix a leaky faucet',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LandingQuickChat() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || input).trim();
    if (!message || isStreaming) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Get auth token if available (not required)
      let authHeaders: Record<string, string> = {};
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.access_token) {
          authHeaders = { Authorization: `Bearer ${session.access_token}` };
        }
      } catch {
        // Unauthenticated is fine
      }

      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          message,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          streaming: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('Unable to read response.');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'text':
                accumulated += event.content;
                setStreamingContent(accumulated);
                break;
              case 'error':
                setError(event.content || 'An error occurred.');
                break;
              case 'done':
                if (event.conversationId) {
                  setConversationId(event.conversationId);
                }
                break;
              // Ignore: progress, tool_result, warning
            }
          } catch {
            // Ignore parse errors for non-JSON lines
          }
        }
      }

      // Finalize message
      if (accumulated) {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Something went wrong. Please try again.');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [input, isStreaming, messages]);

  const handleContinue = () => {
    if (conversationId) {
      sessionStorage.setItem('diy-helper-conversation-id', conversationId);
    }
    if (messages.length > 0) {
      sessionStorage.setItem('diy-helper-chat-messages', JSON.stringify(messages));
    }
    router.push('/chat');
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-[#3E2723]">Ask anything about your home project</p>

      {/* Messages */}
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-lg p-4 ${
            msg.role === 'user'
              ? 'bg-[#C67B5C] text-white'
              : 'bg-white border border-[#D4C8B8] text-[#3E2723]'
          }`}>
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none prose-stone">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {/* Streaming response */}
      {isStreaming && streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-white border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4">
            <div className="prose prose-sm max-w-none prose-stone">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Streaming indicator (no content yet) */}
      {isStreaming && !streamingContent && (
        <div className="flex justify-start">
          <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Continue button */}
      {hasConversation && !isStreaming && (
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 text-[#5D7B93] hover:text-[#4A6275] font-medium text-sm transition-colors"
        >
          Continue this conversation
          <ArrowRight size={14} />
        </button>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={hasConversation ? 'Ask a follow-up...' : 'What size wire for a 20-amp circuit?'}
          className="flex-1 px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          disabled={isStreaming}
        />
        <button
          onClick={() => handleSend()}
          disabled={isStreaming || !input.trim()}
          className={`px-4 py-3 rounded-xl font-semibold text-white transition-colors ${
            isStreaming || !input.trim()
              ? 'bg-[#B0A696] cursor-not-allowed'
              : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
          }`}
        >
          {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Popular question chips */}
      {!hasConversation && (
        <div className="flex flex-wrap gap-2">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q);
                handleSend(q);
              }}
              className="px-3 py-1.5 text-sm bg-[#F0E8DC] text-[#5C4D42] rounded-full hover:bg-[#E8DFD0] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit components/LandingQuickChat.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "feat: add LandingQuickChat — mini streaming chat for landing page"
```

---

### Task 2: LandingExpertForm Component

**Files:**
- Create: `components/LandingExpertForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/LandingExpertForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Star, MessageSquare, Zap } from 'lucide-react';

const CATEGORIES = [
  'electrical', 'plumbing', 'hvac', 'carpentry', 'flooring',
  'roofing', 'concrete', 'drywall', 'painting', 'tile',
  'landscaping', 'general',
];

export default function LandingExpertForm() {
  const router = useRouter();
  const [questionText, setQuestionText] = useState('');
  const [tradeCategory, setTradeCategory] = useState('general');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (questionText.trim().length < 20) {
      setValidationError('Please describe your question in at least 20 characters.');
      return;
    }
    setValidationError(null);

    const params = new URLSearchParams();
    params.set('question', questionText.trim());
    params.set('trade', tradeCategory);
    router.push(`/marketplace/qa?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-[#3E2723]">Get a verified expert&apos;s take on your project</p>

      {/* Question textarea */}
      <div>
        <textarea
          value={questionText}
          onChange={e => { setQuestionText(e.target.value); setValidationError(null); }}
          rows={3}
          placeholder="Describe your question or project..."
          className="w-full px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50 resize-none"
        />
        {validationError && (
          <p className="text-xs text-red-600 mt-1">{validationError}</p>
        )}
      </div>

      {/* Trade category */}
      <div>
        <label className="block text-sm font-medium text-[#3E2723] mb-1">Trade Category</label>
        <select
          value={tradeCategory}
          onChange={e => setTradeCategory(e.target.value)}
          className="w-full px-4 py-3 border border-[#D4C8B8] rounded-xl bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className="flex items-center gap-2 bg-[#4A7C59] text-white px-6 py-3 rounded-xl hover:bg-[#2D5A3B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
      >
        Submit to Expert Marketplace
        <ArrowRight size={16} />
      </button>

      {/* Social proof */}
      <div className="flex flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <Star size={14} className="text-[#C6943E] fill-[#C6943E]" />
          <span className="font-semibold text-[#3E2723]">4.9</span> avg rating
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <MessageSquare size={14} className="text-[#5D7B93]" />
          <span className="font-semibold text-[#3E2723]">127</span> questions answered
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#7D6B5D]">
          <Zap size={14} className="text-[#C67B5C]" />
          First question <span className="font-semibold text-[#3E2723]">free</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LandingExpertForm.tsx
git commit -m "feat: add LandingExpertForm — simplified expert Q&A entry"
```

---

### Task 3: LandingHero Container Component

**Files:**
- Create: `components/LandingHero.tsx`

- [ ] **Step 1: Create the container component**

```tsx
// components/LandingHero.tsx
'use client';

import { useState } from 'react';
import { Zap, ClipboardList, HardHat } from 'lucide-react';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';
import GuidedBot from './guided-bot/GuidedBot';

type PathType = 'quick' | 'plan' | 'expert';

const PATHS = [
  {
    id: 'quick' as PathType,
    icon: Zap,
    title: 'Quick Answer',
    description: 'Get instant help with local codes & safety',
  },
  {
    id: 'plan' as PathType,
    icon: ClipboardList,
    title: 'Plan a Project',
    description: 'Full plan with costs, codes, and materials',
  },
  {
    id: 'expert' as PathType,
    icon: HardHat,
    title: 'Ask an Expert',
    description: "Get a pro's verified opinion on your project",
  },
];

export default function LandingHero() {
  const [activePath, setActivePath] = useState<PathType>('quick');
  const [planMounted, setPlanMounted] = useState(false);

  const handlePathChange = (path: PathType) => {
    setActivePath(path);
    if (path === 'plan' && !planMounted) {
      setPlanMounted(true);
    }
  };

  return (
    <div>
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-2">
          Your DIY project starts here
        </h1>
        <p className="text-lg text-[#5C4D42]">
          From quick answers to complete projects, backed by real experts
        </p>
      </div>

      {/* Path tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {PATHS.map(path => (
          <button
            key={path.id}
            onClick={() => handlePathChange(path.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              activePath === path.id
                ? 'border-[#C67B5C] bg-[#FFF8F2] shadow-sm'
                : 'border-[#D4C8B8] bg-white hover:bg-[#FDFBF7]'
            }`}
          >
            <path.icon
              size={24}
              className={activePath === path.id ? 'text-[#C67B5C]' : 'text-[#7D6B5D]'}
            />
            <span className={`text-sm font-semibold ${
              activePath === path.id ? 'text-[#3E2723]' : 'text-[#7D6B5D]'
            }`}>
              {path.title}
            </span>
            <span className="text-xs text-[#A89880] text-center hidden sm:block">
              {path.description}
            </span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div>
        {/* Quick Answer — always mounted */}
        <div className={activePath === 'quick' ? '' : 'hidden'} aria-hidden={activePath !== 'quick'}>
          <LandingQuickChat />
        </div>

        {/* Plan a Project — lazy mounted */}
        {planMounted && (
          <div className={activePath === 'plan' ? '' : 'hidden'} aria-hidden={activePath !== 'plan'}>
            <GuidedBot />
          </div>
        )}

        {/* Ask an Expert — always mounted */}
        <div className={activePath === 'expert' ? '' : 'hidden'} aria-hidden={activePath !== 'expert'}>
          <LandingExpertForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LandingHero.tsx
git commit -m "feat: add LandingHero — three-path tabbed container"
```

---

### Task 4: Update Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Read current app/page.tsx**

Read `app/page.tsx` to understand the current hero section structure.

- [ ] **Step 2: Replace GuidedBot import and hero section**

In the imports, replace:
```typescript
import GuidedBot from '@/components/guided-bot/GuidedBot';
```
with:
```typescript
import LandingHero from '@/components/LandingHero';
```

In the hero section (lines 153-173), replace the content inside `<div className="relative max-w-4xl mx-auto">`:

Replace:
```tsx
          <div className="content-card">
            <GuidedBot />
          </div>
          {/* Skip link */}
          <p className="text-center mt-4 text-sm text-[#5C4D42]">
            Already know what you need?{' '}
            <Link href="/chat" className="text-[#C67B5C] hover:underline">
              Skip to full chat →
            </Link>
          </p>
```

With:
```tsx
          <div className="content-card">
            <LandingHero />
          </div>
```

The "Skip to full chat" link is no longer needed since the Quick Answer tab provides direct chat access, and "Open Full Chat" remains in the nav.

- [ ] **Step 3: Verify it compiles and the dev server runs**

Run: `npx tsc --noEmit app/page.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace GuidedBot hero with three-path LandingHero"
```

---

### Task 5: QASubmitForm — Add Initial Props

**Files:**
- Modify: `components/marketplace/QASubmitForm.tsx`

- [ ] **Step 1: Read current QASubmitForm.tsx**

Read `components/marketplace/QASubmitForm.tsx` to understand the props interface and state initialization.

- [ ] **Step 2: Add optional props for pre-population**

In the `QASubmitFormProps` interface, add:
```typescript
  initialQuestion?: string;
  initialCategory?: string;
```

In the component function, update the destructured props to include the new ones.

Update the state initializers:
```typescript
const [category, setCategory] = useState(initialCategory || 'general');
const [questionText, setQuestionText] = useState(initialQuestion || '');
```

- [ ] **Step 3: Commit**

```bash
git add components/marketplace/QASubmitForm.tsx
git commit -m "feat: add initialQuestion and initialCategory props to QASubmitForm"
```

---

### Task 6: Marketplace Q&A Page — Read URL Params

**Files:**
- Modify: `app/marketplace/qa/page.tsx`

- [ ] **Step 1: Read current page.tsx**

Read `app/marketplace/qa/page.tsx` to see the existing searchParams usage.

- [ ] **Step 2: Add query param reading and pass to QASubmitForm**

The page already uses `useSearchParams()` and reads `reportId`, `targetExpertId`, `targetExpertName`. Add:

```typescript
const prefillQuestion = searchParams.get('question') || undefined;
const prefillTrade = searchParams.get('trade') || undefined;
```

Pass these to `QASubmitForm`:
```tsx
<QASubmitForm
  reportId={reportId}
  reportContext={reportContext}
  expertContext={expertContext}
  targetExpertId={targetExpertId}
  targetExpertName={targetExpertName}
  initialQuestion={prefillQuestion}
  initialCategory={prefillTrade}
  onSuccess={handleSuccess}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/marketplace/qa/page.tsx
git commit -m "feat: read question/trade URL params and pre-populate QASubmitForm"
```

---

### Task 7: Build Verification + Full Test Suite

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -15`
Expected: All tests pass

- [ ] **Step 2: Run the production build**

Run: `npx next build 2>&1 | tail -15`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Manual verification checklist**

Start dev server (`npm run dev`) and verify:
- [ ] Landing page shows three path tabs (Quick Answer active by default)
- [ ] Quick Answer: type a question → response streams in → "Continue this conversation" appears
- [ ] Quick Answer: click a popular question chip → auto-fills and sends
- [ ] Quick Answer: "Continue this conversation" → navigates to `/chat` with conversation preserved
- [ ] Plan a Project tab → GuidedBot appears with project selection cards
- [ ] Switching back to Quick Answer → previous conversation still visible
- [ ] Ask an Expert tab → form with question textarea and trade dropdown
- [ ] Ask an Expert submit → navigates to `/marketplace/qa` with question pre-filled
- [ ] Rest of landing page (features, expert spotlight, templates, footer) unchanged

- [ ] **Step 4: Commit any fixes if needed**

---

### Chunk 1 Summary

After completing this chunk, the landing page has:
- Three-path tabbed hero (Quick Answer, Plan a Project, Ask an Expert)
- Mini streaming chat that demonstrates AI capabilities on first visit
- Seamless handoff from landing page chat to full `/chat` experience
- Simplified expert Q&A entry with marketplace handoff
- GuidedBot preserved exactly as-is (lazy-mounted in Plan tab)
- QASubmitForm pre-population from URL params
