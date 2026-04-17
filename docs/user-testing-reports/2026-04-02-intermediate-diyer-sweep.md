# User Test Report: Full Sweep -- Intermediate DIYer

**Persona**: Intermediate DIYer
**Environment**: http://localhost:3000
**Mode**: Full Sweep
**Date**: 2026-04-02

**Overall Experience**: I'm impressed with the depth of the AI responses and the integrated shopping flow, but there are several rough edges that slowed me down. The chat gave me exactly what I needed for my copper-to-PEX transition -- specific fitting types, step counts, code references. The store search actually found real products at local stores with prices. But raw JSON leaking into the chat, drawers that won't close, and no project templates made the experience feel unfinished in spots.

## Findings

### Critical

1. **Raw JSON/materials data leaks into chat response**
   - **User Impact**: When the AI generates a project report, raw JSON materials data and `---END_MATERIALS_DATA---` markers are displayed directly in the chat bubble. Makes the app look broken.
   - **Expected Behavior**: Materials data should be parsed silently and only formatted report content displayed.
   - **Recommended Fix**: Strip the JSON materials block from visible chat output before rendering.

### High

2. **Nav drawer sidebars (Projects, Shopping) cannot be toggled closed**
   - **User Impact**: Clicking nav buttons opens drawers, but clicking again doesn't close them. Close button and Escape key don't work. Only full page navigation dismisses them.
   - **Expected Behavior**: Toggle behavior on nav buttons. Escape key dismissal.
   - **Recommended Fix**: Add toggle logic to nav button click handlers. Add Escape key listener.

### Medium

3. **No project templates feature exists**
   - **User Impact**: Expected pre-built templates for common projects to accelerate the process. Only found a list of saved conversations.
   - **Expected Behavior**: Template picker or suggested project starters.
   - **Recommended Fix**: Add template library or pre-filled chat prompts for common projects.

4. **Sign In button triggers Chrome extension interference**
   - **User Impact**: Clicking "Sign In" navigated to a chrome-extension:// URL due to password manager interception.
   - **Expected Behavior**: Auth modal should open as overlay without triggering extensions.
   - **Recommended Fix**: Test with common extensions enabled, ensure form fields don't trigger auto-fill overlays.

5. **Store search price mismatch for P-Trap Kit**
   - **User Impact**: AI estimated $5, store search returned $16-$45. Lowe's result appeared to be wrong product entirely.
   - **Expected Behavior**: Search results should closely match the specific item. Wrong matches should be filtered.
   - **Recommended Fix**: Improve search query specificity. Add product match confidence scoring.

6. **Previous conversation persists from other accounts via localStorage**
   - **User Impact**: After signing out of beginner and into intermediate, previous account's conversation still displayed.
   - **Expected Behavior**: localStorage chat data should be scoped to authenticated user or cleared on sign-out.
   - **Recommended Fix**: Namespace localStorage chat keys by user ID, or clear on sign-out.

7. **Duplicate question display on Q&A detail page**
   - **User Impact**: Question text appears twice -- "Question" card and "Your Question" card.
   - **Expected Behavior**: Show once with clear status context.
   - **Recommended Fix**: Remove duplicate or merge into single display.

### Low

(none)

## AI Response Quality

- **Appropriateness for skill level**: Excellent. Perfectly calibrated for intermediate -- didn't over-explain basics, gave specific information needed.
- **Technical accuracy**: Strong. Fitting type comparison, step-by-step, code references (IRC P2904, P2905.4, IPC 605.9) all accurate. Specific product suggestion (Ridgid 101) correct.
- **Safety guidance quality**: Good. Warned about water pressure, corroded copper, code compliance without being over-the-top.
- **Jargon handling**: Perfect for intermediate. Used terms like "stub-out", "emery cloth", "deburr" without explanation — exactly right for this level.

## What's Working Well

- AI response depth with comparison tables, numbered steps, tight-space tips, and code references
- Shopping list with real store search (Ace, Lowe's, Home Depot) with prices, stock status, phone numbers
- Save Materials flow — seamless one-click save of 17 items
- Q&A marketplace form — clean, fast, "FREE -- First question on us" removes friction
- Expert callout in chat appears at exactly the right moment
- Feature pill badges communicate app value quickly
