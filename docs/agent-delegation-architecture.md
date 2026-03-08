# AI Agent Delegation System - Architecture Design

## Executive Summary

This document defines the architecture for an AI agent delegation system that allows DIYers
to describe a project and have AI agents autonomously research, design, source materials,
and produce a comprehensive project report -- all without the user manually driving
each step through chat.

The core insight: the existing chat route already chains Claude tool calls in a loop
(up to 10 iterations). The agent system extends this pattern into a **multi-phase
pipeline** where each phase has its own system prompt, tool subset, and output schema.
The user kicks it off, watches progress in real-time, and reviews the final report.

---

## 1. Agent Orchestration Architecture

### Pattern: Sequential Pipeline with Shared Context

After evaluating orchestrator/sub-agent, pipeline, and parallel-worker patterns, the
right fit here is a **sequential pipeline with a shared context object**. Here is why:

- The phases have hard dependencies: you cannot source materials until you know what
  materials are needed, and you cannot design a solution until you understand the codes
  and constraints.
- A single orchestrator dispatching sub-agents adds complexity (inter-agent messaging,
  conflict resolution) without clear benefit -- these phases are inherently serial.
- Parallel execution within a phase is valuable (e.g., searching multiple stores
  simultaneously), and the existing tool executor already handles `Promise.allSettled`
  for that.

### Pipeline Phases

```
[User Input] --> [Phase 1: Research] --> [Phase 2: Design] --> [Phase 3: Sourcing] --> [Phase 4: Report]
                      |                       |                      |                      |
                  Codes, permits,         Approach, steps,       Materials priced,      Formatted report
                  best practices,         materials list,        inventory cross-ref,   with all sections
                  safety warnings         tool requirements      optimized shopping     assembled
```

### Shared Context Object

Each phase reads from and writes to a single `AgentContext` object that accumulates
data through the pipeline:

```typescript
// /home/justin/AI-Projects/diy-helper-webapp/lib/agents/types.ts

interface AgentContext {
  // --- Input (set at run creation) ---
  projectDescription: string;
  location: {
    city: string;
    state: string;
    zipCode?: string;
  };
  projectId?: string;           // link to existing project
  userId: string;
  preferences?: {
    budgetLevel: 'budget' | 'mid-range' | 'premium';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    timeframe?: string;         // e.g., "2 weekends"
  };

  // --- Phase 1 output: Research ---
  research?: {
    buildingCodes: string;       // raw code search results
    localCodes: string;          // local jurisdiction results
    permitRequirements: string;  // permit summary
    bestPractices: string;       // web search results
    commonPitfalls: string;      // pitfalls and warnings
    safetyWarnings: string[];    // explicit safety callouts
    proRequired: boolean;        // flag if professional help needed
    proRequiredReason?: string;  // why professional is required
    rawToolResults: Record<string, string>; // all raw tool outputs
  };

  // --- Phase 2 output: Design ---
  design?: {
    approach: string;            // recommended approach narrative
    steps: ProjectStep[];        // ordered step-by-step plan
    materials: MaterialItem[];   // full materials list
    tools: ToolItem[];           // required tools
    estimatedDuration: string;   // e.g., "2-3 weekends"
    skillLevel: string;          // beginner/intermediate/advanced
    alternativeApproaches?: string; // other ways to do it
  };

  // --- Phase 3 output: Sourcing ---
  sourcing?: {
    pricedMaterials: PricedMaterial[];  // materials with real prices
    ownedItems: OwnedItem[];            // matched from inventory
    storeSummary: StoreSummary[];       // best stores to visit
    totalEstimate: number;              // total cost estimate
    savingsFromInventory: number;       // money saved from owned items
  };

  // --- Phase 4 output: Report ---
  report?: {
    id: string;
    sections: ReportSection[];
    generatedAt: string;
    version: number;
  };
}

interface ProjectStep {
  order: number;
  title: string;
  description: string;
  estimatedTime: string;
  skillLevel: string;
  safetyNotes?: string[];
  inspectionRequired?: boolean;
}

interface MaterialItem {
  name: string;
  quantity: string;
  category: string;
  estimatedPrice: string;
  required: boolean;
  notes?: string;
}

interface ToolItem {
  name: string;
  category: string;
  required: boolean;
  estimatedPrice?: string;
  notes?: string;
}

interface PricedMaterial {
  name: string;
  quantity: string;
  category: string;
  estimatedPrice: number;
  bestPrice?: number;
  bestStore?: string;
  required: boolean;
  priceConfidence: 'high' | 'medium' | 'low';
}

interface OwnedItem {
  materialName: string;
  ownedAs: string;
  category: string;
}

interface StoreSummary {
  store: string;
  itemCount: number;
  totalPrice: number;
  distance?: string;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;   // markdown
  order: number;
  type: 'overview' | 'codes' | 'plan' | 'materials' | 'shopping' |
        'safety' | 'videos' | 'cost' | 'timeline';
}
```

### Communication Between Phases

