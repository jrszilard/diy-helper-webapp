# UX Tester Memory

## Project Overview
- Next.js app (DIY home improvement assistant) with guided bot on homepage, full chat at /chat, expert marketplace
- Design system: warm earth tones (#C67B5C primary, #3E2723 text, #FDFBF7 bg), Lucide icons, Tailwind CSS
- Auth: Supabase email/password via AuthButton component, no OAuth yet
- Key routes: / (landing+guided bot), /chat (full chat), /experts (search), /marketplace/qa, /experts/dashboard

## Critical Known Issues (verified 2026-03-06)
- See `ux-findings-2026-03-06.md` for full report
- Auth modal broken on homepage: `backdrop-blur-xl` on nav creates containing block that clips `position:fixed` overlay
- /api/experts/search returns 500 consistently (DB/table issue) - UI misleadingly shows "No experts found"
- Silent auth redirects: /marketplace/qa, /experts/dashboard, /profile, /messages all redirect to / or /chat with no feedback
- Guided bot project cards remain visible after selection, cluttering the conversation

## Component Patterns
- AuthButton.tsx: Handles both sign-in modal and logged-in dropdown menu
- GuidedBot.tsx: Multi-step wizard (project->scope->location->tools->experience->budget->brief->agent run)
- useGuidedBot.ts: State machine with addUserMessage/addBotMessage helpers, 350ms typing delay
- Project templates defined in lib/templates/index.ts with icons as emoji strings
- WhyDIYHelper.tsx: 3-column comparison (Generic AI vs Google vs DIY Helper) using grid layout

## Nav Inconsistency
- Homepage nav: "Ask an Expert", "Find an Expert"
- /chat nav: "Ask Expert" (missing "an"), "Experts"
