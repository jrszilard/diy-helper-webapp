# Landing Page Migration Gaps — Design Spec

**Date:** 2026-04-02
**Status:** Draft
**Context:** When `/chat` was removed (commit `b4450fc`) and replaced with the unified landing page, several features and integrations were lost. This spec covers all identified gaps.

## Gap Summary

| # | Gap | Severity | Category |
|---|-----|----------|----------|
| 1 | SaveMaterialsDialog not rendered — materials never save to shopping_list_items | **Critical** | Feature loss |
| 2 | Conversations don't resume on page refresh | **Critical** | State mgmt |
| 3 | Remaining router.push('/chat') references cause 404s | **High** | Broken nav |
| 4 | GuestExpertCallout not shown — expert conversion funnel broken | **High** | Feature loss |
| 5 | Inventory notification toasts not shown when tools are detected | **Medium** | Feature loss |
| 6 | Image upload not available in landing page chat | **Medium** | Feature loss |
| 7 | Google search fallback not shown during long loads | **Low** | Feature loss |
| 8 | Dead /app/chat/layout.tsx still exists | **Low** | Cleanup |
| 9 | Orphaned components (ConversationList, ChatInput, GuestExpertCallout) | **Low** | Cleanup |
| 10 | Design system reference document needed | **Medium** | DX |

## Gap 1: SaveMaterialsDialog Not Rendered (Critical)

### Problem
`LandingQuickChat` has a "Save Materials" button that calls `chat.handleAutoExtractMaterials`. This extracts materials and sets `showSaveDialog = true` and `extractedMaterials` in the `useChat` hook. But `LandingQuickChat` never renders `SaveMaterialsDialog`, so the dialog never appears and materials are never inserted into `shopping_list_items`.

### Solution
Wire `SaveMaterialsDialog` into `LandingQuickChat`. The dialog needs:
- `chat.showSaveDialog` and `chat.extractedMaterials` from the hook
- `useProjectActions` for `saveMaterials()`, project list, and guest handling
- Auth state for the auth prompt flow

**Implementation:**
- Import `SaveMaterialsDialog` and `useProjectActions` into `LandingQuickChat`
- Pass the required props from `useChat` and `useProjectActions`
- Render the dialog at the top level of the component's return JSX

**Key props to wire:**
```
showSaveDialog={chat.showSaveDialog}
extractedMaterials={chat.extractedMaterials}
projects={projectActions.projects}
guestProjects={projectActions.guestProjects}
isGuestMode={projectActions.isGuestMode}
onSaveToProject → call projectActions.saveMaterials(projectId, materials)
onCloseSaveDialog → chat.setShowSaveDialog(false)
```

### Files
- Modify: `components/LandingQuickChat.tsx`

## Gap 2: Conversations Don't Resume on Refresh (Critical)

### Problem
Two issues:
1. `useChat` stores `conversationId` in localStorage (`diy-helper-conversation-id`), but on fresh mount `LandingQuickChat` calls `chat.handleNewChat()` which clears it (line 64-69 of LandingQuickChat)
2. The landing page checks `sessionStorage` for a conversation ID (page.tsx:50) but this was designed for cross-page navigation from the old `/chat` route — it's never set anymore

### Solution
On mount, if the user is authenticated and has a `conversationId` in localStorage, resume that conversation instead of clearing state. Only clear state when no conversation is stored.

**Implementation:**
- In `LandingQuickChat`, modify the mount effect (line 64-69): check localStorage for `diy-helper-conversation-id` before calling `handleNewChat()`
- If a stored conversation ID exists and no `initialConversationId` was provided, resume it
- Remove the dead sessionStorage check from `app/page.tsx` (line 49-55)

### Files
- Modify: `components/LandingQuickChat.tsx`
- Modify: `app/page.tsx` (remove dead sessionStorage code)

## Gap 3: Remaining /chat Route References (High)

### Problem
Several components still use `router.push('/chat')` or link to `/chat`:

| File | Line | Context |
|------|------|---------|
| `app/marketplace/qa/[id]/page.tsx` | 172 | Redirects unauthenticated users |
| `components/WhyDIYHelper.tsx` | 121 | "Try it" button for scenario questions |
| `components/ProjectTemplates.tsx` | 73 | "Start Project" for template selection |
| `app/design-system/page.tsx` | 642 | Design system nav menu item |

### Solution
Replace all `router.push('/chat')` with `router.push('/')`. For components that should pre-fill the chat input (WhyDIYHelper, ProjectTemplates), pass the query text via sessionStorage or URL parameter so the landing page can pick it up.

**Implementation:**
- Simple replacements for marketplace and design-system routes
- For WhyDIYHelper and ProjectTemplates: store the intended query in `sessionStorage.setItem('diy-helper-prefill', query)` before navigating to `/`, then have `LandingQuickChat` check for and consume this key on mount

### Files
- Modify: `app/marketplace/qa/[id]/page.tsx`
- Modify: `components/WhyDIYHelper.tsx`
- Modify: `components/ProjectTemplates.tsx`
- Modify: `app/design-system/page.tsx`
- Modify: `components/LandingQuickChat.tsx` (prefill consumer)