There is no message-passing or event bus. Each phase is a function that:
1. Receives the current `AgentContext`
2. Makes Claude API calls with phase-specific system prompts and tool subsets
3. Parses the structured output from Claude
4. Writes its results to the context object
5. Returns the updated context

This is dead simple to implement, debug, and test.

### Progress Tracking

The existing SSE infrastructure is reused. The agent run streams progress events
to the frontend through the same `ReadableStream` + `data:` pattern the chat
route already uses. New event types are added:

```typescript
interface AgentProgressEvent {
  type: 'agent_progress';
  runId: string;
  phase: 'research' | 'design' | 'sourcing' | 'report';
  phaseStatus: 'started' | 'tool_call' | 'completed' | 'error';
  message: string;
  detail?: string;         // e.g., "Searching Austin, TX building codes..."
  phaseProgress?: number;  // 0-100 within phase
  overallProgress: number; // 0-100 across all phases
}

interface AgentCompleteEvent {
  type: 'agent_complete';
  runId: string;
  reportId: string;
  summary: string;
}

interface AgentErrorEvent {
  type: 'agent_error';
  runId: string;
  phase: string;
  message: string;
  recoverable: boolean;
}
```

### Error Handling and Retry Strategy

Each phase wraps its Claude API calls with the existing `withRetry` utility.
Phase-level error handling follows this policy:

1. **Tool failure within a phase**: Log the error, include a note in the context
   (e.g., "Local code search unavailable -- verify manually"), and continue.
   The report will flag incomplete sections.

2. **Claude API failure**: Retry up to 3 times with exponential backoff (reusing
   `withRetry`). If all retries fail, mark the phase as `error` and stop the pipeline.
   The user sees what was completed and can retry from the failed phase.

3. **Phase timeout**: Each phase has a maximum execution time (configurable, default
   120 seconds for research/design, 180 seconds for sourcing due to store searches).
   If exceeded, the phase completes with partial results and flags the timeout.

4. **User cancellation**: The frontend can send a cancellation signal. The API route
   checks a cancellation flag before starting each new phase and between tool calls
   within a phase. Cancellation is graceful -- completed phases are preserved.

---

## 2. Agent Definitions

### Phase 1: Research Agent

**Purpose**: Gather all relevant building codes, permit requirements, best practices,
safety information, and common pitfalls for the project in the user's jurisdiction.

**System Prompt** (abbreviated):
```
You are a building code researcher. Given a DIY project description and location,
your job is to thoroughly research:
1. Applicable national building codes (NEC, IRC, IBC)
2. Local building codes and amendments for the specific city/state
3. Permit requirements
4. Best practices and common pitfalls
5. Safety warnings -- especially anything that requires a licensed professional

You MUST output your findings as structured JSON matching the provided schema.
Flag any project that requires licensed work (electrical panel, gas lines, structural
modifications, etc.) with proRequired: true.
```

**Tools Used**:
- `search_building_codes` -- national codes
- `search_local_codes` -- local jurisdiction codes
- `web_search` -- best practices, common pitfalls
- `web_fetch` -- read specific code pages

**Input**: `AgentContext.projectDescription`, `AgentContext.location`

**Output**: `AgentContext.research`

**Estimated Duration**: 30-60 seconds (4-6 tool calls, mostly web searches)

### Phase 2: Design Agent

**Purpose**: Based on research findings, design the recommended approach: step-by-step
plan, complete materials list, tool requirements, timeline, and skill assessment.

**System Prompt** (abbreviated):
```
You are a project design specialist. Given research findings about codes, permits,
and best practices, design a complete project plan.

You MUST produce:
1. A recommended approach with rationale
2. Step-by-step instructions ordered by dependency (you do not tile before you
   waterproof, you do not drywall before you rough-in)
3. A COMPLETE materials list with accurate quantities and estimated prices
4. A tool requirements list
5. Timeline estimate based on a DIYer working weekends
6. Skill level assessment for each major step

Use the pricing reference guide for material estimates. Output as structured JSON.
```

**Tools Used**:
- `search_project_videos` -- find relevant tutorial videos
- `web_search` -- specific technique research, product specs
- `calculate_wire_size` -- if electrical work is involved

**Input**: `AgentContext.projectDescription`, `AgentContext.location`,
`AgentContext.research`, `AgentContext.preferences`

**Output**: `AgentContext.design`

**Estimated Duration**: 20-40 seconds (2-4 tool calls, mostly Claude reasoning)

### Phase 3: Sourcing Agent

**Purpose**: Price materials from real stores, cross-reference user inventory,
optimize the shopping list, and find best deals.

**System Prompt** (abbreviated):
```
You are a materials sourcing specialist. Given a materials and tools list,
your job is to:
1. Check the user's inventory to identify items they already own
2. Search for real prices at local stores
3. Compare prices across stores
4. Produce an optimized shopping list with the best store to visit

Focus on accuracy. Use real store search results. Flag items where pricing
could not be verified.
```

