# LLM Council Transcript — Unified Landing Page Design
**Date:** April 1, 2026  
**Topic:** DIY Helper Webapp — Consolidating landing page and /chat into a Hero-to-Chat Morph pattern

---

## Original Question

The user is redesigning a DIY home improvement webapp. Consolidating a landing page with 3 tabs (Quick Answer, Plan a Project, Ask an Expert) and a separate /chat page with full features (projects, shopping list, materials, tool inventory, conversation history, agent pipeline) into a single unified landing page.

## Framed Question

We're redesigning a DIY home improvement webapp (Next.js + Supabase + Claude AI). The app has ~36 features including AI chat, project planning with an agent pipeline, materials extraction with store pricing, tool inventory, shopping lists, and an expert Q&A marketplace.

Currently the app has two separate experiences: a landing page with 3 tabs (Quick Answer, Plan a Project, Ask an Expert) and a separate /chat page with full features. We're consolidating into a single unified landing page using a "Hero-to-Chat Morph" pattern.

**The design:**
1. Landing page becomes the single primary experience; /chat redirects to /
2. Two tabs: "Ask Anything" (unified AI) | "Ask an Expert" (human Q&A form)
3. Hero state: centered headline "What are you working on?", value prop subtitle, input, suggestion chips, differentiator badges. After first message, hero disappears and full chat takes over.
4. AI intent router classifies messages into quick_question/troubleshooting/mid_project/full_project — adapts behavior accordingly, no user-facing mode selection
5. For full_project intent: AI responds immediately, then offers "Plan This Project" CTA. If accepted, gathers info conversationally one at a time (replacing rigid wizard), then kicks off agent pipeline that renders progress/report inline.
6. All power features (projects, tools inventory, shopping list, materials, history) surface via header drawers, not page navigation.
7. Mobile-first: single-column hero morphs to chat naturally; all features via slide-in drawers.

**Target users:** DIY homeowners ranging from beginners to experienced. Many will be comparing this to just asking ChatGPT or Claude directly.

**Key value props vs generic AI:** Code-compliant answers, auto-generated material lists with real store prices, full project planning with agent pipeline, human expert marketplace.

**What's at stake:** This redesign determines whether new users understand the value quickly enough to stay vs. bouncing back to ChatGPT. It also determines whether the app feels cohesive or like features bolted onto a chat interface.

---

## Advisor Responses

### The Contrarian

The intent router is the load-bearing wall you haven't stress-tested. Everything downstream depends on it correctly classifying "my deck is rotting near the ledger board" as mid_project or full_project — but ambiguous messages will misclassify constantly, and the user has no way to correct it without breaking the conversational flow you're protecting. What's the recovery path when the AI treats a $15k structural repair like a quick question?

The "Plan This Project" CTA is a commitment trap. You're asking users to trust a pipeline they've never seen produce anything, based on one exchange. If the agent pipeline runs for 30 seconds and returns a mediocre plan, you've lost them permanently — and they'll tell ChatGPT about it.

The hero-to-morph pattern hides your differentiators at exactly the wrong moment. Suggestion chips and badges disappear the instant someone types. But that's when they most need to understand why this isn't just another chat box. You're spending your entire acquisition budget on first impressions, then going dark.

Header drawers for power features assumes users will discover them. They won't. Tool inventory and shopping lists are core value props — burying them in drawers means most users will never know they exist. "Mobile-first" is being used here to justify hiding complexity rather than solving it.

The biggest unasked question: what happens to existing users with the /chat redirect? "Redirects to /" is one line in a design doc but a potentially jarring experience for anyone with bookmarks, history, or muscle memory. That's your retention risk, not acquisition.

### The First Principles Thinker

The real problem isn't the UI pattern. It's the value discovery problem.

Users land, see a chat box, and their mental model immediately collapses to "this is just another ChatGPT wrapper." The Hero-to-Chat Morph doesn't solve this — it reinforces it. You're leading with the commodity feature (chat) and burying the differentiators (code compliance, real store prices, agent pipeline) as supporting text nobody reads.

Ask the foundational question: why do people bounce to ChatGPT? Not because the UI is wrong. Because they don't believe this will be better than what they already have. The morph pattern solves a navigation problem nobody has.

The actual job-to-be-done for a DIY homeowner isn't "chat with AI." It's "confidently complete a project without expensive mistakes."

Rebuild from that. What's the fastest path to demonstrating irreplaceable value? Probably not a blank chat input — it's showing a concrete output they couldn't get from ChatGPT: a real materials list with Home Depot prices, a permit-aware project plan, a code compliance note. Let them see the output before they invest in the input.

The intent router is solving the wrong abstraction layer. You don't need AI to classify intent — you need the user to witness a capability gap that makes classification irrelevant because they're already converted.

The question to answer before any design decision: What is the single thing a user could see in 8 seconds that ChatGPT provably cannot give them? Design backwards from that. Everything else is furniture arrangement.

### The Expansionist

The "Hero-to-Morph" is the right call, but you're underselling the biggest unlock here: this is the first DIY AI that remembers your house.

Every generic AI session starts cold. You're sitting on Supabase — which means you can accumulate a persistent home profile across sessions. After someone asks about their deck, their bathroom tile, their HVAC — the app knows their house better than they do. That's not a chat feature, that's a home brain. The landing page should hint at this: "Tell me about your project. I'll remember your house."

