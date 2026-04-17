# User Test Report: Full Sweep -- Expert DIYer

**Persona**: Expert DIYer
**Environment**: http://localhost:3000
**Mode**: Full Sweep
**Date**: 2026-04-02

**Overall Experience**: This platform has genuinely impressive AI depth for technical questions -- it cited IRC code sections correctly, did real math on notch/bore limits, and course-corrected when I challenged it. As an experienced DIYer, I got answers that actually moved my project forward rather than wasting my time with basics. But the UI has rough edges that would frustrate me: tables render as raw markdown, JSON leaks into responses, and the Q&A marketplace has some confusing flows.

## Findings

### Critical

(none — known issues from prior sweeps)

### High

1. **Markdown tables render as raw pipe characters instead of formatted HTML tables**
   - **User Impact**: Reading dense technical data (code limits, fastener specs, bore dimensions) as raw pipe-separated text is significantly harder to scan. 8-10 tables across 4 messages all broken.
   - **Expected Behavior**: Markdown tables should render as styled HTML table elements.
   - **Recommended Fix**: Add GFM table support to the markdown renderer (remark-gfm plugin).
   - *Also found by: Beginner, Intermediate*

2. **Raw JSON materials data leaks into visible chat responses**
   - **User Impact**: `---MATERIALS_DATA---` block with raw JSON displayed in chat. Looks broken, JSON truncated mid-object.
   - **Expected Behavior**: Materials data parsed silently, hidden from visible response.
   - **Recommended Fix**: Strip the materials data block from rendered content.
   - *Also found by: Intermediate*

3. **Q&A question character limit (500) too restrictive for expert-level questions**
   - **User Impact**: First attempt at a detailed technical question (551 chars) was rejected. Expert questions with dimensions, code references, and existing conditions easily exceed 500 chars.
   - **Expected Behavior**: Allow at least 1000-1500 characters. Show a visible character counter.
   - **Recommended Fix**: Increase Zod validation limit. Add visible character counter with max.
   - *New issue — expert-specific*

### Medium

4. **Validation error exposes raw field name ("questionText: Too big...")**
   - **User Impact**: Raw Zod validation error with internal field name shown. Looks like a developer error.
   - **Expected Behavior**: User-friendly message like "Your question is too long. Please keep it under 500 characters."
   - **Recommended Fix**: Map Zod validation errors to user-friendly messages.

5. **Duplicate question cards on Q&A detail page**
   - **User Impact**: Question text appears twice — "Question" and "Your Question" headings with identical content.
   - **Recommended Fix**: Remove duplicate or merge into single display.
   - *Also found by: Beginner, Intermediate*

6. **"My Questions" page has no way to submit a new question**
   - **User Impact**: Dead-end page says "Ask an expert from the home page." No button to submit from here.
   - **Expected Behavior**: Include "Ask a Question" CTA on the My Questions page.
   - **Recommended Fix**: Add CTA button on empty state and persistent action on the page.

### Low

7. **No prominent "New Chat" function within the chat**
   - **User Impact**: After a long multi-turn conversation, starting fresh should be faster. "New Chat" link is small and easy to miss.
   - **Recommended Fix**: Make "New Chat" button more prominent or add keyboard shortcut.

8. **Second Q&A question requires payment with no remaining-questions indicator**
   - **User Impact**: Transition from free to paid ($5-$8) is abrupt. No indication of how many free questions remain.
   - **Recommended Fix**: Add a free question counter/indicator near the form.

## AI Response Quality

- **Appropriateness for skill level**: Excellent. No over-explaining. Jumped straight into IRC code sections, fastener specs, dimensional math. Used trade terminology fluently.
- **Technical accuracy**: Very good. IRC R502.8 notching/boring rules cited correctly. Math correct (7.25/6 = 1.21", 7.25/3 = 2.42"). One initial self-contradiction corrected cleanly when challenged.
- **Safety guidance quality**: Strong. Flagged temporary shoring as "non-negotiable," recommended professional inspection for structural work.
- **Jargon handling**: Perfect. IRC section numbers, Simpson product names, standard trade terms used without unnecessary explanation.
- **Multi-turn context retention**: Excellent. Maintained context across 4 turns — span, spacing, notch location, tub load, code analysis.
- **Willingness to be corrected**: Excellent. Acknowledged pushback on sistering contradiction and notch location analysis, revised with specific reasoning.

## What's Working Well

- AI technical depth is genuinely valuable — specific code sections, dimensional calculations, ranked repair approaches
- Project report is comprehensive (9 sections including inspection checklist, photo documentation log, code references)
- Expert callout integration well-placed — suggests pro review for structural work without being pushy
- "Talk to a Pro" tab on home page is smart UX — AI chat and expert Q&A in same interface
- Free first question removes payment friction
- Conversation persists across navigation