**Tools Used**:
- `check_user_inventory` -- what does the user already own
- `search_local_stores` -- search for materials at nearby stores
- `compare_store_prices` -- compare across stores
- `search_products` -- product search for pricing
- `web_search` -- fallback pricing research

**Input**: `AgentContext.design.materials`, `AgentContext.design.tools`,
`AgentContext.location`

**Output**: `AgentContext.sourcing`

**Estimated Duration**: 60-120 seconds (many store searches, this is the slowest phase)

**Optimization**: Materials are searched in parallel batches (3-4 concurrent searches)
using the existing `storeSearch` concurrency pattern. High-priority (required) items
are searched first. If the phase timeout approaches, remaining items get estimated
prices only.

### Phase 4: Report Agent

**Purpose**: Assemble all phase outputs into a well-formatted, comprehensive project
report.

**System Prompt** (abbreviated):
```
You are a project report writer. Given research, design, and sourcing data,
produce a clear, actionable project report that a DIYer can follow.

The report MUST include these sections:
1. Project Overview (what, where, estimated cost, timeline)
2. Permits & Code Compliance (what is required, what to verify)
3. Safety Warnings (anything dangerous, when to call a pro)
4. Step-by-Step Plan (ordered instructions with time estimates)
5. Materials & Shopping List (priced, with store recommendations)
6. Tools Required (what to buy vs. rent vs. already owned)
7. Cost Breakdown (materials, tools, permits, total)
8. Recommended Videos (tutorial links organized by phase)
9. Timeline & Milestones (weekend-by-weekend schedule)

Write in clear, practical language. No jargon without explanation.
Format as markdown. Address the reader as "you."
```

**Tools Used**: None (pure generation from accumulated context)

**Input**: Full `AgentContext`

**Output**: `AgentContext.report`

**Estimated Duration**: 15-25 seconds (single Claude call, no tools)

---

## 3. Data Model Changes

### New Tables

```sql
-- /home/justin/AI-Projects/diy-helper-webapp/supabase/migrations/20260218000000_agent_system.sql

-- ============================================================================
-- Agent Delegation System Tables
-- ============================================================================

-- Agent run: tracks a full pipeline execution
CREATE TABLE IF NOT EXISTS agent_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Input
  project_description  text NOT NULL,
  location_city        text,
  location_state       text,
  location_zip         text,
  budget_level         text CHECK (budget_level IN ('budget', 'mid-range', 'premium')),
  experience_level     text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  timeframe            text,

  -- Status tracking
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'error', 'cancelled')),
  current_phase text CHECK (current_phase IN ('research', 'design', 'sourcing', 'report')),
  error_message text,
  cancelled_at  timestamptz,

  -- Timing
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(user_id, status);

-- Agent phase: tracks each phase within a run
CREATE TABLE IF NOT EXISTS agent_phases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  phase       text NOT NULL CHECK (phase IN ('research', 'design', 'sourcing', 'report')),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'running', 'completed', 'error', 'skipped')),

  -- Phase data (JSONB for flexibility)
  input_data  jsonb,          -- what was fed into this phase
  output_data jsonb,          -- what this phase produced
  tool_calls  jsonb,          -- log of tool calls made [{tool, input, output, duration_ms}]

  -- Error tracking
  error_message text,
  retry_count   integer DEFAULT 0,

  -- Timing
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_phases_run_id ON agent_phases(run_id);
CREATE UNIQUE INDEX idx_agent_phases_run_phase ON agent_phases(run_id, phase);

-- Project report: the final deliverable
CREATE TABLE IF NOT EXISTS project_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Report content
  title       text NOT NULL,
  sections    jsonb NOT NULL,      -- array of ReportSection objects
  summary     text,                -- brief one-paragraph summary

  -- Metadata
  version       integer DEFAULT 1,
  total_cost    numeric,           -- total estimated project cost
  share_token   text UNIQUE,       -- for public share links
  share_enabled boolean DEFAULT false,

  -- Timing
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_reports_user_id ON project_reports(user_id);
CREATE INDEX idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX idx_project_reports_run_id ON project_reports(run_id);
CREATE INDEX idx_project_reports_share_token ON project_reports(share_token)
  WHERE share_token IS NOT NULL;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- Agent runs: users can only see/manage their own
CREATE POLICY "Users can view own agent runs"
  ON agent_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent runs"
  ON agent_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent runs"
  ON agent_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- Agent phases: accessible through run ownership
CREATE POLICY "Users can view own agent phases"
  ON agent_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own agent phases"
  ON agent_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own agent phases"
  ON agent_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

-- Project reports: users can see their own, and shared reports via token
CREATE POLICY "Users can view own reports"
  ON project_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports"
  ON project_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON project_reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Public share access (uses a separate service-role query, not RLS)
-- The share route will use the service role client to look up by share_token

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER agent_runs_updated_at
  BEFORE UPDATE ON agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_reports_updated_at
  BEFORE UPDATE ON project_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Why JSONB for Phase Data

Phase inputs and outputs are stored as JSONB rather than normalized tables because:
1. The schemas evolve as we iterate on prompts and tools.
2. We never query within the phase data -- we always load the full run context.
3. It avoids a proliferation of narrow tables for each phase's unique fields.
4. JSONB is what Supabase/Postgres does best for semi-structured data.

---

## 4. API Design

### New API Routes

```
POST   /api/agents/runs              -- Start a new agent run
GET    /api/agents/runs              -- List user's agent runs
GET    /api/agents/runs/[id]         -- Get run details + phases
GET    /api/agents/runs/[id]/stream  -- SSE stream for real-time progress
POST   /api/agents/runs/[id]/cancel  -- Cancel a running agent run
POST   /api/agents/runs/[id]/retry   -- Retry from failed phase

