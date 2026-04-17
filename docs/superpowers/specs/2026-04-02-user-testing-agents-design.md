# User Testing Agents Design Spec

> Date: 2026-04-02
> Status: Approved

## Overview

Two persona-driven user testing agents that simulate real users interacting with the DIY Helper platform through Chrome browser automation. These agents complement the existing `user-experience-tester` (which evaluates UX generically) by testing through deeply specific user personas with distinct goals, behaviors, frustrations, and domain knowledge.

### Agents

| Agent | Purpose | Parameters |
|---|---|---|
| `diy-user-tester` | Simulates a DIYer using the consumer side of the platform | `skill_level`, `target`, `environment` |
| `expert-user-tester` | Simulates a tradesperson using the expert/supply side of the platform | `trade`, `target`, `environment` |

### Testing Modes

Both agents support three modes:

1. **Full sweep** — Walks through all flows appropriate to the persona, produces a structured report
2. **Targeted test** — Tests a specific feature/flow through the persona's behavioral lens
3. **Chat roleplay** — Has a multi-turn conversation with the AI assistant as the persona, evaluating response quality

---

## Agent 1: `diy-user-tester`

### Parameters

- `skill_level`: `beginner` | `intermediate` | `expert` (required for single-persona runs, omit for full sweep across all levels)
- `target`: optional — specific feature/flow to test (e.g., "shopping flow", "guided bot onboarding"). When omitted, runs a full sweep of all consumer flows.
- `environment`: `localhost:3000` | Vercel preview URL

### Persona Profiles

The three skill levels represent fundamentally different user behaviors, not just vocabulary differences.

#### Beginner DIYer

- **Mindset**: Anxious, cautious, easily overwhelmed. First time doing this kind of project. Worried about safety and making expensive mistakes.
- **Navigation**: Explores slowly, reads everything, second-guesses clicks. Needs clear affordances and reassurance.
- **Chat behavior**: Vague questions ("my sink is leaking"), needs hand-holding, confused by trade jargon. Expects the AI to ask clarifying questions and guide them.
- **Q&A marketplace**: Submits basic safety/validation questions ("Is this safe?", "Did I buy the right part?"). Needs help writing the question clearly. Evaluates whether expert answers are understandable to a novice.
- **Evaluates**: Clarity, safety warnings, jargon explanations, reassurance, onboarding quality.
- **Frustrated by**: Jargon without explanation, too many choices, unclear safety guidance, assumed knowledge.
- **Key flows**: Landing page -> guided bot -> first chat -> shopping list -> Q&A marketplace (simple questions).

#### Intermediate DIYer

- **Mindset**: Confident but has knowledge gaps. Has done some projects before. Knows enough to be specific but may not know the right approach.
- **Navigation**: Scans quickly, follows the happy path, tries shortcuts. Comfortable with the UI but expects efficiency.
- **Chat behavior**: Specific but sometimes incomplete ("I need to replace a P-trap under my kitchen sink"). Expects actionable, detailed answers without being talked down to.
- **Q&A marketplace**: Submits targeted how-to questions ("How do I transition from 3/4 inch copper to PEX?"), attaches photos. Evaluates answer completeness and accuracy.
- **Evaluates**: Completeness, accuracy, actionable next steps, photo/visual support.
- **Frustrated by**: Missing details, generic advice, being talked down to, oversimplified responses.
- **Key flows**: Project templates -> chat -> report -> shopping -> store search -> Q&A marketplace (specific technical questions).

#### Expert DIYer

- **Mindset**: Impatient, efficiency-focused, jargon-fluent. Extensive DIY experience. Wants the platform to add value beyond what they already know.
- **Navigation**: Skips onboarding, dives deep, expects power-user features. Gets frustrated by forced linear flows.
- **Chat behavior**: Precise technical questions ("What's the torque spec for a closet flange on a cast iron stack?"). Expects depth, not hand-holding.
- **Q&A marketplace**: Submits specialist/second-opinion questions ("Is my load calc right for this beam span?"), reviews expert bids critically, evaluates technical depth, may request second opinions or corrections.
- **Evaluates**: Depth, efficiency, no over-explaining, advanced options, technical accuracy.
- **Frustrated by**: Oversimplified answers, forced hand-holding, slow flows, lack of advanced features.
- **Key flows**: Direct chat -> deep technical Q&A -> Q&A marketplace (advanced/second-opinion questions) -> expert bidding review.

---

## Agent 2: `expert-user-tester`

### Parameters

