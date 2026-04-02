# Unified Landing Page Chat Hub — Design Spec

> **Date:** April 1, 2026
> **Status:** Approved
> **Branch:** `chat-improvements`
> **Council reviewed:** Yes — see `docs/council-report-2026-04-01.html`

## Summary

Consolidate the landing page (`/`) and chat page (`/chat`) into a single unified experience using a "Hero-to-Chat Morph" pattern. The landing page becomes the primary (and only) chat experience. The three-tab system (Quick Answer, Plan a Project, Ask an Expert) is replaced by two tabs: "Ask Anything" (unified AI with smart intent classification) and "Talk to a Pro" (expert Q&A marketplace). A rigid step-by-step project planning wizard is replaced by conversational info-gathering driven by AI intent classification.

## Motivation

- **Fragmented experience:** Users currently must navigate between a lightweight landing chat and a full-featured `/chat` page to access power features (projects, shopping lists, materials extraction, tool inventory, agent pipeline).
- **Mode selection friction:** Forcing users to choose between "Quick Answer" and "Plan a Project" before typing adds cognitive load. The AI already classifies intent — let it decide.
- **Value prop invisibility:** New users see a chat box and think "ChatGPT wrapper." Differentiators (code awareness, real pricing, expert marketplace) are not immediately visible.
- **Mobile fragmentation:** Navigating between pages on mobile loses context and feels disjointed.

## Design

### 1. Page Architecture

- **`/`** — single primary experience with full chat capabilities, dark theme (`earth-brown-dark`)
- **`/chat`** — 301 permanent redirect to `/` via `next.config.ts` with session state migration
- **Two tabs:** "Ask Anything" (unified AI) | "Talk to a Pro" (renamed from "Ask an Expert" — positions as escalation, not competition)

### 2. Hero State (No Active Conversation)

Renders when `messages.length === 0`. Centered layout.

**Headline:**
> Plan it. Price it. Ask a pro. Build it right.

**Subtitle:**
> Quick answers when you're mid-build. Full project plans when you're starting fresh. Real material pricing. Real tradespeople.

**Tab selector:** Pill-style toggle — "Ask Anything" | "Talk to a Pro"

**Input area:** Large textarea — placeholder: "Describe your project or ask a question..."

**Suggestion chips** (capability-signaling, not generic):
- "I'm mid-project — my mortar isn't setting"
- "Is my electrical panel safe for a hot tub?"
- "Price out a bathroom remodel"
- "What permits do I need for a deck in [city]?"

First two signal mid-project/troubleshooting. Last two signal planning/pricing. Covers all intent types.

**Recent conversations:** Grid below chips, logged-in users only. Same format as current landing page.

**Footer:** About | Become an Expert | Powered by Claude AI

### 3. Chat State (Hero Morphs Away After First Message)

When `messages.length > 0`, hero collapses and full chat takes over. Driven by existing `hasConversation` state.

**Chat area:**
- Streaming markdown responses (existing `ReactMarkdown` rendering)
- User messages: terracotta bubbles, right-aligned
- Assistant messages: `white/10` background bubbles, left-aligned
- Same styling as current `LandingQuickChat` dark theme

**First AI response design principle:** Every response, regardless of intent, must include at least one concrete element ChatGPT cannot produce:
- A code/permit reference with jurisdiction awareness
- A material with pricing context
- A safety callout specific to the trade domain

**Intent micro-signal:** After classification, show a subtle tag below the first AI response — e.g., `"Identified as: project planning"` — light gray, non-intrusive. Gives users a correction hook. Emitted via new SSE event type `intent` from `/api/chat/route.ts`.

**Contextual action buttons** (inline, after AI responses when relevant):
- **"Save Materials"** — appears when materials detected in response (green, primary)
- **"Save to Project"** — appears when conversation has substance (ghost)
- **"Plan This Project"** — appears when `full_project` intent detected, after visible output (ghost with sparkle icon)

**Input:** Pinned to bottom. Placeholder: "Ask a follow-up..."

**"New Chat":** Header action returns to hero state (clears messages).

### 4. Unified Intent Handling

Existing `lib/intelligence/intent-router.ts` classifies into four types. No user-facing mode selection.

| Intent | Behavior |
|--------|----------|
| `quick_question` | Concise answer. Include one differentiating artifact (code ref, price context). Suggestion chips for follow-ups. |
| `troubleshooting` | Diagnostic follow-up questions. Step-by-step with safety callouts. |
| `mid_project` | Context-aware, assumes active work. Immediate practical advice. |
| `full_project` | Immediate helpful response first (no gate-keeping), then offer "Plan This Project" CTA. |

Intent is emitted to the client via a new SSE event type so the UI can render the micro-signal and the appropriate CTA.

### 5. Conversational Project Planning (Replaces GuidedBot Wizard)

When `full_project` detected and user clicks "Plan This Project":

1. AI asks follow-up questions **one at a time**, smartly skipping anything already mentioned:
   - Location / zip code (for local codes and pricing)
   - Project scope / dimensions
   - Available tools
   - Budget range
   - Experience level / preferences
2. Once sufficient info gathered, triggers existing `useAgentRun` pipeline
3. `AgentProgress` renders inline in the chat area (same component)
4. `ReportView` renders inline when complete (same component)
5. Report includes confidence tiers (see section 7)

