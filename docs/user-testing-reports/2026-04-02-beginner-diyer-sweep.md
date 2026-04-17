# User Test Report: Full Sweep -- Beginner DIYer

**Persona**: Beginner DIYer
**Environment**: http://localhost:3000
**Mode**: Full Sweep
**Date**: 2026-04-02

**Overall Experience**: I came to this app scared about my leaky sink and not knowing where to start. The AI chat was genuinely reassuring and gave me clear, step-by-step guidance that made me feel like I could actually do this. But my first impression was rough -- I saw a broken conversation from a previous session, the tables in the AI responses were unreadable walls of text, and I had no idea how to get from "the AI told me what to buy" to an actual shopping list until I figured out the Save Materials button. Once I was signed in, things came together much better.

## Findings

### Critical

1. **Stale chat conversation with error message persists on landing page after sign-out**
   - **User Impact**: As a brand-new visitor, my very first experience was seeing "Could not connect. Please check your internet connection and try again." and someone else's question about hydroponics. I thought the app was broken and almost left.
   - **Expected Behavior**: After sign-out, the landing page should show the clean hero experience. Guest sessions should not persist in localStorage across sign-out boundaries.
   - **Recommended Fix**: Clear chat-related localStorage keys on sign-out. On page load, if no authenticated session exists, do not resume a conversation from localStorage.

### High

2. **Markdown tables render as raw pipe-delimited text in chat responses**
   - **User Impact**: AI generated helpful comparison tables but they displayed as unformatted walls of text. As a beginner who needs clear visual organization, this made the information hard to parse.
   - **Expected Behavior**: Markdown tables should render as formatted HTML tables.
   - **Recommended Fix**: Add `remark-gfm` plugin for `react-markdown`, or update the AI system prompt to avoid generating tables and use structured lists instead.

3. **No guided onboarding flow for first-time users**
   - **User Impact**: Landed on the page with a text input and four example prompts, but no greeting, no walkthrough. Example prompts were somewhat advanced and didn't include anything matching a simple "something is broken, help" situation.
   - **Expected Behavior**: A brief welcome message or guided flow that asks orienting questions for new/guest users.
   - **Recommended Fix**: Add a lightweight onboarding step for new/guest users. Include at least one beginner-friendly example prompt.

4. **Shopping list feature is invisible/inaccessible to guest users**
   - **User Impact**: AI generated a full materials list but there was no "Save Materials" button for guests. The AI promised inventory-checking and list-building features that aren't available to guests.
   - **Expected Behavior**: Guest users should see the Save Materials button with a prompt to sign in.
   - **Recommended Fix**: Show the button for guests but prompt sign-in when clicked. Ensure AI system prompt is aware of auth state.

### Medium

5. **Shopping drawer shows "No projects yet" empty state with no guidance**
   - **User Impact**: No idea how to create a project or connect chat conversation to a shopping list. No "Create Project" button or explanation.
   - **Expected Behavior**: Empty state should explain how to get items into the shopping list.
   - **Recommended Fix**: Add explanation text and a "Start a chat" button linking back to the input.

6. **Question detail page shows duplicate question cards**
   - **User Impact**: After submitting Q&A question, detail page shows "Question" and "Your Question" cards with same text. Confused about whether submitted twice.
   - **Expected Behavior**: Show the question once in a clear format.
   - **Recommended Fix**: Consolidate into a single display or add clear labels differentiating them.

7. **"Find an Expert" page is a directory, not a way to ask a question**
   - **User Impact**: Clicked "Find an Expert" looking to ask a safety question, got a directory of profiles. Couldn't ask a question from here.
   - **Expected Behavior**: Should include a prominent "Ask a Question" CTA.
   - **Recommended Fix**: Add an "Ask a Question" button on the Find an Expert page.

### Low

8. **Video link rendering appears broken after AI responses**
   - **User Impact**: AI offered videos but rendering seemed non-functional.
   - **Expected Behavior**: Either show working video links or don't offer the feature.
   - **Recommended Fix**: Investigate video link rendering or update AI prompt to not offer it.

## AI Response Quality

- **Appropriateness for skill level**: Excellent. AI recognized beginner level and opened with reassurance.
- **Technical accuracy**: Good. Advice about P-traps, supply lines, shut-off valves was correct.
- **Safety guidance quality**: Very good. Dedicated "Important Safety Tips" section, emphasized turning off water, flagged when to call a professional.
- **Jargon handling**: Good but not perfect. "P-trap" explained, but "slip-joint nuts", "plumber's putty", "PTFE" were not.
- **Clarifying questions**: Excellent. Well-structured multiple-choice follow-up with "Not sure yet" option.

## What's Working Well

- Hero-to-chat morph is smooth and clean landing page is inviting
- AI tone is warm, encouraging, and beginner-appropriate
- Save Materials -> Shopping List flow works well when authenticated
- "FREE -- First question on us!" removes Q&A barrier for beginners
- AI asks good clarifying follow-up questions
- Feature pills communicate app value proposition quickly