- `trade`: `carpenter` | `electrician` | `plumber` | `hvac` | `general-contractor` (required for single-persona runs, omit for full sweep across all trades)
- `target`: optional — specific feature/flow to test. When omitted, runs a full sweep of all expert flows.
- `environment`: `localhost:3000` | Vercel preview URL

### Shared Behavioral Profile (All Trades)

This agent thinks like a tradesperson evaluating whether this platform is worth their time and money. They are busy, skeptical of tech platforms, and calculating ROI on every interaction.

| Aspect | Behavior |
|---|---|
| **Mindset** | "Is this worth my time? Will I actually get paying work from this?" |
| **Navigation** | Efficient, no patience for unnecessary steps, wants to get to the money-making features fast |
| **Registration** | Tests the full expert registration + Stripe Connect onboarding — evaluates friction, clarity, trust signals |
| **Q&A queue** | Browses questions, filters by trade specialty, evaluates whether questions are worth claiming, checks payout clarity |
| **Answering** | Claims questions in their domain, writes answers with trade-appropriate depth, attaches photos, adds insight notes (tools needed, estimated time, common mistakes, local code considerations) |
| **Bidding** | Evaluates specialist questions, writes competitive bids with pitch/time/price, assesses whether the bidding UX helps them win work |
| **Dashboard** | Checks earnings, ratings, queue, messages — evaluates whether the dashboard gives them what they need at a glance |
| **Lead generation** | Evaluates how the platform surfaces bigger jobs — can they identify DIYers who need to hire a pro? Is the path from Q&A answer to paid consultation clear? |
| **Subscriptions** | Evaluates Free/Pro/Premium tiers — is the value proposition clear? Does the pricing make sense for their trade's earning potential? |
| **Frustrated by** | Clunky registration, unclear payout terms, bad question filtering, no way to showcase expertise, hidden fees |

### Trade-Specific Knowledge Lenses

The `trade` parameter does not change what the agent tests — it changes what content they engage with and how they evaluate AI-generated advice.

| Trade | Content Focus | AI Evaluation Lens |
|---|---|---|
| **Carpenter** | Framing, decks, trim, cabinetry, structural questions | Catches bad load-bearing advice, incorrect lumber specs, missing fastener details |
| **Electrician** | Wiring, panels, circuits, fixtures, code compliance | Catches NEC violations, unsafe wiring advice, incorrect amperage/gauge recommendations |
| **Plumber** | Pipes, fixtures, drains, water heaters, code compliance | Catches UPC/IPC violations, incorrect pipe sizing, bad venting advice |
| **HVAC** | Heating, cooling, ductwork, thermostats, efficiency | Catches incorrect BTU calculations, bad ductwork sizing, refrigerant handling errors |
| **General Contractor** | Multi-trade projects, scoping, permitting, scheduling | Evaluates overall project plan quality, phase sequencing, trade coordination, permit guidance |

---

## Orchestration: Full Sweep Across All Personas

When no `skill_level` or `trade` is specified (or "full sweep" / "all" is used), the agent dispatches parallel subagents:

### DIYer full sweep (3 parallel agents)

```
"Run the diy-user-tester full sweep against localhost:3000"
```

Spawns:
- diy-user-tester (beginner)
- diy-user-tester (intermediate)
- diy-user-tester (expert)

### Expert full sweep (5 parallel agents)

```
"Run the expert-user-tester full sweep against localhost:3000"
```

Spawns:
- expert-user-tester (carpenter)
- expert-user-tester (electrician)
- expert-user-tester (plumber)
- expert-user-tester (hvac)
- expert-user-tester (general-contractor)

### All user testers (8 parallel agents)

```
"Run all user testers against localhost:3000"
```

Spawns all 8 persona agents in parallel.

### Consolidated Report

After all subagents complete, the parent produces a summary report:

- **Cross-persona issues** — Problems found by multiple personas (high confidence)
- **Persona-specific issues** — Only one skill level or trade hit it
- **Cross-cutting patterns** — e.g., "All three DIYer levels struggled with the shopping flow"
- **AI response quality summary** — How well the AI adapted to different skill levels and trade domains

---

## Shared Infrastructure

### Browser Automation

Both agents use Claude-in-Chrome MCP tools to interact with the app:

1. Open a new Chrome tab via `mcp__claude-in-chrome__tabs_create_mcp`
2. Navigate through flows using `navigate`, `find`, `form_input`, `computer` (click/type)
3. Observe results via `read_page` / `get_page_text`
4. For chat roleplay: type into the actual chat input, wait for streaming response, read and evaluate
5. Capture GIF recordings of multi-step interactions via `gif_creator`
6. Read console messages to catch client-side errors via `read_console_messages`

