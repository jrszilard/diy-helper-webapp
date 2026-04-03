# Tier 2A UX Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UI bugs from user testing — duplicate Q&A cards, stale chat across sign-out, confusing Q&A tags, buried expert onboarding.

**Architecture:** All fixes are frontend-only, no DB changes. Each is an independent, localized change to existing components.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS

---

## File Map

| Task | Action | File | Purpose |
|------|--------|------|---------|
| 1 | Modify | `app/marketplace/qa/[id]/page.tsx:402-415` | Hide standalone Question card when in threaded mode |
| 2 | Modify | `hooks/useChat.ts:33-50, 124-142` | Store userId with chat, clear on mismatch |
| 2 | Modify | `components/LandingQuickChat.tsx` | Pass userId to useChat |
| 3 | Modify | `components/marketplace/QAQuestionCard.tsx:86-111` | Remove "Pool" badge for paid questions, hide "Standard" tier |
| 4 | Modify | `components/AppHeader.tsx:306` | Add "For Pros" link next to "Find an Expert" |

---

### Task 1: Fix Duplicate Q&A Question Cards

The question detail page renders a standalone "Question" card unconditionally (lines 402-415), AND when threaded, `ConversationView` also displays the question content. This creates a visual duplicate. Fix: wrap the standalone card in `{!isThreaded && ...}`.

**Files:**
- Modify: `app/marketplace/qa/[id]/page.tsx:402-415`

- [ ] **Step 1: Wrap standalone Question card in conditional**

In `app/marketplace/qa/[id]/page.tsx`, replace lines 402-415:

```tsx
        {/* Question text card (shown for all roles) */}
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-[var(--earth-brown-dark)] mb-2">Question</h3>
          <p className="text-sm text-foreground">{question.questionText}</p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="default">{question.category}</Badge>
            {isExpert && question.status === 'claimed' && !isThreaded && (
              <span className="flex items-center gap-1 text-xs text-earth-brown">
                <Clock size={12} />
                You have 2 hours to answer
              </span>
            )}
          </div>
        </Card>
```

With:

```tsx
        {/* Question text card — hidden in threaded mode (ConversationView shows question) */}
        {!isThreaded && (
          <Card padding="sm">
            <h3 className="text-sm font-semibold text-[var(--earth-brown-dark)] mb-2">Question</h3>
            <p className="text-sm text-foreground">{question.questionText}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="default">{question.category}</Badge>
              {isExpert && question.status === 'claimed' && (
                <span className="flex items-center gap-1 text-xs text-earth-brown">
                  <Clock size={12} />
                  You have 2 hours to answer
                </span>
              )}
            </div>
          </Card>
        )}
```

Note: The `!isThreaded` check on the "2 hours" span (line 408 original) is now redundant since the whole card is already gated by `!isThreaded`, so it's removed.

- [ ] **Step 2: Verify build**

Run: `cd /home/justin/lakeshore-studio/ai-projects/diy-helper-webapp && npx next build 2>&1 | tail -20`
Expected: Clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add app/marketplace/qa/[id]/page.tsx
git commit -m "fix: hide duplicate Question card in threaded Q&A view

The standalone Question card was showing alongside ConversationView
which already displays the question, creating a visual duplicate.
Now hidden when isThreaded is true.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Fix Stale Chat Persistence Across Sign-Out

Chat messages are stored in localStorage with generic keys (`diy-helper-chat-messages`). When User A signs out and User B signs in, User A's messages can load for User B because localStorage is not user-scoped. The sign-out handler clears localStorage, but the debounced save in useChat can re-persist stale messages during the sign-out/reload transition.

Fix: Store the userId alongside chat messages. On load, if the stored userId doesn't match the current user, clear the stale data. Pass userId into useChat from LandingQuickChat.

**Files:**
- Modify: `hooks/useChat.ts:33-50, 124-142`
- Modify: `components/LandingQuickChat.tsx`

- [ ] **Step 1: Add userId parameter and storage key to useChat**

In `hooks/useChat.ts`, add a new constant after line 34:

```typescript
const CHAT_USER_KEY = 'diy-helper-chat-user';
```

Add `userId` to the hook's config interface. Find the interface (around line 60-70) and add:

```typescript
userId?: string | null;
```

- [ ] **Step 2: Update loadMessagesFromStorage to check userId**

Replace the `loadMessagesFromStorage` function (lines 37-50) with:

```typescript
const loadMessagesFromStorage = (currentUserId?: string | null): Message[] => {
  if (typeof window === 'undefined') return [];
  try {
    // Check if stored messages belong to current user
    const storedUser = localStorage.getItem(CHAT_USER_KEY);
    if (currentUserId && storedUser && storedUser !== currentUserId) {
      // Different user — clear stale data
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(CONVERSATION_ID_KEY);
      localStorage.removeItem(CHAT_USER_KEY);
      return [];
    }
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
  return [];
};
```

- [ ] **Step 3: Update mount effect to pass userId**

Update the load-on-mount effect (lines 117-122) to pass userId:

```typescript
  useEffect(() => {
    const saved = loadMessagesFromStorage(userId);
    if (saved.length > 0) setMessages(saved);
    const savedConvId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (savedConvId) setConversationId(savedConvId);
  }, [userId]);
```

Note: dependency changes from `[]` to `[userId]` so messages reload when auth state changes.

- [ ] **Step 4: Update debounced save to store userId**

Update the debounced save effect (lines 124-142) to also store the userId:

