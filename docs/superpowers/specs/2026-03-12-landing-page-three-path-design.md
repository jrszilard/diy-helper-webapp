# Landing Page Three-Path Redesign

**Date:** 2026-03-12
**Status:** Draft
**Scope:** Replace the landing page hero section with a three-path tabbed entry point (Quick Answer, Plan a Project, Ask an Expert)

---

## Overview

The current landing page hero contains the GuidedBot, which funnels all users into a 7-phase project planning flow. This redesign replaces it with three distinct entry paths that showcase the app's full capabilities and serve three user personas:

1. **Quick Answer** — instant AI response with local code awareness
2. **Plan a Project** — full guided planning with materials, pricing, and compliance
3. **Ask an Expert** — simplified form to submit a question to the expert marketplace

The three paths appear as selectable cards/tabs at the top of the hero. Clicking one reveals its tailored experience below. Users can switch between paths at any time.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Nav Bar (unchanged)                                │
├─────────────────────────────────────────────────────┤
│  Headline                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ Quick Answer │ │ Plan Project│ │ Ask Expert  │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘  │
│         │               │               │          │
│  ┌──────▼───────────────▼───────────────▼──────┐   │
│  │         Selected path content area          │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Rest of landing page (unchanged)                   │
└─────────────────────────────────────────────────────┘
```

The three path cards act as tabs. The content area below renders the selected path's component. Quick Answer is the default active tab.

---

## Path 1: Quick Answer (Default)

### Purpose
Serves users who have a specific question and want an immediate answer. Demonstrates the app's AI capabilities, local code awareness, and expert escalation — differentiating from generic AI chat.

### Behavior

**Initial state:**
- Headline: "Ask anything about your home project"
- Single-line input with placeholder: e.g., "What size wire for a 20-amp circuit?"
- Send button
- Below input: 4-6 popular question chips that auto-fill the input when clicked (e.g., "Do I need a permit for...", "Can I mix PEX and copper?", "What's the code for...", "How to fix a leaky faucet?")

**After sending a message:**
- Popular question chips collapse/hide
- User message displays above the input
- AI response streams in below the user message (uses existing `/api/chat` with intent classification)
- Input repositions below the response for follow-up questions
- "Continue this conversation" button appears below the response
- Clicking "Continue this conversation" navigates to `/chat` with the conversation ID preserved via URL param or sessionStorage

**Conversation persistence:**
- The `/api/chat` route already creates a conversation record and returns a `conversationId` in the `done` SSE event
- Store this ID in component state
- When navigating to `/chat`, pass it so the chat page loads the existing conversation

### Error Handling
- API failure: show error message below input, allow retry
- Streaming timeout: show partial response with "Something went wrong" message
- Rate limiting: show "Too many requests" with retry timer

---

## Path 2: Plan a Project

### Purpose
Serves users planning a larger project. Provides the full guided planning experience.

### Behavior
- Renders the existing `GuidedBot` component directly in the content area
- The GuidedBot component is reused as-is — no modifications
- The full 7-phase flow runs: project selection → scope → location → tools → experience → budget → brief review → agent pipeline → report
- All GuidedBot functionality works identically to today

### Technical Notes
- GuidedBot is imported and mounted conditionally when this tab is active
- No props changes needed — GuidedBot manages its own state via `useGuidedBot` hook
- If the user switches tabs mid-flow, GuidedBot state is preserved (component stays mounted but hidden via CSS, or state is lifted)

---

## Path 3: Ask an Expert

### Purpose
Serves users who want a professional opinion. Provides a lightweight entry into the expert marketplace.

### Behavior

**Form fields:**
- Question text (textarea, required, placeholder: "Describe your question or project...")
- Trade category (dropdown: Electrical, Plumbing, HVAC, Carpentry, General, Roofing, Painting, Landscaping)
- State (dropdown, 2-letter state codes)

**Social proof below form:**
- Average expert rating (e.g., "4.9 avg rating")
- Questions answered count
- "First question free" callout

**Submit behavior:**
- Clicking "Submit to Expert Marketplace" navigates to `/marketplace/qa` with query params: `?question=<text>&trade=<category>&state=<state>`
- The marketplace Q&A page reads these params and pre-populates the full submission form
- User completes the submission there (pricing, payment, etc.)

### Error Handling
- Client-side validation: question text required (min 20 chars), trade and state required
- No API calls on the landing page — all submission happens on `/marketplace/qa`

---

## Component Structure

### New Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `LandingHero` | `components/LandingHero.tsx` | Three-tab container, manages active path state, renders headline and path cards |
| `LandingQuickChat` | `components/LandingQuickChat.tsx` | Mini chat for Quick Answer — input, streaming response, popular question chips, "Continue" button |
| `LandingExpertForm` | `components/LandingExpertForm.tsx` | Simplified expert question form with trade/state dropdowns and social proof |

### Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Replace `<GuidedBot>` in hero section with `<LandingHero>` |
| `app/marketplace/qa/page.tsx` | Read URL query params to pre-populate the Q&A submission form |

### Reused Components (No Changes)

| Component | Used By |
|-----------|---------|
| `GuidedBot` | Mounted inside LandingHero's "Plan a Project" tab |
| `/api/chat` route | Called by LandingQuickChat for streaming responses |

---

## LandingHero Component Design

```typescript
interface LandingHeroProps {}