The info-gathering is driven by the chat API's system prompt — no separate wizard state machine needed. When the client sends a `planningMode: true` flag (set after user clicks "Plan This Project"), the API route appends planning-specific instructions to the system prompt that guide the AI to collect missing information conversationally before triggering the agent pipeline. The client tracks which fields have been gathered and sends them as context.

### 6. Feature Integration

**Contextual surfaces in chat (high visibility):**
- **Materials badge** — appears in AppHeader when materials detected. Badge count. Tapping opens shopping list drawer.
- **Save to Project** — inline action button after AI responses
- **Plan This Project** — inline CTA after `full_project` responses
- **Save Materials** — inline action button when materials detected

**Header drawers (organizational features):**
- **Projects** — existing `ProjectsSidebar` drawer
- **My Tools / Inventory** — existing `InventoryPanel` drawer
- **Conversation History** — accessible from header
- **My Questions** — existing Q&A drawer

Core differentiating features surface contextually in the chat flow. Organizational features live in the header where logged-in users expect them.

### 7. Trust & Confidence Signals (V1 Requirement)

AI responses include confidence-appropriate framing:

| Confidence | Examples | Rendering |
|-----------|----------|-----------|
| High | Materials quantities, general how-to, tool recommendations | Normal rendering |
| Medium | Code references, permit info, jurisdiction-specific guidance | Subtle note: "Based on typical [state] requirements — verify with your local building department" |
| Low | Structural assessments, electrical specifics, load calculations | Visible callout: "This involves safety-critical work. Consider consulting a licensed professional." + link to "Talk to a Pro" tab |

Implementation: confidence tier instructions added to `lib/system-prompt.ts`. The AI self-classifies confidence per response section.

**Error recovery:** If user corrects the AI, acknowledge and adjust. Intent micro-signal provides natural correction point for misclassification.

### 8. "Talk to a Pro" Tab

Renamed from "Ask an Expert." Same `QASubmitForm` functionality via `LandingExpertForm` component.

Mental model: "AI handles your question, a pro validates it." Tab positioned as escalation, not competition with AI.

### 9. /chat Redirect & Existing User Handling

**Redirect:** `next.config.ts` adds permanent redirect `/chat` → `/`

**State migration:**
- If user arrives via redirect with `conversation_id` in sessionStorage → auto-load conversation into chat state (skip hero)
- If user arrives via redirect with `project_id` in sessionStorage → load project context
- Existing bookmarks to `/chat` still work — land on `/` with same functionality

### 10. Mobile

- Naturally single-column throughout
- Hero state fills viewport — input immediately actionable
- Chat state is full-screen — feels like native chat app
- All features via slide-in drawers from header
- Suggestion chips in 2-column grid
- Materials badge compact in header
- Contextual action buttons wrap to fit mobile widths

## Components — Change Map

### Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Rewrite: hero-to-chat morph with full chat features, auth handling, project linking, conversation management |
| `components/LandingHero.tsx` | Simplify to two tabs, new headline/subtitle, capability-signaling chips |
| `components/LandingQuickChat.tsx` | Upgrade to full chat: materials extraction, save-to-project, intent micro-signal, confidence tiers, Plan CTA, agent pipeline inline |
| `components/AppHeader.tsx` | Add materials badge with count, history button |
| `app/api/chat/route.ts` | Emit intent classification as new SSE event type `intent` |
| `lib/system-prompt.ts` | Add confidence tier instructions, conversational planning mode |
| `next.config.ts` | Add `/chat` → `/` permanent redirect |

### Remove / Deprecate

| File | Reason |
|------|--------|
| `app/chat/page.tsx` | Replaced by redirect to `/` |
| `components/guided-bot/*` (10 files) | Wizard replaced by conversational planning |

### Keep Unchanged

| File | Reason |
|------|--------|
| `components/LandingExpertForm.tsx` | Renders under "Talk to a Pro" tab — same functionality |
| `lib/intelligence/intent-router.ts` | Already classifies into 4 intent types |
| `lib/intelligence/types.ts` | Intent types unchanged |
| `hooks/useChat.ts` | Reused as-is for chat state management |
| `hooks/useAgentRun.ts` | Reused for project planning pipeline |
| `components/AgentProgress.tsx` | Renders inline in chat during planning |
| `components/ReportView.tsx` | Renders inline in chat when plan complete |
| `components/ChatMessages.tsx` | Message rendering reused |
| `components/ChatInput.tsx` | Input component reused |
| `components/SaveToProjectModal.tsx` | Save flow reused |
| `components/ShoppingListView.tsx` | Renders in drawer when materials badge tapped |
| `components/ProjectsSidebar.tsx` | Renders in header drawer |
| `components/InventoryPanel.tsx` | Renders in header drawer |
| `components/ConversationList.tsx` | Renders in header drawer |

## Out of Scope

- Home profile / "home brain" persistent memory (Expansionist suggestion — future feature)
- Contractor handoff / warm referral from AI to marketplace (future feature)
- A/B testing headline variants
- Animated morph transition (CSS transition sufficient for V1)
- Changes to the agent pipeline itself
- Changes to the expert Q&A marketplace functionality