## Gap 4: GuestExpertCallout Missing (High)

### Problem
`ChatInterface` rendered `GuestExpertCallout` after 3+ assistant messages for unauthenticated users. `LandingQuickChat` doesn't render it. This breaks the expert conversion funnel.

### Solution
Add `GuestExpertCallout` to `LandingQuickChat`, triggered after the 3rd assistant message when `!userId`.

**Implementation:**
- Import `GuestExpertCallout` into `LandingQuickChat`
- After the messages list, conditionally render it when `!userId && assistantMessageCount >= 3`

### Files
- Modify: `components/LandingQuickChat.tsx`

## Gap 5: Inventory Notification Toasts (Medium)

### Problem
When the AI calls `detect_owned_items`, the chat API returns an `inventory_update` SSE event. `ChatInterface` rendered a toast notification showing which tools were detected. `LandingQuickChat` ignores these events.

### Solution
Add inventory toast rendering to `LandingQuickChat` using the `chat.inventoryNotification` state from `useChat`.

**Implementation:**
- Read `chat.inventoryNotification` in `LandingQuickChat`
- Render a simple toast banner (matching the existing pattern from ShoppingListView) when notification is present

### Files
- Modify: `components/LandingQuickChat.tsx`

## Gap 6: Image Upload (Medium)

### Problem
`ChatInput` (used by `ChatInterface`) supported image upload with drag-and-drop and preview. `LandingQuickChat` has a simple text input with no image support.

### Solution
Add an image upload button to the `LandingQuickChat` input area. Reuse the image processing logic from `ChatInput` (base64 conversion, media type detection) but with a simpler UI — just a camera/image icon button next to the send button.

### Files
- Modify: `components/LandingQuickChat.tsx`

## Gap 7: Google Search Fallback (Low)

### Problem
`ChatInput` showed a "Try Google" link after 5 seconds of loading. `LandingQuickChat` doesn't.

### Solution
Defer — this is low priority and the intent detection system handles most cases now.

## Gap 8: Dead /app/chat/layout.tsx (Low)

### Problem
`/app/chat/layout.tsx` exists but has no `page.tsx` sibling, making it a dead route that returns an empty layout.

### Solution
Delete `app/chat/layout.tsx`. Any remaining references will 404 (which we're fixing in Gap 3).

### Files
- Delete: `app/chat/layout.tsx`

## Gap 9: Orphaned Components (Low)

### Problem
These components are only imported by `ChatInterface.tsx` which is itself orphaned:
- `ConversationList.tsx`
- `ChatInput.tsx`
- `GuestExpertCallout.tsx` (will be re-used after Gap 4 fix)

### Solution
After all gaps are fixed:
- If `ChatInterface.tsx` has no remaining imports, delete it along with `ConversationList` and `ChatInput`
- Keep `GuestExpertCallout` (used after Gap 4 fix)
- Keep `SaveMaterialsDialog` (used after Gap 1 fix)

### Files
- Delete: `components/ChatInterface.tsx` (after verification)
- Delete: `components/ConversationList.tsx`
- Delete: `components/ChatInput.tsx`

## Gap 10: Design System Reference Document

### Problem
New features are being built without consistent reference to the design system tokens, components, and patterns. The shopping list drawer was flagged as not matching the design system.

### Solution
Create a `DESIGN-SYSTEM.md` at the project root documenting:
- Color tokens (earth-tone palette, accents, status colors)
- Spacing scale (Utopia fluid tokens)
- Typography (font sizes, weights)
- Component inventory (Button variants, Modal, TextInput, Select, etc.)
- Layout patterns (drawers, cards, headers)
- Dark vs light contexts (landing page = dark, drawers = light, reports = light)

This file should be referenced by Claude in CLAUDE.md as a required reference for any UI work.

### Files
- Create: `DESIGN-SYSTEM.md`
- Modify: `CLAUDE.md` (add reference)

## Implementation Order

1. **Gap 1** — SaveMaterialsDialog (unblocks shopping trips end-to-end)
2. **Gap 2** — Conversation resume on refresh
3. **Gap 3** — Fix remaining /chat references
4. **Gap 4** — GuestExpertCallout
5. **Gap 5** — Inventory toasts
6. **Gap 10** — Design system reference doc
7. **Gap 8** — Delete dead layout
8. **Gap 9** — Clean up orphaned components
9. **Gap 6** — Image upload (larger feature)
10. **Gap 7** — Defer

## Design Decisions

- **Enhance LandingQuickChat rather than restoring ChatInterface** — The unified landing page is the right architecture. We add missing features to LandingQuickChat rather than reverting.
- **Reuse existing components** — SaveMaterialsDialog and GuestExpertCallout already work; just wire them in.
- **Prefill via sessionStorage** — WhyDIYHelper and ProjectTemplates can pre-fill the chat input by storing a query string in sessionStorage before navigating to `/`.
- **Delete dead code aggressively** — Once features are migrated, remove ChatInterface, ConversationList, ChatInput, and chat/layout.tsx. Dead code is confusing code.
