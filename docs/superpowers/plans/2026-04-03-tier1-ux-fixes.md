# Tier 1 UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 4 critical/high bugs identified by expert user testing — dashboard question mismatch, $0 payout display, JSON leak in landing chat, and markdown table verification.

**Architecture:** All 4 fixes are independent, localized changes. No new APIs needed — Fix 1 adds a client-side fetch to an existing endpoint. Fix 2 improves UI labels on existing components. Fix 3 imports an existing utility. Fix 4 is a verification step.

**Tech Stack:** Next.js (App Router), React, TypeScript, Supabase, Tailwind CSS

---

## File Map

| Task | Action | File | Purpose |
|------|--------|------|---------|
| 1 | Modify | `app/experts/dashboard/page.tsx` | Fetch questions from `/api/qa/queue` and pass to widget |
| 1 | Modify | `components/marketplace/DashboardQAQueue.tsx` | Update interface to handle "free question" display |
| 2 | Modify | `components/marketplace/QAQuestionCard.tsx` | Fix tag display: replace "Pool" with "Free — First Question" when `isFree`, hide "Standard" tier label for free questions |
| 2 | Modify | `components/marketplace/ActiveQuestionCard.tsx` | Show "Free question — builds reputation" instead of "$0.00" for free questions |
| 3 | Modify | `components/LandingQuickChat.tsx` | Import and use `cleanMessageContent()` for both stored and streaming messages |
| 4 | Verify | Markdown table rendering | Confirm `remark-gfm` is working correctly after prior fixes |

---

### Task 1: Fix Dashboard "Recent Questions" Widget

The dashboard page at `app/experts/dashboard/page.tsx:84` passes `questions={[]}` (hardcoded empty array) to `DashboardQAQueue`. The `/api/experts/dashboard` endpoint only returns stats, not questions. The fix is to also fetch from `/api/qa/queue` (which already has correct specialty filtering) and pass the first 5 results to the widget.

**Files:**
- Modify: `app/experts/dashboard/page.tsx:26-87`
- Modify: `components/marketplace/DashboardQAQueue.tsx:10-16`

- [ ] **Step 1: Update the dashboard page to also fetch from the Q&A queue**

In `app/experts/dashboard/page.tsx`, add a second fetch to `/api/qa/queue` alongside the existing dashboard stats fetch, and pass the results to the widget:

```typescript
// In the fetch_data function, after the dashboard fetch (line 41), add queue fetch:

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';
import SectionHeader from '@/components/ui/SectionHeader';
import Alert from '@/components/ui/Alert';
import StripeOnboardBanner from '@/components/marketplace/StripeOnboardBanner';
import DashboardStats from '@/components/marketplace/DashboardStats';
import DashboardQAQueue from '@/components/marketplace/DashboardQAQueue';

interface DashboardApiResponse {
  dashboard: {
    totalEarningsCents: number;
    recentReviewsCount: number;
    activeQACount: number;
    pendingPayoutCents: number;
    avgRating: number;
    totalReviews: number;
    isAvailable: boolean;
    verificationLevel: number;
    stripeOnboardingComplete: boolean;
  };
}

interface QueueQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents?: number;
  createdAt: string;
}

interface QueueApiResponse {
  questions: QueueQuestion[];
}

export default function ExpertDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [queueQuestions, setQueueQuestions] = useState<QueueQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        const [dashRes, queueRes] = await Promise.all([
          fetch('/api/experts/dashboard', { headers }),
          fetch('/api/qa/queue', { headers }),
        ]);

        if (dashRes.ok) {
          const json = await dashRes.json();
          setData(json);
        }
        if (queueRes.ok) {
          const queueJson: QueueApiResponse = await queueRes.json();
          setQueueQuestions(queueJson.questions || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <Alert variant="error">Failed to load dashboard data.</Alert>
      </div>
    );
  }

  const d = data.dashboard;
  const stats = {
    totalEarnings: d.totalEarningsCents,
    monthEarnings: d.pendingPayoutCents,
    totalReviews: d.totalReviews,
    avgRating: d.avgRating,
    activeQuestions: d.activeQACount,
    pendingPayouts: d.pendingPayoutCents,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader size="lg" title="Dashboard" />

      <StripeOnboardBanner stripeOnboardingComplete={d.stripeOnboardingComplete} />
      <DashboardStats stats={stats} />
      <DashboardQAQueue questions={queueQuestions} />
    </div>
  );
}
```

