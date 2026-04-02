# Landing Page Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical feature gaps from the /chat removal so materials saving, conversation persistence, and navigation all work on the unified landing page.

**Architecture:** Enhance `LandingQuickChat` with the missing integrations from the old `ChatInterface` — wire SaveMaterialsDialog, add GuestExpertCallout, fix conversation resume. Fix remaining broken `/chat` references. Delete dead code. Create design system reference.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Supabase, Zod.

---

## File Map

| Task | Action | File | Responsibility |
|------|--------|------|----------------|
| 1 | Modify | `components/LandingQuickChat.tsx` | Wire SaveMaterialsDialog + useProjectActions |
| 2 | Modify | `components/LandingQuickChat.tsx` | Fix conversation resume on mount |
| 2 | Modify | `app/page.tsx` | Remove dead sessionStorage code |
| 3 | Modify | `app/marketplace/qa/[id]/page.tsx` | Fix /chat → / |
| 3 | Modify | `components/WhyDIYHelper.tsx` | Fix /chat → / |
| 3 | Modify | `components/ProjectTemplates.tsx` | Fix /chat → / |
| 4 | Modify | `components/LandingQuickChat.tsx` | Add GuestExpertCallout |
| 5 | Modify | `components/LandingQuickChat.tsx` | Add inventory toast |
| 6 | Delete | `app/chat/layout.tsx` | Remove dead route |
| 6 | Delete | `components/ChatInterface.tsx` | Remove orphaned component |
| 6 | Delete | `components/ConversationList.tsx` | Remove orphaned component |
| 6 | Delete | `components/ChatInput.tsx` | Remove orphaned component |
| 7 | Create | `DESIGN-SYSTEM.md` | Design system reference doc |

---

### Task 1: Wire SaveMaterialsDialog into LandingQuickChat

**Files:**
- Modify: `components/LandingQuickChat.tsx`

This is the critical fix. When the user clicks "Save Materials", the extracted materials need to be saved to `shopping_list_items` via `SaveMaterialsDialog` + `useProjectActions`.

- [ ] **Step 1: Add imports**

In `components/LandingQuickChat.tsx`, add these imports near the top (after the existing imports):

```tsx
import SaveMaterialsDialog from '@/components/SaveMaterialsDialog';
import { useProjectActions } from '@/hooks/useProjectActions';
```

- [ ] **Step 2: Add useProjectActions hook and create/save handlers**

Inside the component function, after `const agentRun = useAgentRun();` (line 71), add:

```tsx
  const projectActions = useProjectActions({ userId: userId ?? undefined });
```

Then, after the `handleChipClick` callback (around line 155), add:

```tsx
  const saveToProject = useCallback(async (targetProjectId: string, isGuestProject: boolean = false) => {
    if (!chat.extractedMaterials) return;
    try {
      const count = await projectActions.saveMaterials(
        targetProjectId,
        chat.extractedMaterials.materials,
        isGuestProject || projectActions.isGuestMode
      );
      if (count > 0) {
        setSavedProjectId(targetProjectId);
        chat.setShowSaveDialog(false);
        chat.setExtractedMaterials(null);
        let successMsg = `Saved ${count} items to your project!`;
        if (chat.extractedMaterials.owned_items?.length) {
          successMsg += ` (${chat.extractedMaterials.owned_items.length} items you already own were excluded)`;
        }
        chat.setMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error saving materials:', message);
    }
  }, [chat, projectActions]);

  const createNewProjectAndSave = useCallback(async () => {
    if (!chat.extractedMaterials) return;
    const project = await projectActions.createProject(
      chat.extractedMaterials.project_description || 'My DIY Project',
      `Created ${new Date().toLocaleDateString()}`
    );
    if (project) {
      await saveToProject(project.id, projectActions.isGuestMode);
    }
  }, [chat.extractedMaterials, projectActions, saveToProject]);

  const [newProjectName, setNewProjectName] = useState('');
```

- [ ] **Step 3: Render SaveMaterialsDialog**

In the component's return JSX, before the closing `</div>` (line 357), add the dialog right after the `SaveToProjectModal`:

```tsx
      {/* Materials save dialog */}
      <SaveMaterialsDialog
        showSaveDialog={chat.showSaveDialog}
        showCreateProjectDialog={false}
        showAuthPrompt={!userId && chat.showSaveDialog}
        extractedMaterials={chat.extractedMaterials}
        projects={projectActions.projects}
        guestProjects={projectActions.guestProjects}
        isGuestMode={projectActions.isGuestMode}
        newProjectName={newProjectName}
        onNewProjectNameChange={setNewProjectName}
        onSaveToProject={saveToProject}
        onCreateNewProjectAndSave={createNewProjectAndSave}
        onConfirmCreateProject={createNewProjectAndSave}
        onCloseSaveDialog={() => chat.setShowSaveDialog(false)}
        onCloseCreateDialog={() => chat.setShowSaveDialog(false)}
        onCloseAuthPrompt={() => chat.setShowSaveDialog(false)}
      />
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "fix: wire SaveMaterialsDialog into LandingQuickChat

Materials extracted by the AI can now be saved to projects via
the full SaveMaterialsDialog flow, inserting into shopping_list_items."
```