GET    /api/reports                  -- List user's reports
GET    /api/reports/[id]             -- Get full report
POST   /api/reports/[id]/share      -- Generate share link
GET    /api/reports/share/[token]    -- Public report access (no auth)
POST   /api/reports/[id]/apply      -- Apply report to project (create shopping list)
```

### Start Agent Run

```typescript
// POST /api/agents/runs
// /home/justin/AI-Projects/diy-helper-webapp/app/api/agents/runs/route.ts

// Request body:
interface StartAgentRunRequest {
  projectDescription: string;   // "Build a 12x16 deck in my backyard"
  city: string;                 // "Austin"
  state: string;                // "TX"
  zipCode?: string;             // "78701"
  budgetLevel?: 'budget' | 'mid-range' | 'premium';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeframe?: string;           // "2 weekends"
  projectId?: string;           // link to existing project
  conversationId?: string;      // pull context from prior chat
}

// Response (SSE stream):
// Content-Type: text/event-stream
//
// data: {"type":"agent_progress","runId":"...","phase":"research","phaseStatus":"started","message":"Starting project research...","overallProgress":5}
// data: {"type":"agent_progress","runId":"...","phase":"research","phaseStatus":"tool_call","message":"Searching Austin, TX building codes...","overallProgress":10}
// ...
// data: {"type":"agent_progress","runId":"...","phase":"research","phaseStatus":"completed","message":"Research complete","overallProgress":25}
// data: {"type":"agent_progress","runId":"...","phase":"design","phaseStatus":"started","message":"Designing project plan...","overallProgress":30}
// ...
// data: {"type":"agent_complete","runId":"...","reportId":"...","summary":"Your 12x16 deck project plan is ready..."}
// data: {"type":"done"}
```

### Key Implementation Detail: Streaming Long-Running Work

The agent run executes within a single HTTP request using `ReadableStream`, exactly
like the existing chat route. This avoids the need for background job infrastructure
(no Redis, no Bull, no worker processes). Next.js edge/node runtime supports
long-running streams.

However, since the agent pipeline can take 2-5 minutes, we need to handle:

1. **Vercel function timeout**: On Vercel, serverless functions have a 60-second
   timeout on Hobby (300s on Pro). Since this app uses `runtime = 'nodejs'` and is
   likely on Pro, 300 seconds is sufficient. If on Hobby, the phases would need to
   be split across separate requests with polling.

2. **Connection drops**: If the SSE connection drops mid-run, the pipeline continues
   server-side (the database is updated after each phase). The frontend reconnects
   and fetches the current state from `GET /api/agents/runs/[id]`.

3. **Keep-alive**: Send periodic heartbeat events (`data: {"type":"heartbeat"}\n\n`)
   every 15 seconds to prevent proxies and load balancers from closing idle connections.

```typescript
// Simplified flow in the route handler:

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) return unauthorized();

  const body = await req.json();
  // Validate with Zod...

  // Create the run record
  const { data: run } = await auth.supabaseClient
    .from('agent_runs')
    .insert({ user_id: auth.userId, project_description: body.projectDescription, ... })
    .select()
    .single();

  // Create phase records
  for (const phase of ['research', 'design', 'sourcing', 'report']) {
    await auth.supabaseClient
      .from('agent_phases')
      .insert({ run_id: run.id, phase, status: 'pending' });
  }

  // Stream the pipeline execution
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const context: AgentContext = {
        projectDescription: body.projectDescription,
        location: { city: body.city, state: body.state },
        userId: auth.userId,
        preferences: { ... },
      };

      try {
        // Phase 1: Research
        await runPhase('research', context, run.id, auth, sendEvent);

        // Phase 2: Design
        await runPhase('design', context, run.id, auth, sendEvent);

        // Phase 3: Sourcing
        await runPhase('sourcing', context, run.id, auth, sendEvent);

        // Phase 4: Report
        await runPhase('report', context, run.id, auth, sendEvent);

        // Save final report
        const report = await saveReport(context, run.id, auth);

        sendEvent({ type: 'agent_complete', runId: run.id, reportId: report.id, ... });
      } catch (error) {
        sendEvent({ type: 'agent_error', runId: run.id, ... });
      }

      sendEvent({ type: 'done' });
      controller.close();
    }
  });

  return new Response(stream, { headers: sseHeaders });
}
```

### Reconnection Flow

When a user navigates away and comes back, or when the SSE connection drops:

1. Frontend checks `GET /api/agents/runs/[id]` for current state.
2. If status is `running`, reconnect to `GET /api/agents/runs/[id]/stream` to
   resume receiving events.
3. If status is `completed`, load the report directly.
4. If status is `error`, show the error with a retry button.

This means the stream endpoint also needs a `GET` variant that can pick up mid-run:

```typescript
// GET /api/agents/runs/[id]/stream
// This reconnects to an in-progress run's event stream.
// Uses a simple in-memory pub/sub (Map<runId, Set<controller>>)
// that the pipeline publishes to.
```

For the MVP, if the connection drops during a run, the run completes server-side
and the user sees the final result when they poll. A reconnectable stream is a
Phase 2 enhancement.

---

## 5. Frontend UX

### Initiating an Agent Run

Two entry points:

**Entry Point 1: Dedicated "Plan My Project" Button**

A prominent button on the chat page (alongside the existing "Save to Project" button)
that opens a focused project intake form:

```
+-------------------------------------------------------+
|  Plan My Project                                  [X]  |
|-------------------------------------------------------|
|  What do you want to build?                           |
|  [Build a 12x16 composite deck in my backyard    ]    |
|                                                       |
|  Location                                             |
|  City: [Austin        ]  State: [TX   ]               |
|                                                       |
|  Your experience level                                |
|  ( ) Beginner  (o) Intermediate  ( ) Advanced         |
|                                                       |
|  Budget preference                                    |
|  ( ) Budget  (o) Mid-Range  ( ) Premium               |
|                                                       |
|  [Link to Existing Project v]  (optional dropdown)    |
|                                                       |
|         [ Start Planning ]                            |
+-------------------------------------------------------+
```

**Entry Point 2: Chat-Initiated**

When a user describes a project in chat and the AI detects enough context (project
type + location), the assistant responds with a prompt:

> "I can create a complete project plan for your 12x16 deck in Austin, TX.
> This will research building codes, design a step-by-step plan, find materials
> at local stores, and generate a full report. Want me to do that?"

If the user agrees, the frontend opens the intake form pre-filled with extracted info.

### Progress UI

While agents work, the user sees a dedicated progress panel that replaces the chat
area (or slides in as an overlay on mobile):

```
+---------------------------------------------------------------+
|  Planning: 12x16 Composite Deck                               |
|  Austin, TX | Mid-Range Budget | Intermediate                 |
|===============================================================|
|                                                               |
|  Overall Progress                                             |
|  [=========================================-------]  72%     |
|                                                               |
|  Phase 1: Research              [completed]                   |
|    - Searched national building codes         [done]          |
|    - Searched Austin, TX local codes          [done]          |
|    - Searched permit requirements             [done]          |
|    - Researched best practices                [done]          |
|    - Checked safety requirements              [done]          |
|    Duration: 34s                                              |
|                                                               |
|  Phase 2: Project Design        [completed]                   |
|    - Designed 14-step project plan            [done]          |
|    - Created materials list (28 items)        [done]          |
|    - Identified tool requirements (12 items)  [done]          |
|    - Found 5 tutorial videos                  [done]          |
|    Duration: 22s                                              |
|                                                               |
|  Phase 3: Materials Sourcing    [in progress]                 |
|    - Checked your inventory (3 matches)       [done]          |
|    - Searching Home Depot prices...           [running]       |
|    - Searching Lowe's prices...               [running]       |
|    - Comparing store prices...                [pending]       |
|    Elapsed: 45s                                               |
|                                                               |
|  Phase 4: Report Generation     [pending]                     |
|                                                               |
|                        [ Cancel ]                             |
+---------------------------------------------------------------+
```

Key UX details:
- Each phase expands to show individual tool calls as they happen.
- Completed phases collapse with a summary.
- A heartbeat animation on the active step so the user knows it is working.
- The "Cancel" button is always visible.
- If a phase errors, a "Retry" button appears inline.

### Report Presentation

When the pipeline completes, the progress panel transitions to the report view.
The report uses a tabbed or scrollable section layout:

```
+---------------------------------------------------------------+
|  Project Plan: 12x16 Composite Deck                           |
|  Austin, TX | Generated Feb 17, 2026                          |
|===============================================================|
|                                                               |
|  [Overview] [Codes] [Plan] [Materials] [Cost] [Videos]       |
|---------------------------------------------------------------|
|                                                               |
|  OVERVIEW                                                     |
|  Build a 12x16 composite deck attached to your home in        |
|  Austin, TX. Estimated cost: $3,200-$4,100. Timeline: 2-3    |
|  weekends. Skill level: Intermediate.                         |
|                                                               |
|  PERMIT REQUIRED: Austin requires a building permit for       |
|  decks over 200 sq ft. Estimated permit fee: $75-150.        |
|  Apply at: austintexas.gov/building-permits                   |
|                                                               |
|  WARNING: Deck ledger board attachment to house requires      |
|  proper flashing and fastening per IRC R507.2. Improper      |
|  attachment is the #1 cause of deck collapse.                 |
|                                                               |
|  ...                                                          |
|---------------------------------------------------------------|
|                                                               |
|  [ Save to Project ]  [ Export PDF ]  [ Share Link ]          |
|                                                               |
+---------------------------------------------------------------+
```

### User Intervention

- **Cancel**: Stops the pipeline after the current tool call completes. Completed
  phases are preserved and visible.
- **Retry**: Available on failed phases. Retries from the failed phase with
  accumulated context from prior phases.
- **Edit and Re-run**: After a report is generated, the user can modify their
  inputs and re-run. A new agent run is created (the old one is preserved for
  comparison).
- **Apply to Project**: Creates a project (or links to existing) and populates
  the shopping list from the report's materials. This uses the existing
  `shopping_list_items` table and the same save flow as `SaveMaterialsDialog`.

---

## 6. Report Generation

### Report Sections

Every report includes these sections, in order:

| Section | Content | Data Source |
|---------|---------|-------------|
| **Project Overview** | Brief description, scope, estimated cost, timeline, skill level | design + sourcing |
| **Permits & Code Compliance** | What permits are needed, how to apply, applicable codes, inspection points | research |
| **Safety Warnings** | Explicit safety callouts, when to hire a pro, PPE requirements | research + design |
| **Step-by-Step Plan** | Numbered steps with descriptions, time estimates, dependencies, skill level per step | design |
| **Materials List** | All materials with quantities, prices, store recommendations, inventory matches | design + sourcing |
| **Tools Required** | Tools needed (buy vs. rent vs. already owned), alternatives for expensive tools | design + sourcing |
| **Cost Breakdown** | Materials subtotal, tools subtotal, permit fees, contingency (10%), grand total | sourcing |
| **Shopping Guide** | Which store to visit, items per store, optimal shopping route, bulk discounts | sourcing |
| **Recommended Videos** | Tutorial videos organized by project phase, with difficulty ratings | design |
| **Timeline & Milestones** | Weekend-by-weekend schedule, inspection milestones, weather considerations | design |

### Database Structure

Reports are stored as a single row in `project_reports` with the `sections` JSONB
column containing the array of `ReportSection` objects. This keeps the schema simple
while allowing flexible content evolution.

```json
{
  "sections": [
    {
      "id": "overview",
      "title": "Project Overview",
      "content": "## 12x16 Composite Deck\n\nBuild a...",
      "order": 1,
      "type": "overview"
    },
    {
      "id": "codes",
      "title": "Permits & Code Compliance",
      "content": "### Permit Requirements\n\nAustin, TX requires...",
      "order": 2,
      "type": "codes"
    }
  ]
}
```

### Export Options

**PDF Export**: Use the browser's `window.print()` with a print-optimized CSS
stylesheet for the report view. This is zero-dependency and works everywhere.
For higher quality PDF generation in a future phase, add `@react-pdf/renderer`
or server-side Puppeteer.

**Share Link**: Generate a unique token (`crypto.randomUUID()`), store it in
`project_reports.share_token`, and serve the report at `/share/report/[token]`.
The share page uses a service-role Supabase client to bypass RLS and reads the
report by token.

**Copy to Clipboard**: One-click copy of the full report as formatted markdown.

---

## 7. Integration with Existing Features

### Existing Tool Reuse

The 12 existing tools are used directly by the agent phases. No changes to tool
definitions or the executor are needed -- the agent phases call `executeTool()`
the same way the chat route does.

| Tool | Phase 1 (Research) | Phase 2 (Design) | Phase 3 (Sourcing) |
|------|:--:|:--:|:--:|
| `search_building_codes` | Yes | | |
| `search_local_codes` | Yes | | |
| `web_search` | Yes | Yes | Yes |
| `web_fetch` | Yes | | |
| `search_project_videos` | | Yes | |
| `calculate_wire_size` | | Yes | |
| `extract_materials_list` | | | Yes (reuse pricing logic) |
| `check_user_inventory` | | | Yes |
| `search_local_stores` | | | Yes |
| `compare_store_prices` | | | Yes |
| `search_products` | | | Yes |
| `detect_owned_items` | | | |

`detect_owned_items` is not used by agents because inventory detection is a
conversational feature (reacting to what the user says they own). Agents use
`check_user_inventory` to read the existing inventory instead.

### Project Integration

When the user clicks "Apply to Project" on a report:

1. If no project exists, create one using the existing `projects` table with
   the report title as the project name and the overview as the description.
2. Insert all priced materials into `shopping_list_items` linked to the project.
   This uses the exact same logic as `SaveMaterialsDialog` / `useProjectActions`.
3. The `agent_runs.project_id` and `project_reports.project_id` are updated to
   link to the project.
4. The project appears in `ProjectsSidebar` and the shopping list appears in
   `ShoppingListView` immediately.

### Chat Context

If the user has been chatting about a project before launching an agent run, the
`conversationId` can be passed to the run. The first phase (Research) will load
recent conversation messages and include them as additional context in the Claude
prompt. This means the agent benefits from anything the user already discussed --
tools they own, specific preferences, constraints mentioned in chat.

### Inventory Integration

The sourcing phase calls `check_user_inventory` through the existing executor.
Items the user already owns are flagged in the report's materials section and
excluded from the shopping list when applied to a project.

---

## 8. Implementation Roadmap

### Phase 1: Foundation (MVP) -- 1-2 weeks

**Goal**: End-to-end agent pipeline that produces a report. No frills.

**What to build**:
1. Database migration (`agent_runs`, `agent_phases`, `project_reports`)
2. Agent types and context interfaces (`/lib/agents/types.ts`)
3. Phase runner utility (`/lib/agents/runner.ts`) -- takes a phase name,
   system prompt, tool list, and context; makes Claude API calls with tool
   loop; returns structured output
4. Four phase implementations (`/lib/agents/phases/research.ts`, `design.ts`,
   `sourcing.ts`, `report.ts`)
5. API route: `POST /api/agents/runs` with SSE streaming
6. API route: `GET /api/agents/runs/[id]` for polling
7. API route: `GET /api/reports/[id]` for report retrieval
8. Frontend: "Plan My Project" button + intake form modal
9. Frontend: Progress panel component (replacing chat area during run)
10. Frontend: Report view component (tabbed markdown sections)
11. Frontend: "Apply to Project" button (saves materials to shopping list)

**What to skip for now**: Cancellation, retry, reconnection, share links,
PDF export, chat context integration, conversation-initiated runs.

**Value delivered**: A DIYer can describe their project, press a button, wait
2-3 minutes, and get a comprehensive report with real prices. That is the
core value proposition.

### Phase 2: Polish & Reliability -- 1 week

**What to build**:
1. Cancellation support (cancel button, server-side flag check)
2. Retry from failed phase (re-runs only the failed phase with saved context)
3. Reconnection (poll-based: if connection drops, GET the run state and show
   completed phases + current progress)
4. Share links (`POST /api/reports/[id]/share`, `/share/report/[token]` page)
5. PDF export (print-optimized stylesheet)
6. Rate limiting for agent runs (max 5 runs per hour per user)
7. Cost tracking (log Claude API token usage per run for monitoring)

### Phase 3: Smart Features -- 1-2 weeks

**What to build**:
1. Chat-initiated agent runs: when the AI detects a plannable project in chat,
   suggest launching an agent run with pre-filled inputs
2. Chat context integration: feed recent conversation history into the
   research phase
3. Run history: list of past agent runs with status, accessible from sidebar
4. Report comparison: if the user runs agents twice for the same project,
   highlight differences
5. Partial re-run: let the user edit inputs and re-run only affected phases
   (e.g., change budget level re-runs design + sourcing + report, not research)

### Phase 4: Marketplace Foundation -- 2-3 weeks (future)

**What to build**:
1. "Get Expert Help" button in report view -- connects to the tradesperson
   marketplace (separate feature)
2. Report sharing with tradespeople for quote requests
3. Report-to-estimate: tradespeople can generate professional quotes from
   shared reports
4. Feedback loop: tradespeople can flag issues in reports, improving future
   agent accuracy

---

## File Structure

New files to create:

```
lib/agents/
  types.ts              -- AgentContext, phase input/output interfaces
  runner.ts             -- Core phase execution engine
  prompts.ts            -- System prompts for each phase
  phases/
    research.ts         -- Phase 1 implementation
    design.ts           -- Phase 2 implementation
    sourcing.ts         -- Phase 3 implementation
    report.ts           -- Phase 4 implementation