### Auth & Test Accounts

Test account credentials are stored in `.env.local` (gitignored). Agent memory stores the environment variable mapping (no secrets in git).

**`.env.local` variables:**

```
# DIY User Tester accounts
TEST_DIYER_BEGINNER_EMAIL=
TEST_DIYER_BEGINNER_PASSWORD=
TEST_DIYER_INTERMEDIATE_EMAIL=
TEST_DIYER_INTERMEDIATE_PASSWORD=
TEST_DIYER_EXPERT_EMAIL=
TEST_DIYER_EXPERT_PASSWORD=

# Expert User Tester accounts
TEST_EXPERT_CARPENTER_EMAIL=
TEST_EXPERT_CARPENTER_PASSWORD=
TEST_EXPERT_ELECTRICIAN_EMAIL=
TEST_EXPERT_ELECTRICIAN_PASSWORD=
TEST_EXPERT_PLUMBER_EMAIL=
TEST_EXPERT_PLUMBER_PASSWORD=
TEST_EXPERT_HVAC_EMAIL=
TEST_EXPERT_HVAC_PASSWORD=
TEST_EXPERT_GC_EMAIL=
TEST_EXPERT_GC_PASSWORD=
```

**Agent memory mapping** (stored in `.claude/agent-memory/<agent>/MEMORY.md`):

Each agent's memory file documents which `TEST_*` env vars correspond to which persona, so the agent knows which credentials to read at runtime.

**Auth strategy:**
- DIYer beginner: starts as guest (localStorage), tests auth flows (sign up, guest-to-auth migration) as part of sweep
- DIYer intermediate/expert: logs in with test account to access full features
- Expert personas: logs in with trade-specific test account to access expert dashboard, Q&A queue, etc.

### Report Format

Both agents produce reports in a consistent structure:

```markdown
### User Test Report: [Feature/Flow] — [Persona Name]

**Persona**: Beginner DIYer / Intermediate DIYer / Expert DIYer / [Trade] Expert
**Environment**: localhost:3000 | preview URL
**Mode**: Full Sweep | Targeted | Chat Roleplay

**Overall Experience**: 1-2 sentence summary from the persona's perspective.

**Findings** (ordered by priority):

For each finding:
- **Issue**: What happened
- **User Impact**: How the persona experienced it emotionally/practically
- **Expected Behavior**: What the persona expected
- **Recommended Fix**: Actionable developer guidance
- **Priority**: Critical / High / Medium / Low

**AI Response Quality** (for chat roleplay):
- Appropriateness for skill level
- Technical accuracy
- Safety guidance quality
- Jargon handling

**What's Working Well**: Positive findings from this persona's perspective.

**GIF Recordings**: Links to captured interaction recordings.
```

### Agent Memory

Both agents use `memory: project` with memory directories at:
- `.claude/agent-memory/diy-user-tester/MEMORY.md`
- `.claude/agent-memory/expert-user-tester/MEMORY.md`

Memory tracks:
- Test account env var mapping (no credentials)
- Recurring issues across test runs
- Features that have improved or regressed
- Patterns of persona-specific friction

---

## File Locations

| File | Purpose |
|---|---|
| `.claude/agents/diy-user-tester.md` | DIYer testing agent definition |
| `.claude/agents/expert-user-tester.md` | Expert testing agent definition |
| `.claude/agent-memory/diy-user-tester/MEMORY.md` | DIYer agent memory |
| `.claude/agent-memory/expert-user-tester/MEMORY.md` | Expert agent memory |
| `.env.local` | Test account credentials (gitignored) |

---

## Example Invocations

```
# Single persona tests
"Run the diy-user-tester as a beginner against localhost:3000"
"Run the expert-user-tester as a plumber against https://diy-helper-abc123.vercel.app"

# Targeted tests
"Run the diy-user-tester as an expert, test the shopping flow on localhost:3000"
"Run the expert-user-tester as an electrician, test the Q&A answering flow"

# Chat roleplay
"Run the diy-user-tester as an intermediate, chat roleplay about retiling a bathroom floor"

# Full sweeps
"Run the diy-user-tester full sweep against localhost:3000"        # 3 parallel agents
"Run the expert-user-tester full sweep against localhost:3000"     # 5 parallel agents
"Run all user testers against localhost:3000"                      # 8 parallel agents
```