- [ ] **Step 2: Update DashboardQAQueue to show "Free" label for free questions**

In `components/marketplace/DashboardQAQueue.tsx`, update the interface to accept `expertPayoutCents` and display "Free" instead of "$0.00":

```typescript
interface QueueQuestion {
  id: string;
  questionText: string;
  category: string;
  priceCents: number;
  expertPayoutCents?: number;
  createdAt: string;
}
```

And update the price display (line 63) to handle free questions:

```tsx
{/* Replace the price display span */}
{q.priceCents === 0 ? (
  <span className="text-xs font-medium text-earth-brown">Free</span>
) : (
  <span className="text-xs font-medium text-forest-green">
    ${((q.expertPayoutCents ?? q.priceCents) / 100).toFixed(2)}
  </span>
)}
```

- [ ] **Step 3: Verify the fix works**

Run: `npx next build 2>&1 | tail -20` (or check dev server)
Expected: No TypeScript errors. Dashboard now shows questions matching the Q&A queue.

- [ ] **Step 4: Commit**

```bash
git add app/experts/dashboard/page.tsx components/marketplace/DashboardQAQueue.tsx
git commit -m "fix: dashboard Recent Questions widget now fetches from Q&A queue

Dashboard was passing hardcoded empty array to DashboardQAQueue widget.
Now fetches from /api/qa/queue in parallel with dashboard stats.
Also shows 'Free' label instead of '$0.00' for free questions."
```

---

### Task 2: Fix Q&A Payout Display and Tag Confusion

The `QAQuestionCard` shows "Pool" badge and "Free question" text simultaneously, which confuses experts. The `ActiveQuestionCard` shows "Your payout: $0.00" for free questions with no context. Fix both to clarify the economics.

**Files:**
- Modify: `components/marketplace/QAQuestionCard.tsx:86-111, 137-145`
- Modify: `components/marketplace/ActiveQuestionCard.tsx:142-146`

- [ ] **Step 1: Fix QAQuestionCard tag display for free questions**

In `components/marketplace/QAQuestionCard.tsx`, update the badge section (lines 86-111) to suppress "Pool"/"Standard" badges for free questions and show a clear "Free — First Question" badge instead:

Replace lines 86-111:
```tsx
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge>{question.category}</Badge>
            {isFree ? (
              <Badge variant="neutral">Free — First Question</Badge>
            ) : (
              <>
                {tierLabel && (
                  <Badge variant={
                    question.priceTier === 'specialist' ? 'primary'
                    : question.priceTier === 'complex' ? 'warning'
                    : 'neutral'
                  }>
                    {tierLabel}
                  </Badge>
                )}
                {isBidding && (
                  <Badge variant="primary" icon={Gavel}>
                    Bidding{question.bidCount ? ` · ${question.bidCount} bid${question.bidCount !== 1 ? 's' : ''}` : ''}
                  </Badge>
                )}
                {isDirect ? (
                  <Badge variant="purple" icon={Target}>Direct</Badge>
                ) : (
                  <Badge variant="neutral" icon={Users}>Pool</Badge>
                )}
              </>
            )}
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <Clock size={12} />
              {formatTimeAgo(question.createdAt)}
            </span>
          </div>
```

- [ ] **Step 2: Fix ActiveQuestionCard payout display for free questions**

In `components/marketplace/ActiveQuestionCard.tsx`, update lines 142-146 to show a contextual message for free questions instead of "$0.00":

Replace:
```tsx
            <span className="flex items-center gap-1 text-xs font-medium text-forest-green">
              <DollarSign size={12} />
              Your payout: ${(question.expertPayoutCents / 100).toFixed(2)}
            </span>
```