The agent pipeline for full_project is your actual moat, not the chat interface. ChatGPT can answer questions. It cannot produce a code-compliant materials list with real store prices and a phased timeline in one flow. Lead with the output, not the input. Show a finished project report in the hero — collapsed, scannable — before users even type anything. Let them see what they're getting before asking them to commit.

Adjacent opportunity being missed: contractor handoff. When a DIYer realizes mid-project they're in over their head, they need a contractor. The expert marketplace is positioned as Q&A, but it could be a warm handoff with full project context pre-loaded. That's a revenue-generating event that also rescues the user. No one else offers that.

The suggestion chips aren't just UX affordances — they're the fastest way to communicate capability scope. Make them surprising: "Is my electrical panel safe for this?" signals code-compliance. "What did I spend on the kitchen last year?" signals memory. Don't waste chips on "fix a leaky faucet."

### The Outsider

The "Hero-to-Chat Morph" is clever to you because you've been staring at it. To a first-time visitor, the page just... changes. That's disorienting without a clear signal of why it changed.

The two-tab label problem is real: "Ask Anything" versus "Ask an Expert" — the natural question is "what's the first tab, a non-expert?" The implication is the AI is less authoritative. You want the opposite impression.

"What are you working on?" is fine as a prompt, but nothing on the hero immediately answers the question a skeptical new user is actually asking: "Why shouldn't I just use ChatGPT for this?" Your differentiator badges are doing that work, but badges get ignored. That answer needs to be in the headline or the first sentence below it.

The intent router is invisible by design, but invisibility has a cost. When the AI silently decides someone asking about a leaky faucet is a "quick question" versus a "full project," users who expected more will think the app is limited. You need a micro-signal — even just a single line — that tells users the system understood what they're dealing with.

The "Plan This Project" CTA appearing after the first AI response is a second decision point that most users won't reach. You're burying your strongest differentiator behind a conversation that has to go well first.

Suggestion chips on the hero: these will determine whether someone engages at all. If they're generic ("Fix a leaky faucet," "Paint a room"), they signal nothing unique. They need to demonstrate capability, not just topics.

### The Executor

The intent router already exists at `/lib/intelligence/intent-router.ts` and the four classifications are already live in `/app/api/chat/route.ts`. The `GuidedBot` with its multi-step wizard is 556 lines across two files. `LandingQuickChat` is 427 lines and already handles streaming, materials extraction, and save-to-project.

Execution sequence:
- **Week 1:** Redirect /chat to /, strip three-tab system to two tabs.
- **Week 2:** Hero morph using existing `hasConversation` variable in LandingQuickChat.
- **Week 3:** Emit intent SSE event from API, render "Plan This Project" CTA inline.
- **After validation:** GuidedBot replacement (~2 weeks). Header drawers in parallel.

---

## Peer Reviews

### Anonymization Mapping
- Response A = The Contrarian
- Response B = The First Principles Thinker
- Response C = The Expansionist
- Response D = The Outsider
- Response E = The Executor

### Review 1
- **Strongest:** B — reframes the problem correctly with the 8-second ChatGPT test.
- **Biggest blind spot:** E — purely tactical, no success criteria for validation.
- **All missed:** Error states and trust recovery — a single bad answer about electrical/structural destroys trust permanently.

### Review 2
- **Strongest:** B — asks the only question that matters.
- **Biggest blind spot:** E — doesn't question whether the design solves the right problem.
- **All missed:** Error states and trust recovery — confident wrong answers are actively harmful for DIY.

### Review 3
- **Strongest:** B — actionable forcing function for competitive risk.
- **Biggest blind spot:** E — assumes router is reliable enough.
- **All missed:** The "Ask an Expert" tab — nobody examines the AI vs expert tab relationship, cannibalization risk, or business model tension.

### Review 4
- **Strongest:** B — identifies the actual strategic failure.
- **Biggest blind spot:** E — pure execution, zero product thinking.
- **All missed:** The "Ask an Expert" tab as a trust anchor — expert availability makes AI advice feel safe to act on.

### Review 5
- **Strongest:** B — reframes to the real risk.
- **Biggest blind spot:** E — treats existing code as solved.
- **All missed:** Trust calibration for AI errors — how UI communicates confidence, flags uncertainty, handles corrections.

---

## Chairman's Verdict

### Where the Council Agrees
- The intent router is the riskiest dependency. Failure modes are invisible.
- The hero leads with the wrong thing — chat is a commodity.
- Suggestion chips demonstrate topics, not capabilities.
- Feature discovery is broken — header drawers bury core value props.

### Where the Council Clashes
- Ship fast vs. rethink first (resolution: do both — ship morph but redesign what it says)
- "Plan This Project" CTA: commitment trap vs. core flow (resolution: CTA needs to be earned with visible output first)

### Blind Spots the Council Caught
1. Trust failure and error states are existential for a tool giving code/structural advice
2. The "Ask an Expert" tab is doing unexamined strategic work as a trust anchor
3. The /chat redirect needs state migration for existing users

### The Recommendation
Ship the morph, but redesign what the hero says and what the first AI response shows. The hero headline must answer the ChatGPT question. The first AI response must contain something structurally impossible to get from ChatGPT. Add intent router micro-signals. Rename "Ask an Expert" to position as escalation. Define confidence tiers before launch.

### The One Thing to Do First
Write the hero headline that is false or impossible for ChatGPT to claim. If you can't write it, the design isn't ready to build.