// Internal state:
// activePath: 'quick' | 'plan' | 'expert' (default: 'quick')

// Renders:
// 1. Headline text
// 2. Three path cards as tabs (with icons, titles, descriptions)
// 3. Content area that conditionally renders:
//    - activePath === 'quick': <LandingQuickChat />
//    - activePath === 'plan': <GuidedBot />
//    - activePath === 'expert': <LandingExpertForm />
```

Tab switching: all three components stay mounted (hidden via CSS `display: none` when inactive) to preserve state. This prevents the GuidedBot from resetting if the user switches tabs and comes back.

---

## LandingQuickChat Component Design

```typescript
interface LandingQuickChatProps {}

// Internal state:
// messages: Array<{ role: 'user' | 'assistant', content: string }>
// input: string
// isStreaming: boolean
// streamingContent: string
// conversationId: string | null

// Behavior:
// 1. On send: POST to /api/chat with { message, streaming: true, history: [] }
// 2. Parse SSE stream (same format as existing chat)
// 3. On 'done' event: store conversationId from response
// 4. Show "Continue this conversation" button linking to /chat?conversationId=<id>
```

**Streaming implementation:** Reuse the SSE parsing pattern from `hooks/useChat.ts`. The LandingQuickChat component needs a simplified version — no tool handling, no materials extraction, just text streaming. The intent router and calibration happen server-side automatically.

**Popular question chips:** Hard-coded array of 4-6 common DIY questions. Clicking one sets the input value. Not fetched from an API.

---

## LandingExpertForm Component Design

```typescript
interface LandingExpertFormProps {}

// Internal state:
// questionText: string
// tradeCategory: string
// state: string

// Behavior:
// 1. Client-side validation (question min 20 chars, trade + state required)
// 2. On submit: router.push(`/marketplace/qa?question=${encodeURIComponent(text)}&trade=${trade}&state=${state}`)
```

**Trade categories:** Use the same list from the existing Q&A submission form for consistency.

**Social proof stats:** Hard-coded initially. Can be made dynamic later by querying expert/Q&A counts.

---

## Marketplace Q&A Page Update

The existing Q&A submission page at `app/marketplace/qa/page.tsx` needs to read URL query params and pre-populate the form:

```typescript
const searchParams = useSearchParams();
const prefillQuestion = searchParams.get('question') || '';
const prefillTrade = searchParams.get('trade') || '';
const prefillState = searchParams.get('state') || '';
```

These values initialize the form state. The user can edit before submitting.

---

## Path Card Design

Each card shows:
- Icon (Lightning bolt, Clipboard, Hard hat)
- Title ("Quick Answer", "Plan a Project", "Ask an Expert")
- 2-line description highlighting differentiators:
  - Quick Answer: "Get instant help with local codes & safety"
  - Plan a Project: "Full plan with costs, codes, and materials"
  - Ask an Expert: "Get a pro's verified opinion on your project"

Active card: highlighted border/background (using existing accent colors)
Inactive cards: muted border, clickable

---

## Styling

Follow existing palette:
- Card borders: `border-[#D4C8B8]`, active: `border-[#C67B5C]`
- Card backgrounds: `bg-white`, active: `bg-[#FFF8F2]`
- Text: `text-[#3E2723]` (primary), `text-[#7D6B5D]` (muted)
- Input: existing input styling from ChatInput/GuidedBot
- Buttons: `bg-[#C67B5C]` primary, `bg-[#4A7C59]` for submit actions
- Chips: `bg-[#F0E8DC]` with `text-[#5C4D42]`, hover to `bg-[#E8DFD0]`

---

## Out of Scope

- Changes to the GuidedBot component itself
- Changes to the chat page (`/chat`)
- Changes to the expert marketplace submission flow (beyond reading query params)
- Mobile-specific layouts (responsive handled by Tailwind, no mobile-first redesign)
- Analytics/tracking for path selection
- A/B testing infrastructure
- Dynamic social proof stats (hard-coded for now)