```typescript
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const toStore = messages.length > 50 ? messages.slice(-50) : messages;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
          if (userId) {
            localStorage.setItem(CHAT_USER_KEY, userId);
          }
        } catch (e) {
          console.error('Error saving chat history:', e);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, userId]);
```

- [ ] **Step 5: Export CHAT_USER_KEY and update AuthButton sign-out**

In `hooks/useChat.ts`, update the export on lines 33-34 to include the new key:

```typescript
export const CHAT_STORAGE_KEY = 'diy-helper-chat-messages';
export const CONVERSATION_ID_KEY = 'diy-helper-conversation-id';
export const CHAT_USER_KEY = 'diy-helper-chat-user';
```

In `components/AuthButton.tsx`, add `CHAT_USER_KEY` to the import (line 12):

```typescript
import { CHAT_STORAGE_KEY, CONVERSATION_ID_KEY, CHAT_USER_KEY } from '@/hooks/useChat';
```

And add it to the sign-out handler (after line 98):

```typescript
  const handleSignOut = async () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
    localStorage.removeItem(CHAT_USER_KEY);
    guestStorage.clearAll();

    await supabase.auth.signOut();
    window.location.reload();
  };
```

- [ ] **Step 6: Pass userId from LandingQuickChat to useChat**

In `components/LandingQuickChat.tsx`, update the useChat call (around line 85-88) to pass userId:

```typescript
  const chat = useChat({
    projectId: undefined,
    conversationId: initialConversationId,
    userId,
  });
```

- [ ] **Step 7: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Clean build.

- [ ] **Step 8: Commit**

```bash
git add hooks/useChat.ts components/AuthButton.tsx components/LandingQuickChat.tsx
git commit -m "fix: scope chat localStorage by userId to prevent cross-account leaks

Chat messages are now stored alongside a userId key. On mount, if the
stored userId doesn't match the current user, stale data is cleared.
Sign-out also clears the userId key.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Fix Q&A Card Tag Clarity

Tier 1 fixed free questions (showing "Free — First Question" badge). But paid pool questions still show a "Pool" badge and "Standard" tier label that experts don't understand. Fix: replace "Pool" with the expert payout amount, and only show tier label for Complex/Specialist (not Standard, which is the default).

**Files:**
- Modify: `components/marketplace/QAQuestionCard.tsx:86-111`

- [ ] **Step 1: Update badge section for paid questions**

In `components/marketplace/QAQuestionCard.tsx`, in the non-free branch of the badge section (inside the `<>...</>` fragment after `isFree`), replace the tier/pool/direct badge logic with:

```tsx
            {isFree ? (
              <Badge variant="neutral">Free — First Question</Badge>
            ) : (
              <>
                {tierLabel && question.priceTier !== 'standard' && (
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
                {isDirect && (
                  <Badge variant="purple" icon={Target}>Direct</Badge>
                )}
                {!isBidding && expertEarnings && (
                  <Badge variant="success" icon={DollarSign}>
                    ${expertEarnings} payout
                  </Badge>
                )}
              </>
            )}
```

Key changes from Tier 1:
- `question.priceTier !== 'standard'` — hides the meaningless "Standard" label
- Removed "Pool" badge entirely — it adds no value for experts
- Added `${expertEarnings} payout` badge with success variant and DollarSign icon — shows what the expert earns
- "Direct" badge only shows when actually direct (no fallback to "Pool")

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Clean build. Note: `DollarSign` is already imported at line 3.

- [ ] **Step 3: Commit**

```bash
git add components/marketplace/QAQuestionCard.tsx
git commit -m "fix: replace confusing Pool/Standard tags with expert payout badge

Removed 'Pool' badge (meaningless to experts) and 'Standard' tier
label (it's the default). Added '$X payout' badge so experts can
see at a glance what they'll earn.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Add "For Pros" Link to Main Navigation

The "Become an Expert" CTA is buried in the landing page footer. Non-expert authenticated users have no persistent path to expert registration. Fix: add a "For Pros" link next to "Find an Expert" in the header.

**Files:**
- Modify: `components/AppHeader.tsx:306`

- [ ] **Step 1: Add "For Pros" link in desktop nav**

In `components/AppHeader.tsx`, after the "Find an Expert" button (line 306-308), add a "For Pros" link that only shows to non-expert authenticated users:

Find:
```tsx
              <Button variant="ghost" size="sm" leftIcon={Users} iconSize={18} href="/experts" className={`${btnClass} hidden sm:inline-flex`}>
                Find an Expert
              </Button>
```

Replace with:
```tsx
              <Button variant="ghost" size="sm" leftIcon={Users} iconSize={18} href="/experts" className={`${btnClass} hidden sm:inline-flex`}>
                Find an Expert
              </Button>
              {!isExpert && (
                <Button variant="ghost" size="sm" href="/experts/register" className={`${btnClass} hidden sm:inline-flex`}>
                  For Pros
                </Button>
              )}
```

This shows "For Pros" to:
- Guest users (no auth) — can discover the expert program
- Authenticated DIYers who aren't experts — can register
- Hidden for existing experts (they already have ExpertQuickBar)

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add components/AppHeader.tsx
git commit -m "fix: add 'For Pros' link in main nav for expert discoverability

Experts-in-waiting and curious tradespeople can now find the expert
registration from the main nav header instead of scrolling to the
footer. Hidden for existing experts who have ExpertQuickBar.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