With:
```tsx
            {question.expertPayoutCents > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-forest-green">
                <DollarSign size={12} />
                Your payout: ${(question.expertPayoutCents / 100).toFixed(2)}
              </span>
            ) : (
              <span className="text-xs font-medium text-earth-brown">
                Free question — builds your reputation
              </span>
            )}
```

- [ ] **Step 3: Verify the fix compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketplace/QAQuestionCard.tsx components/marketplace/ActiveQuestionCard.tsx
git commit -m "fix: clarify Q&A pricing display for experts

Free questions now show 'Free — First Question' badge instead of
confusing 'Pool' + 'Free question' combo. ActiveQuestionCard shows
'builds your reputation' instead of '$0.00' payout."
```

---

### Task 3: Fix JSON/Materials Data Leaking in Landing Chat

`LandingQuickChat.tsx` only strips `---PLANNING_READY---` markers but not `---MATERIALS_DATA---`, `---VIDEO_DATA---`, or `---INVENTORY_UPDATE---` blocks. The fix is to import and use the existing `cleanMessageContent()` function from `ChatMessages.tsx`.

**Files:**
- Modify: `components/LandingQuickChat.tsx:5, 289, 358`

- [ ] **Step 1: Import cleanMessageContent**

Add import at the top of `components/LandingQuickChat.tsx` (after line 5):

```typescript
import { cleanMessageContent } from '@/components/ChatMessages';
```

- [ ] **Step 2: Apply cleaning to stored messages**

In `components/LandingQuickChat.tsx`, line 289, replace:
```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content.replace(/---PLANNING_READY---/g, '')}</ReactMarkdown>
```

With:
```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{cleanMessageContent(msg.content)}</ReactMarkdown>
```

Note: `cleanMessageContent()` does NOT strip `---PLANNING_READY---` (it's used as a signal, not a data block). Check if `---PLANNING_READY---` is still needed. Looking at line 143, `PLANNING_READY` is detected separately for the planning CTA. Add it to the clean call:

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{cleanMessageContent(msg.content).replace(/---PLANNING_READY---/g, '')}</ReactMarkdown>
```

- [ ] **Step 3: Apply cleaning to streaming content**

In `components/LandingQuickChat.tsx`, line 358, replace:
```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{chat.streamingContent}</ReactMarkdown>
```

With:
```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{cleanMessageContent(chat.streamingContent)}</ReactMarkdown>
```

- [ ] **Step 4: Verify the fix compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: No TypeScript errors. `cleanMessageContent` is already exported from `ChatMessages.tsx` (line 51).

- [ ] **Step 5: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "fix: strip raw JSON/materials data from landing page chat

LandingQuickChat was only removing PLANNING_READY markers. Now uses
the shared cleanMessageContent() to strip all data blocks
(MATERIALS_DATA, VIDEO_DATA, INVENTORY_UPDATE) from both stored
and streaming messages."
```

---

### Task 4: Verify Markdown Table Rendering

Both `ChatMessages.tsx` and `LandingQuickChat.tsx` already have `remark-gfm` configured with custom table components. This may have been fixed in the 14-bug fix commit (198d575). Verify and only fix if still broken.

**Files:**
- Check: `components/ChatMessages.tsx:4-5, 151-170`
- Check: `components/LandingQuickChat.tsx:5-6, 60-74`

- [ ] **Step 1: Verify remark-gfm is installed and configured**

Run: `grep -A1 'remark-gfm' package.json`
Expected: `"remark-gfm": "^4.x"` (or similar version)

Check both components have `remarkPlugins={[remarkGfm]}` on ReactMarkdown — already confirmed in exploration.

- [ ] **Step 2: Test table rendering in the browser**

Navigate to `http://localhost:3000`, start a chat, and ask: "Compare the pros and cons of PEX vs copper piping in a table."

Check if the response tables render as formatted HTML tables (not raw pipe characters).

If tables render correctly: no code changes needed, mark as verified.
If tables are still broken: investigate whether the issue is in the AI response format or the markdown renderer. Check if the AI is generating proper GFM table syntax (header row, separator row, data rows).

- [ ] **Step 3: Commit verification result (if changes needed)**

If no changes needed:
```bash
# No commit needed — table rendering already working
```

If changes were needed, commit with appropriate message.