app/api/agents/
  runs/
    route.ts            -- POST (create run + stream) + GET (list runs)
    [id]/
      route.ts          -- GET (run details)
      stream/
        route.ts        -- GET (reconnect to SSE stream)
      cancel/
        route.ts        -- POST (cancel run)
      retry/
        route.ts        -- POST (retry from failed phase)

app/api/reports/
  route.ts              -- GET (list reports)
  [id]/
    route.ts            -- GET (full report)
    share/
      route.ts          -- POST (generate share link)
  share/
    [token]/
      route.ts          -- GET (public report access)
  [id]/
    apply/
      route.ts          -- POST (apply report to project)

components/
  AgentIntakeForm.tsx   -- Project intake form modal
  AgentProgress.tsx     -- Real-time progress panel
  ReportView.tsx        -- Tabbed report display
  ReportSection.tsx     -- Individual report section renderer

hooks/
  useAgentRun.ts        -- Frontend hook for managing agent run state + SSE

supabase/migrations/
  20260218000000_agent_system.sql  -- New tables
```

---

## Key Design Decisions and Rationale

### 1. Sequential pipeline, not parallel agents

**Decision**: Phases run sequentially, not in parallel.

**Rationale**: The phases have hard data dependencies. You cannot price materials
you have not identified yet. You cannot identify materials without understanding
the code requirements. Sequential is simpler to implement, debug, and reason about.
Parallelism happens within phases (e.g., searching multiple stores simultaneously).

### 2. Single HTTP stream, not background jobs

**Decision**: The agent pipeline runs within a single HTTP request using
`ReadableStream`, not as a background job with polling.

**Rationale**: This avoids adding infrastructure (Redis, Bull, worker processes).
The existing chat route already uses this pattern for multi-tool-call conversations.
The tradeoff is that very long runs (5+ minutes) might hit timeout limits on some
hosting configs, but the Pro Vercel plan supports 300-second functions, and most
runs should complete in 2-3 minutes.

**Alternative considered**: Background job with Supabase Realtime for progress.
Rejected because it adds significant infrastructure complexity for the MVP. Can be
migrated to this pattern later if timeout issues arise.

### 3. JSONB for phase data, not normalized tables

**Decision**: Phase inputs, outputs, and tool call logs are stored as JSONB.

**Rationale**: The data schemas will evolve rapidly as prompts are tuned. Normalizing
into typed columns would require frequent migrations. We never query within the phase
data (no "find all runs where research found permit requirements"). JSONB is the right
tool for this -- it is flexible, fast enough for our read patterns, and indexable if
needed later.

### 4. Structured output via Claude tool_use, not prose parsing

**Decision**: Each phase instructs Claude to call a "output" tool with structured
JSON matching the phase's output schema, rather than generating prose and parsing it.

**Rationale**: The Anthropic SDK supports tool_use as a reliable way to get structured
output from Claude. By defining an `output_phase_result` tool for each phase, we get
typed JSON that maps directly to our TypeScript interfaces. This is far more reliable
than regex-parsing markdown output. This is the same pattern Claude uses internally
for structured outputs.

```typescript
// Example: Phase 1 output tool
const researchOutputTool = {
  name: "submit_research_results",
  description: "Submit the research findings as structured data",
  input_schema: {
    type: "object",
    properties: {
      buildingCodes: { type: "string", description: "National code findings" },
      localCodes: { type: "string", description: "Local code findings" },
      permitRequirements: { type: "string", description: "Permit summary" },
      // ... rest of research output schema
    },
    required: ["buildingCodes", "localCodes", "permitRequirements", ...]
  }
};
```

### 5. Reports stored as markdown, rendered client-side

**Decision**: Report section content is stored as markdown strings, rendered with
the existing `react-markdown` dependency.

**Rationale**: The app already uses `react-markdown` for chat messages. Markdown
is human-readable, versionable, and renders well. No need for a rich text editor
or HTML storage.

---

## Cost and Performance Estimates

### Claude API Usage per Run

| Phase | Estimated Input Tokens | Estimated Output Tokens | Tool Calls |
|-------|----------------------:|----------------------:|----------:|
| Research | 3,000-5,000 | 2,000-4,000 | 4-6 |
| Design | 8,000-12,000 (includes research context) | 3,000-5,000 | 2-4 |
| Sourcing | 6,000-10,000 (includes design context) | 2,000-3,000 | 8-15 |
| Report | 15,000-25,000 (full context) | 4,000-8,000 | 0 |
| **Total** | **32,000-52,000** | **11,000-20,000** | **14-25** |

At Claude Sonnet pricing (~$3/M input, ~$15/M output tokens):
- Input cost: ~$0.10-0.16 per run
- Output cost: ~$0.17-0.30 per run
- **Total: ~$0.27-0.46 per agent run**

This is reasonable for a feature that delivers significant value. It could be
offered as a premium feature (limited free runs + unlimited for paid users) or
absorbed as a cost of the freemium model.

### Execution Time

| Phase | Estimated Duration |
|-------|------------------:|
| Research | 30-60s |
| Design | 20-40s |
| Sourcing | 60-120s |
| Report | 15-25s |
| **Total** | **~2-4 minutes** |

The sourcing phase is the bottleneck due to sequential store searches. Parallelizing
store searches (which the existing code already does with `Promise.allSettled`) keeps
it manageable.

---

## Summary

This architecture extends the existing codebase with minimal new infrastructure:
- No new runtime dependencies (no Redis, no job queues, no WebSocket server)
- Reuses all 12 existing tools without modification
- Reuses the SSE streaming pattern from the chat route
- Reuses the Supabase + RLS pattern from existing tables
- Reuses `react-markdown` for report rendering
- Reuses `withRetry` for error handling

The biggest value add -- a DIYer describing "I want to build a deck" and getting
a comprehensive, code-compliant, priced project plan in 3 minutes -- is achievable
in the Phase 1 MVP with roughly 10-15 new files and one database migration.