---

### Task 2: Fix Conversation Resume on Refresh

**Files:**
- Modify: `components/LandingQuickChat.tsx:84-91`
- Modify: `app/page.tsx:49-55`

- [ ] **Step 1: Fix the mount effect in LandingQuickChat**

In `components/LandingQuickChat.tsx`, replace the mount effect (lines 84-91):

```tsx
  // Clear stale chat/agent state on fresh mount (no explicit conversation to resume)
  useEffect(() => {
    if (!initialConversationId) {
      chat.handleNewChat();
      agentRun.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

With:

```tsx
  // On mount: resume stored conversation or start fresh
  useEffect(() => {
    if (initialConversationId) return; // Explicit conversation passed — useChat handles it
    const storedConvId = localStorage.getItem('diy-helper-conversation-id');
    if (storedConvId) {
      // Resume the stored conversation
      chat.handleSelectConversation(storedConvId, []);
    } else {
      chat.handleNewChat();
    }
    agentRun.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 2: Remove dead sessionStorage code from page.tsx**

In `app/page.tsx`, remove lines 49-55:

```tsx
    // Check for session state from /chat redirect
    const storedConvId = sessionStorage.getItem('diy-helper-conversation-id');
    if (storedConvId) {
      setActiveChatConversationId(storedConvId);
      setChatActive(true);
      sessionStorage.removeItem('diy-helper-conversation-id');
    }
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/LandingQuickChat.tsx app/page.tsx
git commit -m "fix: resume conversation on page refresh instead of clearing

LandingQuickChat now checks localStorage for a stored conversation ID
on mount and resumes it, instead of unconditionally clearing state."
```

---

### Task 3: Fix Remaining /chat Route References

**Files:**
- Modify: `app/marketplace/qa/[id]/page.tsx:172`
- Modify: `components/WhyDIYHelper.tsx:121`
- Modify: `components/ProjectTemplates.tsx:73`

- [ ] **Step 1: Fix marketplace redirect**

In `app/marketplace/qa/[id]/page.tsx`, change line 172:

```tsx
// Before:
        router.push('/chat');

// After:
        router.push('/');
```

- [ ] **Step 2: Fix WhyDIYHelper**

In `components/WhyDIYHelper.tsx`, change line 121:

```tsx
// Before:
    router.push('/chat');

// After:
    router.push('/');
```

Note: Line 120 (`sessionStorage.setItem('initialChatMessage', scenario.question)`) is correct — `useChat` already reads this key via `getInitialMessage()`.

- [ ] **Step 3: Fix ProjectTemplates**

In `components/ProjectTemplates.tsx`, change line 73:

```tsx
// Before:
      router.push('/chat');

// After:
      router.push('/');
```

Note: Line 72 (`sessionStorage.setItem('initialChatMessage', template.starterPrompt)`) is correct — same mechanism.

- [ ] **Step 4: Verify no remaining /chat references**

Run: `grep -rn 'router\.push.*chat\|"/chat"' --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v '.md'`
Expected: No results.

- [ ] **Step 5: Commit**

```bash
git add app/marketplace/qa/[id]/page.tsx components/WhyDIYHelper.tsx components/ProjectTemplates.tsx
git commit -m "fix: replace remaining router.push('/chat') with '/'

Marketplace QA redirect, WhyDIYHelper 'Try it' button, and
ProjectTemplates 'Start Project' all pointed to removed /chat route.
The sessionStorage prefill mechanism (initialChatMessage) still works
because useChat reads it on mount."
```

---

### Task 4: Add GuestExpertCallout to LandingQuickChat

**Files:**
- Modify: `components/LandingQuickChat.tsx`

- [ ] **Step 1: Add import**

In `components/LandingQuickChat.tsx`, add:

```tsx
import GuestExpertCallout from '@/components/GuestExpertCallout';
```

- [ ] **Step 2: Add the callout in the messages area**

After the messages loop closing `})}` (around line 263, after the `</div>` of the map), and before the streaming content section, add:

```tsx
        {/* Expert upsell for guests after 3+ messages */}
        {!userId && (
          <GuestExpertCallout
            messageCount={chat.messages.filter(m => m.role === 'assistant').length}
          />
        )}
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "feat: add GuestExpertCallout to landing page chat

Shows expert conversion prompt after 3+ assistant messages for
unauthenticated users, restoring the expert funnel from ChatInterface."
```

---

### Task 5: Add Inventory Notification Toast

**Files:**
- Modify: `components/LandingQuickChat.tsx`

- [ ] **Step 1: Add imports**

In `components/LandingQuickChat.tsx`, update the lucide import to include the icons needed:

```tsx
// Before:
import { ArrowUp, FolderPlus, ShoppingCart } from 'lucide-react';

// After:
import { ArrowUp, FolderPlus, ShoppingCart, Package, X } from 'lucide-react';
```

- [ ] **Step 2: Add the toast at the top of the return JSX**

At the start of the return block (right after `<div className="space-y-4">`), add:

```tsx
      {/* Inventory detection toast */}
      {chat.inventoryNotification && (
        <div className="flex items-start gap-2 bg-forest-green/20 border border-forest-green/30 text-earth-cream rounded-lg px-3 py-2.5 text-sm">
          <Package className="w-4 h-4 flex-shrink-0 mt-0.5 text-forest-green" />
          <span className="flex-1">{chat.inventoryNotification}</span>
          <button onClick={() => chat.setInventoryNotification(null)} className="flex-shrink-0 p-0.5 rounded hover:bg-white/10" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/LandingQuickChat.tsx
git commit -m "feat: add inventory notification toast to landing page chat

When the AI detects tools the user owns, a toast now shows in the
landing page chat — previously only worked in the old ChatInterface."
```

---

### Task 6: Delete Dead Code

**Files:**
- Delete: `app/chat/layout.tsx`
- Delete: `components/ChatInterface.tsx`
- Delete: `components/ConversationList.tsx`
- Delete: `components/ChatInput.tsx`

- [ ] **Step 1: Verify no remaining imports of these components**

Run:
```bash
grep -rn "import.*ChatInterface\|import.*ConversationList\|import.*ChatInput\|import.*from.*app/chat" --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v '\.md'
```

Expected: No results (or only self-imports within the files being deleted).

- [ ] **Step 2: Delete the files**

```bash
rm app/chat/layout.tsx
rmdir app/chat
rm components/ChatInterface.tsx
rm components/ConversationList.tsx
rm components/ChatInput.tsx
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds. If any file was still imported somewhere, the build will fail and we fix the reference.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned ChatInterface, ChatInput, ConversationList, chat layout

These components were only used by the old /chat page removed in the
unified landing page work. All their features have been migrated to
LandingQuickChat or are covered by the landing page architecture."
```

---

### Task 7: Create Design System Reference

**Files:**
- Create: `DESIGN-SYSTEM.md`

- [ ] **Step 1: Create the reference document**

Create `DESIGN-SYSTEM.md` at the project root:

```markdown
# DIY Helper Design System Reference

Reference for all UI work. Follow these tokens, patterns, and components to maintain consistency.

## Color Tokens

### Earth-Tone Palette (Primary)
| Token | Value | Usage |
|-------|-------|-------|
| `--earth-cream` | `#F5F0E6` | Light backgrounds, body bg |
| `--earth-tan` | `#E8DFD0` | Secondary backgrounds, borders |
| `--earth-sand` | `#D4C8B8` | Muted text, dividers |
| `--earth-brown-light` | `#A89880` | Secondary text |
| `--earth-brown` | `#7D6B5D` | Body text |
| `--earth-brown-dark` | `#4A3F35` | Dark backgrounds (landing page, nav) |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--terracotta` | `#C67B5C` | Primary action, user messages, CTAs |
| `--terracotta-dark` | `#A65D3F` | Hover states |
| `--rust` | `#B8593B` | Destructive/danger |
| `--forest-green` | `#4A7C59` | Success, purchased, positive |
| `--forest-green-dark` | `#2D5A3B` | Green hover |
| `--sage` | `#7D9A6F` | Secondary green |
| `--slate-blue` | `#5D7B93` | Links, info, hints |
| `--slate-blue-dark` | `#4A6578` | Blue hover |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--status-research` / `--status-research-bg` | `#5D7B93` / `#E8F0F5` | Research phase, hints |
| `--status-progress` / `--status-progress-bg` | `#C67B5C` / `#FDF3ED` | In-progress |
| `--status-waiting` / `--status-waiting-bg` | `#9B7BA6` / `#F5EEF8` | Waiting state |
| `--status-complete` / `--status-complete-bg` | `#4A7C59` / `#E8F3EC` | Completed |

## Contexts

### Dark Context (Landing Page, Nav, Drawers)
- Background: `bg-earth-brown-dark` or `bg-[var(--earth-brown-dark)]`
- Text: `text-white`, `text-earth-cream`, `text-white/70`, `text-white/40`
- Borders: `border-white/[0.06]`, `border-[var(--blueprint-grid-major)]`
- Interactive: `hover:bg-white/10`, `bg-white/5`, `bg-white/10`
- Links: `text-sky-300 hover:text-sky-200`

### Light Context (Drawers Content, Reports, Modals)
- Background: `bg-white`, `bg-earth-cream`, `bg-surface`
- Text: `text-foreground`, `text-earth-brown`, `text-earth-brown-light`
- Borders: `border-earth-sand`, `border-earth-sand/30`
- Interactive: `hover:bg-earth-tan/30`
- Links: `text-slate-blue hover:text-slate-blue-dark`

## Spacing

Uses Utopia fluid scale via CSS custom properties:
- `--space-3xs` through `--space-3xl`
- Use `var(--space-m)` etc. in margins/padding for responsive scaling
- Tailwind fallbacks: `p-3`, `gap-2`, `mb-4` for non-fluid spacing

## Components

### Button (`components/ui/Button.tsx`)
- Variants: `primary`, `secondary`, `tertiary`, `ghost`, `danger`, `outline`
- Sizes: `xs`, `sm`, `md`, `lg`
- Props: `leftIcon`, `rightIcon`, `iconSize` (default 16), `href` (renders as link)

### Modal (`components/ui/Modal.tsx`)
- Centered overlay with backdrop blur
- Props: `isOpen`, `onClose`, `title`

### TextInput (`components/ui/TextInput.tsx`)
- Styled input with earth-tone borders
- Standard React input props

### Select (`components/ui/Select.tsx`)
- Styled select dropdown

### Spinner (`components/ui/Spinner.tsx`)
- Props: `size` ('sm' | 'md' | 'lg')

### ContextualHint (`components/ui/ContextualHint.tsx`)
- Dismissible tip banner with localStorage persistence
- Props: `hintKey`, `children`, `dismissWhen?`

## Layout Patterns

### Drawer (Right-side panel)
```
<div className="fixed inset-0 z-50">
  <div className="absolute inset-0 bg-black/60" onClick={onClose} />
  <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-lg bg-white shadow-xl">
    <header> ... </header>
    <div className="flex-1 overflow-y-auto"> ... </div>
  </div>
</div>
```

### Header Nav Button
```
<Button variant="ghost" size="sm" leftIcon={Icon} iconSize={18} className={btnClass}>
  <span className="text-xs sm:text-sm">Label</span>
</Button>
```

### Toast Notification
```
<div className="fixed top-20 right-4 bg-forest-green text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm">
  <Icon /> <p>{message}</p> <button>×</button>
</div>
```

### Card
```
<div className="border rounded-xl p-3.5 bg-white border-earth-sand/30 hover:border-forest-green/30">
  ...
</div>
```

### Status Badge
```
<span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--status-complete-bg)] text-forest-green">
  COMPLETED
</span>
```

## Typography

- Headings: `font-bold` with sizes `text-2xl` (h1), `text-lg` (h2), `text-md` (h3)
- Body: `text-sm` default, `text-xs` for labels/metadata
- Muted: `text-earth-brown-light` or `text-white/40` (dark context)
- Labels: `text-[10px] font-semibold uppercase tracking-wider`

## Chat Message Bubbles

### User
```
bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5
```

### Assistant
```
bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3
```

## Do's and Don'ts

- **DO** use CSS custom properties for colors (`var(--terracotta)`) or Tailwind shortcuts (`text-terracotta`)
- **DO** use `text-xs sm:text-sm` pattern for responsive text that must show on mobile
- **DO** match context (dark vs light) when adding new UI
- **DON'T** use raw hex values — always use tokens
- **DON'T** add new color variables without updating this doc
- **DON'T** use `hidden sm:inline` for nav labels (they should always show)
```

- [ ] **Step 2: Verify the file renders correctly**

Open `DESIGN-SYSTEM.md` and scan for any formatting issues.

- [ ] **Step 3: Commit**

```bash
git add DESIGN-SYSTEM.md
git commit -m "docs: add design system reference for UI consistency"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Wire SaveMaterialsDialog into LandingQuickChat | 1 |
| 2 | Fix conversation resume on refresh | 2 |
| 3 | Fix remaining /chat route references | 3 |
| 4 | Add GuestExpertCallout | 1 |
| 5 | Add inventory notification toast | 1 |
| 6 | Delete dead code (4 files) | 4 deleted |
| 7 | Design system reference doc | 1 created |
