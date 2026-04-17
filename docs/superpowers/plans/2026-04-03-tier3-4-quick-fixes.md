# Tier 3/4 Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 small polish issues — expert dropdown missing Dashboard, badge question count stale, New Chat button too small.

**Architecture:** Three independent, localized changes. No DB schema changes. One API endpoint update, two component tweaks.

**Tech Stack:** Next.js, React, TypeScript, Supabase, Tailwind CSS

---

## File Map

| Task | Action | File | Purpose |
|------|--------|------|---------|
| 1 | Modify | `components/AuthButton.tsx:6, 109-113` | Add Dashboard link to expert dropdown |
| 2 | Modify | `app/api/experts/[id]/badge/route.ts:31-45` | Query live answered count instead of cached profile field |
| 3 | Modify | `components/AppHeader.tsx:271-277` | Make New Chat button more visible |

---

### Task 1: Add Dashboard Link to Expert Dropdown

The expert dropdown menu has My Profile, Settings, Sign Out — but no Dashboard link. Experts have to click the logo or use the ExpertQuickBar to get back to the dashboard.

**Files:**
- Modify: `components/AuthButton.tsx:6, 109-113`

- [ ] **Step 1: Add LayoutDashboard import and Dashboard menu item**

In `components/AuthButton.tsx`, update the lucide-react import on line 6:

```typescript
import { LogOut, ChevronDown, Mail, Settings, User, LayoutDashboard } from 'lucide-react';
```

Update the expert dropdown items array (lines 110-113) to add Dashboard as the first item:

```typescript
    const items = isExpert
      ? [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/experts/dashboard' },
          { label: 'My Profile', icon: User, href: '/experts/dashboard/profile' },
          { label: 'Settings', icon: Settings, href: '/settings' },
          { label: 'Sign Out', icon: LogOut, onClick: handleSignOut, danger: true, dividerBefore: true },
        ]
```

- [ ] **Step 2: Verify build**

Run: `cd /home/justin/lakeshore-studio/ai-projects/diy-helper-webapp && npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add components/AuthButton.tsx
git commit -m "fix: add Dashboard link to expert dropdown menu

Experts can now quickly navigate back to the dashboard from the
account dropdown instead of relying on the logo or ExpertQuickBar.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Fix Embeddable Badge Question Count

The badge SVG endpoint reads `total_questions_answered` from `expert_profiles`, but this field is only updated when the reputation engine runs — not on every answer submit. Fix: query the live count from `qa_questions` directly.

**Files:**
- Modify: `app/api/experts/[id]/badge/route.ts:31-45`

- [ ] **Step 1: Add live question count query**

In `app/api/experts/[id]/badge/route.ts`, after the existing expert profile query (line 36), add a live count query. Replace lines 31-45:

```typescript
  const adminClient = getAdminClient();

  const { data: expert } = await adminClient
    .from('expert_profiles')
    .select('display_name, avg_rating, total_reviews, expert_level, is_active, verification_level')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!expert) {
    return new Response('Expert not found', { status: 404 });
  }

  // Live count of answered questions (not cached profile field)
  const { count: answeredCount } = await adminClient
    .from('qa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', id)
    .in('status', ['answered', 'in_conversation', 'resolve_proposed', 'accepted', 'resolved']);

  const level = (expert.expert_level || 'bronze') as string;
  const rating = (expert.avg_rating || 0).toFixed(1);
  const reviews = expert.total_reviews || 0;
  const answered = answeredCount || 0;
  const verified = (expert.verification_level || 0) >= 2;
  const name = expert.display_name || 'Expert';
```

Key changes:
- Removed `total_questions_answered` from the profile select (no longer needed)
- Added a separate query to count questions with relevant statuses
- `answered` now uses the live `answeredCount` instead of the cached profile field

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/experts/[id]/badge/route.ts
git commit -m "fix: badge shows live question count instead of cached profile field

The embeddable expert badge now queries qa_questions directly for a
live count of answered questions, instead of relying on the
total_questions_answered field which only updates when the reputation
engine runs.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Make New Chat Button More Prominent

The "New Chat" button in the header uses `Plus size={12}` and `text-xs` — too small and easy to miss. Make it slightly more visible with a better icon and size.

**Files:**
- Modify: `components/AppHeader.tsx:271-277`

- [ ] **Step 1: Update the import and button**

In `components/AppHeader.tsx`, find the lucide-react import (near the top) and add `MessageSquarePlus`. Check if `Plus` is used elsewhere in the file — if not, replace it; if so, keep both.

Then replace lines 270-278:

```tsx
              {showBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-[var(--earth-sand)] hover:text-white hover:bg-white/10 transition-colors text-sm font-medium mt-0.5 px-2 py-1 rounded-md -ml-1.5"
                >
                  <MessageSquarePlus size={14} />
                  New Chat
                </button>
              )}
```

Changes:
- `Plus size={12}` → `MessageSquarePlus size={14}` — semantically clearer icon, slightly larger
- `text-xs` → `text-sm` — slightly larger text
- `px-1.5 py-0.5` → `px-2 py-1` — slightly larger click target

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add components/AppHeader.tsx
git commit -m "fix: make New Chat button more prominent in header

Increased icon size (Plus 12→MessageSquarePlus 14), text size
(xs→sm), and click target padding for better discoverability.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
