# Expert Marketplace: Product Architecture Document

## The Core Thesis

Every marketplace platform out there -- Thumbtack, Angi, TaskRabbit -- starts from a cold lead. The homeowner says "I need help with my bathroom" and then every contractor has to spend 30 minutes on the phone just figuring out what the person actually wants. Half the time the homeowner cannot even articulate the scope because they do not know what they do not know.

We are building from a fundamentally different position. By the time a DIYer on our platform reaches out to an expert, the AI has already:

1. Scoped the entire project (steps, dependencies, critical path)
2. Identified the applicable building codes and permit requirements
3. Generated a materials list with pricing
4. Flagged safety concerns and "call a pro" triggers
5. Assessed the skill level required for each step

**The AI-generated report IS the RFP.** This is the single biggest differentiator. An expert on our platform does not have to figure out what the homeowner wants -- they get a structured, code-aware project plan and only need to validate it, adjust it, or take it over. That changes the economics of every interaction: Q&A takes 2 minutes instead of 15, consultations are productive from minute one, and bids can be submitted with real confidence because the scope is already defined.

---

## System Architecture Overview

```
+------------------------------------------------------------------+
|                        DIYer Journey                              |
|                                                                   |
|  [Chat/Guided Bot] -> [Agent Pipeline] -> [Project Report]       |
|       |                                         |                 |
|       v                                         v                 |
|  Quick Question              +-----------+  "Get Expert Help"     |
|  (no report needed)          |  Report   |  CTA on report view    |
|       |                      |  Context  |       |                |
|       v                      +-----------+       v                |
|  +----------+                    |          +---------+           |
|  | Tier 1:  |                    +--------->| Tier 2: |           |
|  | Q&A      |                    |          | Consult |           |
|  +----------+                    |          +---------+           |
|                                  v                                |
|                            +---------+                            |
|                            | Tier 3: |                            |
|                            | Bidding |                            |
|                            +---------+                            |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                      Expert Portal                                |
|                                                                   |
|  [Registration] -> [Profile/Verification] -> [Availability]      |
|       |                    |                       |              |
|       v                    v                       v              |
|  [Q&A Queue]     [Consultation Calendar]    [Bid Dashboard]      |
|  (text-based)    (video/call booking)       (RFP review + bid)   |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                    Platform Services                              |
|                                                                   |
|  [Stripe Connect]  [Messaging]  [Reviews]  [Dispute Resolution]  |
+------------------------------------------------------------------+
```

---

## Part 0: Competitive Landscape & Strategy

**Give away the AI planning tool for free to become the trusted, honest advisor that Angi and Thumbtack structurally cannot be, then monetize the moment a DIYer genuinely needs human expertise -- with the richest project context any contractor has ever received.**

### 0.1 Angi's Structural Misalignment

Angi sells leads at $15-85 each to 3-4 contractors per request. Their entire revenue model depends on pushing homeowners toward hiring a pro. This creates a fundamental conflict: their AI can never honestly tell a homeowner "you don't need a contractor for this" because doing so would cannibalize lead revenue. Every interaction starts from zero scope -- the homeowner says "I need electrical work" and multiple contractors spend unpaid hours trying to figure out what that actually means.

### 0.2 Thumbtack's Structural Misalignment

Thumbtack is closer to a bidding model, but contractors pay $10-50 per quote sent regardless of whether they win the job. Matching is based on vague project descriptions ("I need some electrical work") with no structured scope, no code analysis, and no material breakdown. Contractors waste significant time scoping leads that go nowhere, and they bake that wasted effort into their pricing -- which means homeowners pay more.

### 0.3 Our Four Moats

These are advantages that neither incumbent can replicate without destroying their existing business model:

1. **The honest advisor position.** Our AI is free with no incentive to upsell to a pro. When the AI says "you can handle this yourself," it means it. When it says "hire a pro," it means that too. Users learn to trust the platform because it tells the truth. Angi and Thumbtack cannot do this -- honesty would kill their revenue.

2. **The data flywheel.** AI reports plus expert corrections compound into a knowledge graph of project requirements by jurisdiction. Every Q&A answer, consultation note, and bid review that corrects or validates the AI makes the next report better. This data asset grows with every interaction and cannot be replicated by launching a competing product.

3. **Seamless context handoff.** Context carries from AI chat to Q&A to consultation to RFP to bid. The contractor reviewing a bid has the full project history, code analysis, materials list, and any expert feedback from earlier tiers. On incumbents, every interaction starts from zero.

4. **The DIYer skill graph.** Over time we track what users have built, what tools they own, what they have struggled with, and what they have mastered. This lets us personalize project plans and accurately assess whether a specific user can handle a specific task. No incumbent has this data because they only see users at the moment of hiring.

### 0.4 Pricing Comparison (Contractor Perspective, $5,000 Job)

| Scenario | Our Platform | Angi | Thumbtack |
|----------|-------------|------|-----------|
| Cost to browse/review | $0 | N/A (leads pushed) | $0 |
| Cost to bid/quote | $0 | N/A | $20-50 per quote |
| Cost if you lose | $0 | $160-340 in wasted leads | $60-150 in wasted quotes |
| Cost if you win | $500 (10%) | $40-85 (one lead) | $20-50 (one quote) |
| Scope clarity | Full AI report with codes, materials, steps | "I need electrical work" | "I need electrical work" |
| Time to estimate | 15-20 min (review AI scope) | 1.5-3 hrs (site visit) | 1.5-3 hrs (site visit) |

The key insight: incumbents front-load costs onto contractors (pay to play), which means contractors either eat the loss on jobs they do not win or inflate pricing to cover it. We back-load costs (pay when you win), which means contractors can bid more competitively and homeowners get better prices. The platform fee is higher per transaction, but the total cost of doing business is lower because there is zero waste.

---

## Part 1: Expert Portal

### 1.1 Registration Flow

Experts go through a tiered onboarding that unlocks capabilities progressively. This solves the cold-start problem -- we do not need fully verified contractors on day one. We need knowledgeable people who can answer questions.

**Registration Tiers:**

| Level | Name | Requirements | Unlocks |
|-------|------|-------------|---------|
| 1 | Community Expert | Email + profile + 1 specialty claimed | Q&A queue (free answers to build reputation) |
| 2 | Verified Expert | Photo ID + license/cert upload (manual review) | Paid Q&A, Paid Consultations |
| 3 | Licensed Contractor | Verified license + insurance docs + background check | Project Bidding, "Licensed" badge |

**Why this matters:** Level 1 lets us seed the supply side without friction. A retired electrician who just wants to help people can start answering questions immediately. A licensed GC who wants to pick up remodel jobs needs to go through the full verification. This is how you solve the chicken-and-egg problem -- start with a community of helpers, graduate them into paid experts, and let the best ones become full contractors on the platform.

**Profile Fields:**

```
Expert Profile
- Display name
- Location (city, state, zip) -- for matching to local DIYers
- Service radius (miles)
- Bio / about (500 chars)
- Profile photo
- Specialties (multi-select from: electrical, plumbing, HVAC, carpentry,
  flooring, roofing, concrete, drywall, painting, tile, landscaping,
  general contracting, other)
- Years of experience (per specialty)
- Licenses (type, number, state, expiration -- verified at Level 2+)
- Insurance (type, carrier, policy number -- verified at Level 3)
- Hourly rate (for consultations)
- Q&A rate (per question or flat monthly)
- Availability schedule (per-day blocks)
- Portfolio photos (up to 20)
- Response time commitment ("usually responds within X hours")
```

### 1.2 Expert Dashboard

The expert dashboard is their command center. It shows:

- **Earnings summary** (today, this week, this month, lifetime)
- **Active Q&A queue** -- incoming questions matched to their specialties
- **Upcoming consultations** -- calendar view of booked calls
- **Open RFPs** -- projects in their area/specialty open for bidding
- **Reviews & ratings** -- their aggregate score and recent reviews
- **Profile completeness** -- nudges to add portfolio, verify license, etc.

### 1.3 Availability System

Experts set weekly recurring availability plus one-off overrides. This feeds into the booking system for Tier 2 consultations.

```
Weekly Template:
  Monday:    9am-12pm, 5pm-8pm
  Tuesday:   (unavailable)
  Wednesday: 6pm-9pm
  ...

Overrides:
  Feb 28: unavailable (vacation)
  Mar 5: 8am-6pm (special availability)
```

The system needs to handle timezone correctly (store everything UTC, display in expert's local time and DIYer's local time).

---

## Part 2: Tier 1 -- Q&A / Quick Help

### 2.1 The Concept

This is the lowest-friction entry point for both sides. A DIYer has a specific question -- "Is this crack in my foundation something I should worry about?", "Can I run 14-gauge wire on a 20-amp circuit?", "What's the right type of mortar for my shower floor?" -- and they want a real human expert to weigh in.

**Why not just let the AI handle it?** Two reasons. First, some questions need eyes on a specific situation (photos, specific conditions). The AI can give general guidance but an expert looking at a photo of a foundation crack can give a judgment call. Second, there is a trust factor. Some people want a human to confirm what the AI said before they commit to action, especially for safety-critical work.

### 2.2 DIYer Flow

1. DIYer is in the chat or viewing a report
2. They see a "Get Expert Opinion" button (contextually placed -- especially near safety warnings, "pro required" flags, and code compliance sections)
3. They tap it, and the system pre-fills context:
   - The current conversation excerpt or report section
   - The project type and location
   - Any photos they have shared
4. DIYer writes their specific question (required, 20-500 chars)
5. Optionally attaches 1-3 photos
6. Sees the price ($5-15 per question, set by expert or platform default)
7. Confirms payment -> question enters the queue

### 2.3 Expert Flow

1. Expert sees new questions in their Q&A queue, filtered by specialty and location
2. Each question card shows:
   - DIYer's question text
   - Attached photos (thumbnails)
   - **AI-generated context block** (the key differentiator -- project type, relevant codes, what the AI already told them)
   - Payout amount
   - Time since posted
3. Expert claims the question (locks it to them for 2 hours)
4. Expert writes their response (text, 50-2000 chars)
5. Optionally marks "This needs a professional" with a reason
6. Submits -> DIYer gets notified -> payout released after 24hr hold or DIYer acceptance

### 2.4 Pricing Model

- **First question free for new users** -- this is the customer acquisition hook. The user experiences the value of getting a real expert opinion with full AI context, and then pays for subsequent questions. Conversion from free to paid is the key metric here.
- **Platform sets suggested pricing** by category:
  - General questions: $5
  - Code-specific questions: $8
  - "Look at this photo" assessments: $10
  - Urgent (< 1hr response): $15
- **Platform fee**: 20% of question price
- **Experts can set custom pricing** once they reach Level 2
- **Batch-answering mode for experts**: Show the full queue so experts can cherry-pick fast questions during downtime. An electrician sitting in the truck between jobs can knock out three quick code questions in 10 minutes at $8 each. The UI should support scanning multiple questions at a glance with one-tap claim, not just a sequential feed.

### 2.5 Integration with Existing System

This tier connects to the existing chat and report flows. The key integration points are:

- The `project_reports.sections` data (especially `codes`, `safety`, `plan` sections) provides context that gets attached to the Q&A question automatically
- The `agent_phases.output_data` from the `plan` phase gives structured data (building codes, safety warnings, pro-required flags) that we surface to the expert
- The existing share system (`share_token`) can be reused -- when a DIYer asks a Q&A question, we generate a share link for the expert to see the full report if needed

---

## Part 3: Tier 2 -- Video/Call Consultations

### 3.1 The Concept

The DIYer needs more than a text answer -- they need someone to look at their situation live, walk them through a specific step, or review their work before they move on. Think: "I'm about to connect this electrical sub-panel, can you watch me do it on video and make sure I'm doing it right?" or "I framed this wall and I want someone to verify it before I close it up with drywall."

### 3.2 DIYer Flow

1. DIYer navigates to "Book a Consultation" (from report view, expert profile, or Q&A follow-up)
2. System shows experts matched by:
   - Specialty matching the project type
   - Location proximity (for code familiarity)
   - Availability
   - Rating/reviews
   - Price
3. DIYer selects an expert and sees their calendar
4. Books a 15, 30, or 60-minute slot
5. Pays upfront (held in escrow)
6. Gets a confirmation with:
   - Pre-call checklist ("Have your report open", "Be near the work area", "Good lighting for video")
   - Link to the video call room
   - The AI-generated report is automatically shared with the expert

### 3.3 Expert Flow

1. Expert gets booking notification
2. Before the call, they see:
   - **Full AI-generated report** for the project
   - DIYer's specific questions/concerns
   - Any photos the DIYer has shared
   - DIYer's experience level and inventory
3. At call time, both join a video room
4. During the call, expert can:
   - View the report side-by-side
   - Take screenshots from the DIYer's video
   - Add annotations/notes to specific steps in the report
   - Mark steps as "verified" or "needs changes"
5. After the call, expert submits:
   - Call summary notes (visible to DIYer)
   - Any modifications to the project plan
   - "Recommended next steps"
   - Optional: "This project needs professional help" with scope description
6. Payout released after 24hr hold

### 3.4 Pricing Model

- **Experts set their own hourly rate** (platform shows suggested range based on specialty and market)
- **Suggested ranges**:
  - General: $30-60/hr
  - Electrical/Plumbing/HVAC: $50-100/hr
  - Structural/Engineering review: $75-150/hr
- **Platform fee**: 15% of consultation price
- **Minimum booking**: 15 minutes
- **Cancellation policy**: Free cancel 4+ hours before, 50% charge within 4 hours, full charge for no-show

### 3.5 Video Infrastructure (Build vs. Buy)

**Recommendation: Buy.** Video calling is not our core competency. Use a provider:

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| Daily.co | ~$0.004/min | Simple API, React SDK, recording built-in | Less customizable |
| LiveKit (self-hosted) | Server costs only | Full control, OSS | Ops burden |
| Twilio Video | ~$0.004/min | Enterprise-grade, huge docs | Complex SDK |

**MVP recommendation**: Daily.co. Their React SDK drops in cleanly, they handle recording, and their pricing is negligible at early scale. We can switch later if needed.

### 3.6 Integration with Existing System

- When a consultation is booked, the system creates a read-only share of the report using the existing `share_token` mechanism, but scoped to the specific expert
- Expert annotations during the call become new entries in a `consultation_notes` table linked to the report
- If the expert modifies the project plan, we store a `report_revision` that the DIYer can accept or reject
- Post-consultation, the system can trigger a re-run of the cost estimation if materials/steps changed

---

## Part 4: Tier 3 -- Project Bidding (Report-as-RFP)

### 4.1 The Concept

This is where the platform's AI-generated reports become transformative. The DIYer has a complete, structured project plan and says "I don't want to do this myself -- or I want to do some of it and hire out the rest." They publish their report as an RFP, and verified contractors can review it and submit bids.

**What makes this different from Thumbtack/Angi:**
- The scope is already defined. No "tell me about your project" back-and-forth.
- Materials are already listed with quantities and pricing. Contractors bid on labor (or labor + materials with their supplier pricing).
- Building codes and permit requirements are already identified. Contractors can price permit pulling into their bid.
- Steps are broken out with skill levels. The DIYer can say "I'll do steps 1-3 myself, I want bids on steps 4-8."
- The report provides an AI-estimated cost, so both parties have a baseline expectation.

### 4.2 DIYer Flow -- Publishing an RFP

1. From the report view, DIYer clicks "Get Bids from Contractors"
2. System shows a configuration screen:
   - **Full project or partial?** DIYer can select which steps they want bids on (checkboxes next to each step)
   - **Materials**: "I'll buy materials" vs. "Contractor provides materials" vs. "Discuss"
   - **Timeline preference**: "ASAP", "Within 2 weeks", "Within a month", "Flexible"
   - **Additional notes**: Free text for anything the AI did not capture
   - **Budget range**: Pre-filled from AI estimate, DIYer can adjust
   - **Photos**: Upload site photos (up to 10)
3. DIYer confirms -> RFP goes live
4. System notifies matched contractors (by specialty + location + availability)
5. **Site visit requests**: Contractors can request a paid site walkthrough before committing to a bid. No contractor bids $8K+ on photos and an AI report alone -- they need to see the actual conditions. Site visits can be handled as a consultation-tier video call (DIYer walks the space on camera) or as an in-person visit (contractor comes to the site, flat fee paid by the homeowner). The system tracks which contractors have completed site visits and surfaces this in the bid comparison view.
6. RFP stays open for 7 days (configurable) or until DIYer selects a bid

### 4.3 Expert/Contractor Flow -- Reviewing and Bidding

1. Contractor sees new RFPs in their bid dashboard
2. Each RFP card shows:
   - Project title and type
   - Location (city only, full address after bid acceptance)
   - AI cost estimate (so they know the range)
   - Number of steps / scope summary
   - DIYer's timeline preference
   - Number of bids already submitted
3. Contractor opens full RFP:
   - Complete AI-generated report (all sections)
   - Which steps DIYer wants done (highlighted)
   - Materials list (if contractor is providing)
   - Site photos
   - DIYer's notes
4. Contractor submits a bid:
   - **Total price** (or per-phase pricing if partial)
   - **Estimated timeline** (start date, duration)
   - **Scope notes**: What is included, what is not, any modifications they would make to the plan
   - **Materials handling**: "I'll use the listed materials", "I prefer different materials (explain)", "Price includes materials"
   - **Inspection/remediation of owner-completed work** (line item): For partial DIY projects where the homeowner did some steps themselves, contractors need to price in the time to inspect that work and remediate any issues before building on top of it. This is a separate line item so the homeowner understands why they are paying for it.
   - **Explicit scope exclusions**: What is NOT included in the bid. This is mandatory -- contractors must specify what falls outside their scope (e.g., drywall repair, painting, cleanup, disposal, permit fees). This prevents the single biggest source of contractor-homeowner disputes.
   - **License/insurance confirmation** (auto-populated from profile)
   - **Permit handling**: "I'll pull permits", "Homeowner pulls permits", "Not required"
5. Bid submitted -> DIYer notified

### 4.4 Bid Selection Flow

1. DIYer reviews all bids side-by-side
2. Each bid shows: price, timeline, contractor rating, reviews, license info
3. **AI-powered bid analysis** flags outliers and potential issues: "Contractor A's bid is 15% below the AI estimate -- here's what they may be leaving out." The AI compares each bid against the report's scope, materials list, and cost estimates to surface red flags (suspiciously low bids that likely omit scope, unusually high bids that may be padding, missing scope items relative to the report). This helps DIYers make informed decisions without needing contractor-level knowledge.
4. DIYer can message contractors to ask clarifying questions (in-platform messaging)
5. DIYer selects a bid -> both parties confirm
5. System generates a simple project agreement (not a legal contract, but a scope/price confirmation)
6. Deposit collected from DIYer (25% of bid price, held in escrow)
7. Remaining payments per milestone (defined by project phases)

### 4.5 Pricing Model

- **Listing fee for DIYer**: Free (we want to maximize RFP volume)
- **Platform fee on winning bid** (tiered, charged to contractor):
  - 10% on the first $10,000
  - 7% on $10,000-$25,000
  - 5% on amounts above $25,000
  - Example: a $30,000 bid pays $1,000 + $1,050 + $250 = $2,300 (7.7% effective rate)
- **Repeat customer rate**: 5% flat when a homeowner re-hires a contractor they previously used through the platform. This rewards relationship-building and keeps repeat business on-platform rather than driving it off-platform to avoid fees.
- **Featured listing**: $25 (puts the RFP at top of contractor queue) -- future upsell
- **Payment processing**: Stripe Connect handles escrow and milestone disbursements
- **Contractors pay nothing until they win.** No lead fees, no quote fees. They can browse RFPs, review full AI reports, request site visits, and submit bids at zero cost. The platform only makes money when the contractor makes money. This is the structural advantage over Angi and Thumbtack.

### 4.6 Integration with Existing System

The `ProjectReportRecord` is the core data structure that becomes the RFP:

```typescript
// Existing type -- already has everything we need
interface ProjectReportRecord {
  id: string;
  run_id: string;          // Links to the agent pipeline that generated it
  user_id: string;
  project_id: string | null;
  title: string;
  sections: ReportSection[];  // Full structured content
  summary: string | null;
  total_cost: number | null;  // AI-estimated cost becomes baseline
  share_token: string | null; // Reuse for contractor access
  share_enabled: boolean;
  created_at: string;
}
```

We extend this with a `project_rfps` table that references the report and adds bidding-specific fields. The report itself is NOT modified -- the RFP wraps it.

### 4.6.5 Change Order Workflow

Every project has change orders. A contractor opens a wall and finds knob-and-tube wiring. A homeowner decides they want a different tile layout mid-project. The scope changes, the cost changes, and without a structured process for handling this, milestone payments generate constant disputes.

**Change order flow:**

1. **Contractor documents the issue** -- photos of the unexpected condition or description of the requested change
2. **Contractor proposes adjusted scope and cost** -- what additional work is needed, how much it costs, and how it affects the timeline
3. **Homeowner reviews and approves or disputes** -- they see the photos, the cost breakdown, and can ask questions via in-platform messaging
4. **If approved**: a new milestone is created and added to the payment schedule. The original project agreement is annotated (not replaced) with the change order.
5. **If disputed**: the change order enters a dispute resolution flow. The AI can provide a reference estimate for the additional work to help both parties evaluate the cost.

**Why this matters:** Without structured change orders, contractors either eat unexpected costs (and resent it) or spring surprise charges on homeowners (who resent it). A documented, auditable change order process protects both parties and keeps the project on track.

---

## Part 5: Database Schema

### 5.1 New Tables

These tables extend the existing Supabase schema. All existing tables (`projects`, `project_reports`, `agent_runs`, `agent_phases`, `shopping_list_items`, `conversations`) remain unchanged.

```sql
-- ============================================================================
-- EXPERT PROFILES
-- ============================================================================

create table expert_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  profile_photo_url text,

  -- Location
  city text not null,
  state text not null,
  zip_code text,
  service_radius_miles int default 50,
  latitude double precision,
  longitude double precision,

  -- Verification level
  verification_level int not null default 1,  -- 1=community, 2=verified, 3=licensed
  verification_status text not null default 'pending',  -- pending, under_review, verified, rejected

  -- Pricing
  hourly_rate_cents int,  -- for consultations, in cents
  qa_rate_cents int,      -- per question, in cents

  -- Performance
  avg_rating numeric(3,2) default 0,
  total_reviews int default 0,
  total_earnings_cents bigint default 0,
  response_time_hours numeric(4,1),  -- average response time

  -- Stripe
  stripe_connect_account_id text,
  stripe_onboarding_complete boolean default false,

  -- Status
  is_active boolean default true,
  is_available boolean default true,  -- manual toggle

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id)
);

-- ============================================================================
-- EXPERT SPECIALTIES
-- ============================================================================

create table expert_specialties (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  specialty text not null,  -- electrical, plumbing, hvac, etc.
  years_experience int,
  is_primary boolean default false,

  unique(expert_id, specialty)
);

-- ============================================================================
-- EXPERT LICENSES
-- ============================================================================

create table expert_licenses (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  license_type text not null,     -- electrical, plumbing, gc, etc.
  license_number text not null,
  issuing_state text not null,
  expiration_date date,
  verification_status text default 'pending',  -- pending, verified, rejected, expired
  document_url text,  -- uploaded scan (stored in Supabase Storage)
  verified_at timestamptz,

  created_at timestamptz default now()
);

-- ============================================================================
-- EXPERT INSURANCE
-- ============================================================================

create table expert_insurance (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  insurance_type text not null,   -- general_liability, workers_comp, etc.
  carrier text,
  policy_number text,
  expiration_date date,
  coverage_amount_cents bigint,
  document_url text,
  verification_status text default 'pending',

  created_at timestamptz default now()
);

-- ============================================================================
-- EXPERT AVAILABILITY
-- ============================================================================

create table expert_availability (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  day_of_week int not null,  -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/New_York',
  is_recurring boolean default true,
  specific_date date,  -- for one-off overrides
  is_available boolean default true,  -- false = blocked out

  created_at timestamptz default now()
);

-- ============================================================================
-- EXPERT PORTFOLIO
-- ============================================================================

create table expert_portfolio (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  project_type text,  -- matches specialty categories
  display_order int default 0,

  created_at timestamptz default now()
);

-- ============================================================================
-- TIER 1: Q&A QUESTIONS
-- ============================================================================

create table qa_questions (
  id uuid primary key default gen_random_uuid(),

  -- Parties
  diyer_user_id uuid not null references auth.users(id),
  expert_id uuid references expert_profiles(id),  -- null until claimed

  -- Context (from existing system)
  report_id uuid references project_reports(id),
  project_id uuid references projects(id),
  conversation_id uuid,  -- reference to chat conversation

  -- Question content
  question_text text not null,
  category text not null,  -- matches specialty categories
  ai_context jsonb,  -- snapshot of relevant AI output (codes, safety warnings, etc.)

  -- Photos
  photo_urls text[] default '{}',

  -- Pricing
  price_cents int not null,
  platform_fee_cents int not null,
  expert_payout_cents int not null,

  -- Status
  status text not null default 'open',
  -- open -> claimed -> answered -> accepted -> disputed -> resolved
  claimed_at timestamptz,
  claim_expires_at timestamptz,  -- 2hr window
  answered_at timestamptz,

  -- Response
  answer_text text,
  answer_photos text[] default '{}',
  recommends_professional boolean default false,
  pro_recommendation_reason text,

  -- Payment
  payment_intent_id text,  -- Stripe payment intent
  payout_status text default 'pending',  -- pending, released, refunded
  payout_released_at timestamptz,

  -- Location context
  diyer_city text,
  diyer_state text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- TIER 2: CONSULTATIONS
-- ============================================================================

create table consultations (
  id uuid primary key default gen_random_uuid(),

  -- Parties
  diyer_user_id uuid not null references auth.users(id),
  expert_id uuid not null references expert_profiles(id),

  -- Context
  report_id uuid references project_reports(id),
  project_id uuid references projects(id),
  qa_question_id uuid references qa_questions(id),  -- if escalated from Q&A

  -- Scheduling
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  duration_minutes int not null,  -- 15, 30, or 60
  timezone text not null,

  -- Video
  video_room_id text,     -- from Daily.co / provider
  video_room_url text,
  recording_url text,     -- post-call recording (if both consent)

  -- Pre-call
  diyer_notes text,       -- what they want to discuss
  diyer_photos text[] default '{}',

  -- Post-call
  expert_summary text,
  expert_notes jsonb,     -- structured notes per report step
  plan_modifications jsonb,  -- suggested changes to the project plan
  recommends_professional boolean default false,
  pro_recommendation_scope text,

  -- Pricing
  price_cents int not null,
  platform_fee_cents int not null,
  expert_payout_cents int not null,

  -- Status
  status text not null default 'pending',
  -- pending -> confirmed -> in_progress -> completed -> cancelled
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by text,  -- 'diyer' or 'expert'

  -- Payment
  payment_intent_id text,
  payout_status text default 'pending',
  payout_released_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- TIER 3: PROJECT RFPS
-- ============================================================================

create table project_rfps (
  id uuid primary key default gen_random_uuid(),

  -- Owner
  diyer_user_id uuid not null references auth.users(id),

  -- Source (links to existing report system)
  report_id uuid not null references project_reports(id),
  project_id uuid references projects(id),

  -- Scope configuration
  title text not null,
  description text,                -- additional notes beyond the report
  selected_steps int[] default '{}',  -- which step orders the DIYer wants done (empty = all)
  materials_handling text not null default 'discuss',
  -- 'diyer_provides', 'contractor_provides', 'discuss'

  -- Preferences
  timeline_preference text default 'flexible',
  -- 'asap', 'within_2_weeks', 'within_month', 'flexible'
  budget_min_cents int,
  budget_max_cents int,

  -- Location (copied from report/user for matching)
  city text not null,
  state text not null,
  zip_code text,

  -- Photos
  site_photos text[] default '{}',

  -- Status
  status text not null default 'open',
  -- open -> reviewing -> awarded -> in_progress -> completed -> cancelled -> expired
  expires_at timestamptz not null,  -- default: created_at + 7 days
  awarded_bid_id uuid,  -- set when DIYer selects a bid

  -- Visibility
  is_featured boolean default false,

  -- Stats
  view_count int default 0,
  bid_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- TIER 3: BIDS
-- ============================================================================

create table project_bids (
  id uuid primary key default gen_random_uuid(),

  rfp_id uuid not null references project_rfps(id) on delete cascade,
  expert_id uuid not null references expert_profiles(id),

  -- Bid details
  total_price_cents int not null,
  per_phase_pricing jsonb,  -- optional breakdown by step: { "step_1": 5000, "step_2": 8000 }

  -- Timeline
  estimated_start_date date,
  estimated_duration_days int,

  -- Scope
  scope_notes text,              -- what is / is not included
  materials_approach text,        -- how they will handle materials
  plan_modifications text,        -- any changes they would make to the AI plan
  permit_handling text,           -- 'contractor_pulls', 'homeowner_pulls', 'not_required'

  -- Credentials (auto-populated from profile, snapshot at bid time)
  license_info jsonb,
  insurance_info jsonb,

  -- Status
  status text not null default 'submitted',
  -- submitted -> shortlisted -> accepted -> rejected -> withdrawn

  -- Communication
  message_to_diyer text,  -- cover letter

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(rfp_id, expert_id)  -- one bid per expert per RFP
);

-- ============================================================================
-- REVIEWS (unified for all tiers)
-- ============================================================================

create table expert_reviews (
  id uuid primary key default gen_random_uuid(),

  expert_id uuid not null references expert_profiles(id),
  reviewer_user_id uuid not null references auth.users(id),

  -- What is being reviewed
  review_type text not null,  -- 'qa', 'consultation', 'project'
  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),

  -- Review content
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,

  -- Expert response
  expert_response text,
  expert_responded_at timestamptz,

  -- Moderation
  is_visible boolean default true,
  flagged boolean default false,

  created_at timestamptz default now()
);

-- ============================================================================
-- IN-PLATFORM MESSAGING
-- ============================================================================

create table marketplace_messages (
  id uuid primary key default gen_random_uuid(),

  -- Thread context (one of these will be set)
  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),
  bid_id uuid references project_bids(id),

  sender_user_id uuid not null references auth.users(id),
  recipient_user_id uuid not null references auth.users(id),

  content text not null,
  attachments text[] default '{}',

  is_read boolean default false,
  read_at timestamptz,

  created_at timestamptz default now()
);

-- ============================================================================
-- PAYMENT TRANSACTIONS (audit log for all money movement)
-- ============================================================================

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),

  -- Context
  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),
  bid_id uuid references project_bids(id),

  payer_user_id uuid not null references auth.users(id),
  payee_user_id uuid references auth.users(id),  -- null for platform fees

  -- Amounts
  amount_cents int not null,
  platform_fee_cents int not null default 0,
  net_amount_cents int not null,  -- amount - platform_fee

  -- Stripe
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_refund_id text,

  -- Status
  status text not null default 'pending',
  -- pending, succeeded, failed, refunded, partially_refunded

  transaction_type text not null,
  -- 'qa_payment', 'consultation_payment', 'project_deposit',
  -- 'project_milestone', 'project_final', 'refund', 'dispute_resolution'

  created_at timestamptz default now()
);

-- ============================================================================
-- CHANGE ORDERS
-- ============================================================================

create table change_orders (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid not null references project_bids(id),
  expert_id uuid not null references expert_profiles(id),

  -- What changed
  description text not null,
  reason text not null,
  photo_urls text[] default '{}',

  -- Financial impact
  additional_cost_cents int not null default 0,
  revised_timeline_days int,

  -- Status
  status text not null default 'proposed',
  -- proposed -> approved -> rejected -> disputed
  approved_at timestamptz,
  rejected_reason text,

  created_at timestamptz default now()
);

-- ============================================================================
-- PROJECT MILESTONE PHOTOS (documentation per phase)
-- ============================================================================

create table milestone_photos (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid references project_bids(id),
  expert_id uuid not null references expert_profiles(id),

  phase_label text not null,  -- 'before', 'during', 'after', or step reference
  photo_url text not null,
  caption text,
  step_order int,  -- links to specific step in the report

  created_at timestamptz default now()
);

-- ============================================================================
-- WARRANTIES
-- ============================================================================

create table project_warranties (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid not null references project_bids(id),
  expert_id uuid not null references expert_profiles(id),
  homeowner_user_id uuid not null references auth.users(id),

  warranty_type text not null default 'workmanship',
  duration_months int not null default 12,
  description text,
  starts_at timestamptz not null,
  expires_at timestamptz not null,

  -- Claims
  claim_count int default 0,

  created_at timestamptz default now()
);

-- ============================================================================
-- REPORT CORRECTIONS (expert feedback on AI reports -- data flywheel)
-- ============================================================================

create table report_corrections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references project_reports(id),
  expert_id uuid not null references expert_profiles(id),

  -- What was corrected
  section_type text not null,  -- 'codes', 'materials', 'steps', 'safety', 'cost'
  original_content text,
  corrected_content text not null,
  correction_reason text,

  -- Context
  source_type text not null,  -- 'qa', 'consultation', 'bid_review'
  source_id uuid,  -- references the qa_question, consultation, or bid

  -- Was this correction validated by another expert?
  validated boolean default false,
  validated_by uuid references expert_profiles(id),

  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_expert_profiles_location on expert_profiles(state, city);
create index idx_expert_profiles_verification on expert_profiles(verification_level, is_active);
create index idx_expert_specialties_specialty on expert_specialties(specialty);
create index idx_qa_questions_status on qa_questions(status, category);
create index idx_qa_questions_expert on qa_questions(expert_id, status);
create index idx_consultations_expert on consultations(expert_id, status);
create index idx_consultations_schedule on consultations(scheduled_start);
create index idx_project_rfps_status on project_rfps(status, state, city);
create index idx_project_rfps_expires on project_rfps(expires_at) where status = 'open';
create index idx_project_bids_rfp on project_bids(rfp_id, status);
create index idx_expert_reviews_expert on expert_reviews(expert_id, is_visible);
create index idx_marketplace_messages_thread on marketplace_messages(rfp_id, created_at);
create index idx_payment_transactions_payer on payment_transactions(payer_user_id, created_at);
create index idx_change_orders_rfp on change_orders(rfp_id, status);
create index idx_milestone_photos_rfp on milestone_photos(rfp_id, phase_label);
create index idx_project_warranties_expert on project_warranties(expert_id);
create index idx_project_warranties_homeowner on project_warranties(homeowner_user_id);
create index idx_report_corrections_report on report_corrections(report_id);
create index idx_report_corrections_expert on report_corrections(expert_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table expert_profiles enable row level security;
alter table expert_specialties enable row level security;
alter table expert_licenses enable row level security;
alter table expert_insurance enable row level security;
alter table expert_availability enable row level security;
alter table expert_portfolio enable row level security;
alter table qa_questions enable row level security;
alter table consultations enable row level security;
alter table project_rfps enable row level security;
alter table project_bids enable row level security;
alter table expert_reviews enable row level security;
alter table marketplace_messages enable row level security;
alter table payment_transactions enable row level security;
alter table change_orders enable row level security;
alter table milestone_photos enable row level security;
alter table project_warranties enable row level security;
alter table report_corrections enable row level security;

-- Expert profiles: public read, owner write
create policy "Expert profiles are viewable by everyone"
  on expert_profiles for select using (is_active = true);
create policy "Experts can update own profile"
  on expert_profiles for update using (auth.uid() = user_id);
create policy "Users can create their expert profile"
  on expert_profiles for insert with check (auth.uid() = user_id);

-- Q&A: DIYer sees own questions, experts see open questions in their specialty
create policy "DIYers see own questions"
  on qa_questions for select using (auth.uid() = diyer_user_id);
create policy "Experts see claimable or assigned questions"
  on qa_questions for select using (
    status = 'open' or expert_id in (
      select id from expert_profiles where user_id = auth.uid()
    )
  );

-- Messages: participants only
create policy "Users see own messages"
  on marketplace_messages for select using (
    auth.uid() = sender_user_id or auth.uid() = recipient_user_id
  );
create policy "Users can send messages"
  on marketplace_messages for insert with check (auth.uid() = sender_user_id);

-- RFPs: public read when open, owner full access
create policy "Open RFPs are viewable by authenticated users"
  on project_rfps for select using (
    status = 'open' or auth.uid() = diyer_user_id
  );
create policy "DIYers manage own RFPs"
  on project_rfps for all using (auth.uid() = diyer_user_id);

-- Bids: expert sees own bids, RFP owner sees all bids on their RFP
create policy "Experts see own bids"
  on project_bids for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "RFP owners see bids on their RFPs"
  on project_bids for select using (
    rfp_id in (select id from project_rfps where diyer_user_id = auth.uid())
  );
```

### 5.2 Entity Relationship Summary

```
auth.users (existing)
  |
  |-- 1:1 --> expert_profiles
  |             |-- 1:N --> expert_specialties
  |             |-- 1:N --> expert_licenses
  |             |-- 1:N --> expert_insurance
  |             |-- 1:N --> expert_availability
  |             |-- 1:N --> expert_portfolio
  |             |-- 1:N --> expert_reviews (as reviewee)
  |             |-- 1:N --> qa_questions (as answerer)
  |             |-- 1:N --> consultations (as expert)
  |             |-- 1:N --> project_bids
  |             |-- 1:N --> change_orders (as contractor)
  |             |-- 1:N --> milestone_photos (as documenter)
  |             |-- 1:N --> project_warranties (as warrantor)
  |             |-- 1:N --> report_corrections (as corrector)
  |
  |-- 1:N --> projects (existing)
  |             |-- 1:N --> project_reports (existing)
  |                           |-- 1:N --> project_rfps
  |                           |             |-- 1:N --> project_bids
  |                           |             |-- 1:N --> change_orders
  |                           |             |-- 1:N --> milestone_photos
  |                           |             |-- 1:N --> project_warranties
  |                           |-- 1:N --> report_corrections
  |
  |-- 1:N --> qa_questions (as asker)
  |-- 1:N --> consultations (as diyer)
  |-- 1:N --> marketplace_messages (as sender/recipient)
  |-- 1:N --> payment_transactions (as payer/payee)
  |-- 1:N --> expert_reviews (as reviewer)
  |-- 1:N --> project_warranties (as homeowner)
```

---

## Part 6: Payments Architecture

### 6.1 Stripe Connect

We use **Stripe Connect** in "Express" mode. This is the right choice because:

- We need to collect money from DIYers and disburse to experts
- Stripe handles the expert's tax reporting (1099s) and identity verification
- Express accounts give us enough control while letting Stripe handle KYC/compliance
- Supports delayed payouts (our 24hr hold for Q&A, escrow for projects)

**Flow:**
1. Expert signs up -> we create a Stripe Connect Express account
2. Expert completes Stripe onboarding (identity, bank account)
3. DIYer pays -> Stripe charges their card, holds funds
4. Service delivered -> we trigger a transfer to the expert's Connect account
5. Platform fee is deducted automatically via `application_fee_amount`

### 6.2 Payment Flows by Tier

**Tier 1 (Q&A):**
```
DIYer submits question
  -> Stripe PaymentIntent created (amount = question price)
  -> Charge captured immediately
  -> Expert answers
  -> 24hr hold (or DIYer accepts early)
  -> Transfer to expert's Connect account (minus platform fee)
  -> If no answer within claim window, auto-refund
```

**Tier 2 (Consultation):**
```
DIYer books consultation
  -> Stripe PaymentIntent created (amount = hourly_rate * duration)
  -> Charge captured immediately
  -> Consultation happens
  -> Expert submits summary
  -> 24hr hold
  -> Transfer to expert (minus platform fee)
  -> Cancellation: refund policy applies based on timing
```

**Tier 3 (Project Bidding):**
```
DIYer accepts bid
  -> Stripe PaymentIntent for deposit (25% of bid)
  -> Charge captured
  -> Milestones defined (based on project phases)
  -> At each milestone:
    -> DIYer confirms completion
    -> Stripe PaymentIntent for milestone amount
    -> Transfer to contractor (minus platform fee)
  -> Final payment on project completion
  -> Dispute window: 7 days after final milestone
```

### 6.3 Revenue Model Summary

| Revenue Stream | Source | Rate | Priority |
|---------------|--------|------|----------|
| DIYer Pro subscription | $9.99/mo unlimited reports + chat | Recurring | MVP |
| Q&A platform fee | Per question (first free) | 20% | MVP |
| Consultation platform fee | Per booking | 15% | MVP |
| Project bid platform fee | Per awarded bid | 10%/7%/5% tiered | Phase 2 |
| Repeat customer bid fee | Re-hire same contractor | 5% flat | Phase 2 |
| Featured RFP listing | DIYer upsell | $25 flat | Phase 3 |
| Expert subscription | Monthly pro tier | $49/mo | Phase 3 |
| Affiliate revenue | Material purchases | 3-5% | Supplemental |

### 6.4 Freemium AI Tiers

The AI planning tool is the top of the funnel. Giving it away for free is how we build trust and acquire users at near-zero CAC. The Pro tier converts the most engaged users into recurring revenue.

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0 | 5 agent reports/mo, 30 chat messages/mo, 5 saved projects, code lookup, video search, materials lists |
| Pro | $9.99/mo | Unlimited reports, unlimited chat, unlimited saved projects, PDF export, store price comparison, priority report generation |

**How the caps work:** Agent reports (generated via the guided bot / project planner) and chat messages (freeform AI conversations in `/chat`) are tracked separately. The guided bot prompt does not count against the chat cap -- they are different products with different costs. Reports cost ~$0.12 each; chat messages cost ~$0.018 each.

**Why these numbers:**
- **5 reports/mo:** Enough for 2-3 active projects with revisions. Most users generate 1-2 reports/month.
- **30 chat messages/mo:** Covers 4-5 full conversations (6-8 messages each). Enough for 1-2 projects with solid back-and-forth. About 15-20% of users will hit this cap, creating natural Pro conversion pressure. Can be expanded later based on usage data.
- **5 saved projects:** Costs us nothing (DB rows). Generous enough that it never feels restrictive for a free user.

**Unit economics:**

| MAU | Avg Cost/User | Monthly AI Cost | Max Cost/User | Notes |
|-----|--------------|-----------------|---------------|-------|
| 500 | $0.66 | $330 | $1.14 | Hard ceiling per user is predictable |
| 1,000 | $0.66 | $660 | $1,140 max | |
| 5,000 | $0.66 | $3,300 | $5,700 max | |
| 10,000 | $0.66 | $6,600 | $11,400 max | |
| 50,000 | $0.66 | $33,000 | $57,000 max | |

Average user sends ~24 msgs + 2 reports/mo = $0.67. Max user (30 msgs + 5 reports) = $1.14. At a 3-5% Pro subscription conversion rate, Pro revenue covers AI costs for the entire free user base. The marketplace tiers -- especially project bidding -- provide the real margin. Expected lifetime value per user is approximately $14.50 with a 4.8x LTV/CAC ratio, which supports aggressive growth spending on the free tier.

---

## Part 7: Trust and Safety

### 7.1 Expert Verification Pipeline

```
Level 1 (Community):
  - Email verified (via Supabase Auth, already exists)
  - Profile complete (name, photo, bio, 1+ specialty)
  - Agreement to community guidelines
  -> Automated, instant

Level 2 (Verified):
  - Photo ID uploaded
  - License/certification document uploaded
  - Manual review by platform (initially us, later outsource)
  - Background check (use Checkr API)
  -> 2-5 business day turnaround

Level 3 (Licensed Contractor):
  - All Level 2 requirements
  - Active contractor license verified against state database
  - General liability insurance verified
  - Workers comp (if applicable)
  -> 5-10 business day turnaround
```

### 7.2 Review System

- Reviews are mandatory after paid interactions (gentle nudge, not forced)
- 1-5 star rating with required category ratings:
  - **Knowledge**: Did they know their stuff?
  - **Communication**: Were they clear and responsive?
  - **Value**: Was the price fair for what you got?
- Experts can respond publicly to reviews (one response per review)
- Reviews are never deleted, but flagged reviews go to manual moderation
- Aggregate rating algorithm: weighted recent reviews more heavily (last 90 days = 2x weight)

### 7.3 Safety Mechanisms

- **Mandatory "pro required" escalation**: If the AI flags `proRequired: true` on a report, the Q&A and consultation flows must include a prominent warning. Experts are required to acknowledge this flag.
- **Photo review for sensitive work**: If a Q&A question involves electrical panels, gas lines, or structural elements, the platform queues it for Level 2+ experts only.
- **Consultation recording consent**: Both parties must consent to recording. Recordings are stored for 30 days for dispute resolution, then deleted.
- **Dispute resolution**: Automated first (refund if expert did not deliver), escalated to manual review for complex cases. Simple flow for MVP: DIYer flags issue -> 48hr window for expert to respond -> platform decides.
- **AI uncertainty markers.** The AI should express uncertainty honestly ("your service is likely 100A or 150A -- verify at the panel") rather than asserting facts it cannot verify from photos alone. Overconfidence in AI output leads to bad bids and dangerous work. Reports should clearly distinguish between "verified by code lookup" (the AI found a specific code reference) and "estimated based on typical construction" (the AI is making a reasonable assumption that needs field verification). This distinction is critical for both safety and bid accuracy.
- **Explicit scope exclusions.** Every AI report must include a "Not Included" section listing common items that are outside scope: drywall repair after wire runs, painting, final cleanup, disposal of old materials, permit fees, landscaping restoration, temporary utilities during construction. This prevents disputes between DIYers and contractors about what the bid covers, and it sets realistic expectations about total project cost from the start.

### 7.4 Content Moderation

- All messages and Q&A text go through basic content filters (profanity, PII scrubbing for phone numbers/emails to keep communication on-platform)
- Photos checked for NSFW content (use a simple classifier or Supabase Edge Function)
- Rate limiting on messages to prevent spam

---

## Part 8: Integration Points with Existing System

### 8.1 Report View Enhancement

The existing `ReportView.tsx` component gets a new CTA section. Currently it has "Save to Project" -- we add alongside it:

```
[Save to Project]  [Get Expert Help v]
                        |
                        +-- Ask a Quick Question ($5-15)
                        +-- Book a Consultation ($30-150)
                        +-- Get Contractor Bids (Free)
```

This dropdown is contextually aware:
- If `plan.proRequired === true`, the "Get Expert Help" button is highlighted/pulsing with "Professional Recommended" badge
- If viewing the `safety` or `codes` section, "Ask a Quick Question" is pre-populated with the relevant content
- If viewing the `cost` section, "Get Contractor Bids" pre-fills the budget range from `report.total_cost`

### 8.2 Chat Integration

During the AI chat flow, when the system detects a question it cannot confidently answer (or a safety concern), it can suggest: "This is a great question for a licensed electrician. Would you like to ask an expert? It takes about 2 minutes and costs $8."

This requires a small addition to the system prompt in `/home/justin/AI-Projects/diy-helper-webapp/lib/system-prompt.ts` to include marketplace awareness.

### 8.3 AI Context Packaging

When a DIYer initiates any expert interaction, the system packages relevant AI context automatically. This function works with the existing `AgentContext` and `PlanOutput` types:

```typescript
// lib/marketplace/context-builder.ts

interface ExpertContext {
  projectSummary: string;
  projectType: string;
  location: { city: string; state: string };
  relevantCodes: string;
  safetyWarnings: string[];
  proRequired: boolean;
  proRequiredReason?: string;
  skillLevel: string;
  estimatedCost: number;
  steps: Array<{ order: number; title: string; skillLevel: string }>;
  diverExperienceLevel: string;
  // Only for consultations and bidding:
  fullReportShareUrl?: string;
  materialsCount?: number;
  toolsCount?: number;
}

function buildExpertContext(
  report: ProjectReportRecord,
  planOutput: PlanOutput,
  preferences: { experienceLevel: string }
): ExpertContext {
  // Extract structured data from plan output
  // Package it in a format that's immediately useful to the expert
  // This replaces the "tell me about your project" conversation
}
```

### 8.4 Notification System

We need a notification system that does not exist yet. For MVP, this can be simple:

- **Email notifications** via Supabase Edge Functions + Resend/SendGrid
- **In-app notification badge** (polling or Supabase Realtime subscriptions)
- Events that trigger notifications:
  - Q&A: question posted, question claimed, answer received
  - Consultation: booking confirmed, reminder (1hr before), call starting, summary available
  - Bidding: new bid received, bid accepted, bid rejected, milestone completed

---

## Part 8.5: Data Flywheel & Intelligence

This is the technical moat. The AI planning tool is good enough to get users in the door, but the data we accumulate through expert interactions is what makes the platform impossible to replicate over time. Every Q&A answer, consultation note, bid review, and project completion makes the AI smarter and the platform more valuable.

### 8.5.1 Report Corrections Pipeline

When an expert corrects an AI report -- during Q&A, consultation, or bid review -- the correction is captured in the `report_corrections` table with structured metadata: which section was wrong (codes, materials, steps, safety, cost), what the original content was, what the corrected content is, and why the correction was made.

These corrections feed back into the system in three stages:

1. **Immediate**: Corrections on active projects update the report for that specific DIYer. If an expert says "the AI missed that your jurisdiction requires arc-fault breakers on bedroom circuits," that correction goes into the report right away.
2. **Prompt engineering**: Aggregated corrections are analyzed to identify systematic patterns. If experts in Texas consistently correct the AI's assumption about foundation requirements, we add Texas-specific foundation guidance to the system prompt.
3. **Fine-tuning**: At sufficient volume, correction data becomes training data. The AI learns from expert feedback at scale, reducing the correction rate over time and improving report accuracy.

Each correction can optionally be validated by a second expert, creating a peer-review layer that ensures quality in the feedback loop.

### 8.5.2 Project Intelligence Accumulation

Over thousands of reports, we build a structured database of knowledge that no competitor can replicate:

- **Jurisdiction-specific code knowledge**: Not just the NEC or IRC in general, but which local amendments actually apply in each city and county. The AI might know the NEC requires AFCI protection, but only accumulated expert corrections will teach it that Chicago still requires conduit for all residential wiring.
- **Real market pricing**: From bid data (not AI estimates), we learn what projects actually cost in each market. A bathroom remodel in Austin costs differently than one in Portland. Over time, our AI estimates converge on real market prices rather than national averages.
- **Common struggle points**: From Q&A and consultation patterns, we learn which steps DIYers commonly struggle with. If 40% of tile shower questions are about waterproofing membrane installation, we know to add extra detail and video references to that step.
- **Estimate accuracy tracking**: We compare AI cost estimates against actual bids and completed project costs. This creates a feedback loop that improves estimate accuracy over time, which in turn makes bids more competitive and reduces disputes.

### 8.5.3 DIYer Skill Graph

Track across sessions: projects completed, tools owned (from inventory), experience level demonstrated (from which steps they needed help with), and safety incidents or near-misses reported. Over time, this enables personalized project plans.

Example: "Based on your previous deck build and fence installation, you can likely handle the framing and structural work on this pergola. However, you have not done any electrical work before, so we recommend hiring a licensed electrician for the outlet installation and landscape lighting wiring."

The skill graph also powers smarter Q&A matching (pair a beginner with a patient expert), consultation recommendations (suggest specific steps to review), and bid scoping (automatically mark steps the user has demonstrated competence in as potential DIY steps).

### 8.5.4 AI + Expert Co-creation

During consultations, build a mode where the expert and AI collaborate on the plan in real time. The expert says "add a vapor barrier step before insulation" and the AI regenerates that section with updated materials, costs, and code references. The expert says "this wire gauge is wrong for a 30-amp circuit" and the AI corrects the materials list and updates all downstream cost calculations.

This fusion is something neither Angi nor Thumbtack can build because they have no AI-generated project context to start from. Their experts start from scratch every time. Our experts start from a 90%-complete plan and refine the last 10%, which is where their expertise matters most.

The co-creation session is recorded (with consent) and the structured changes become training data for the corrections pipeline, closing the loop on the data flywheel.

---

## Part 9: Build Sequence (What to Build First)

### Phase 0: Foundation (1-2 weeks)
Build the infrastructure that all three tiers depend on.

1. **Expert profile schema + registration API** (`/api/experts/register`, `/api/experts/profile`)
2. **Expert dashboard page** (`/app/experts/dashboard/page.tsx`)
3. **Stripe Connect integration** (account creation, onboarding redirect)
4. **Notification system** (basic email via Resend + in-app polling)
5. **In-platform messaging** (simple chat between two users, scoped to a context)
6. **"Get Expert Help" CTA** on ReportView (UI only, links to coming-soon for tiers not yet built)

### Phase 1: Q&A -- Ship First (2-3 weeks)
This is the fastest path to a working marketplace. It requires the least infrastructure (no video, no escrow milestones), provides immediate value, and lets us start building the expert supply side.

1. **Q&A question submission flow** (DIYer side)
2. **Q&A queue + claim + answer flow** (Expert side)
3. **AI context packaging** (auto-attach report context to questions)
4. **Simple Stripe payment** (charge on submit, release on answer)
5. **Review system** (post-answer rating)
6. **Expert search/browse page** (`/app/experts/page.tsx`)

**Why Q&A first:**
- Lowest friction for experts (5-minute commitment per question)
- Lowest price point for DIYers (low barrier to try)
- Builds the expert supply side (community experts start answering for free/cheap)
- Creates a review corpus that gives future consultation/bid customers confidence
- Validates demand before investing in video infrastructure

### Phase 1.5: Project Intelligence Flywheel (1-2 weeks, parallel with Phase 2)

This runs in parallel with Phase 2 because it does not block consultation features but is critical infrastructure for the long-term moat. The data flywheel needs to start turning as early as possible.

1. **Instrument every AI report for structured data capture** (code lookups performed, safety flags triggered, cost estimate methodology, confidence levels per section)
2. **Build `report_corrections` table and capture workflow** -- when an expert corrects an AI report during Q&A, the correction is captured with structured metadata
3. **Add correction feedback into AI system prompts** -- aggregate top corrections by project type and jurisdiction, feed them back into prompt engineering
4. **Build basic analytics dashboard**: AI estimate accuracy vs. expert corrections, most-corrected report sections, common DIYer questions by project type, correction rate over time

### Phase 2: Consultations (3-4 weeks)
Once we have experts with reviews and active DIYers, consultations are the natural upsell.

1. **Daily.co integration** (video room creation, join flow)
2. **Availability calendar** (expert sets schedule, DIYer books)
3. **Booking flow** (slot selection, payment, confirmation)
4. **Pre-call context sharing** (auto-share report with expert)
5. **Post-call summary flow** (expert submits notes, plan modifications)
6. **Escalation from Q&A** ("Want to discuss this on a call?" upsell)

### Phase 3: Project Bidding (4-6 weeks)
This is the most complex tier but also the highest revenue per transaction.

1. **RFP creation flow** (from report view, step selection, configuration)
2. **Contractor matching** (specialty + location + availability)
3. **Bid submission + review UI**
4. **Bid comparison view** (side-by-side with AI-powered outlier analysis)
5. **Escrow + milestone payments**
6. **Project agreement generation**
7. **In-progress project tracking** (milestone status, payment schedule)
8. **Change order workflow** (contractor documents issue, proposes adjusted scope/cost, homeowner approves or disputes)
9. **Photo documentation per milestone** (before/during/after photos linked to project phases)
10. **Warranty registration** (workmanship warranty created at project completion, tracked with expiration and claims)
11. **Tiered commission structure** (10%/7%/5% based on bid amount)
12. **Repeat customer pricing** (5% flat for re-hires through the platform)

### Phase 4: Growth Features (ongoing)
- Expert subscription tier ($49/mo for priority placement, analytics, badge)
- Featured RFP listings
- Expert-initiated outreach (experts can reach out to RFPs proactively)
- AI-assisted bid review ("This bid is 30% above the AI estimate for labor in your area")
- Repeat customer features (DIYer favorites an expert, books them again)
- Expert referral program
- Insurance/warranty upsells on projects
- Integration with permit applications (auto-fill permit forms from report data)

---

## Part 10: Solving the Cold-Start Problem

Every marketplace faces the chicken-and-egg problem. Here is the concrete strategy:

### Supply Side (Getting Experts)

1. **Start with Q&A only.** The barrier to entry is answering text questions. Retired tradespeople, trade school instructors, experienced DIYers -- they can all participate at Level 1 with zero credential requirements.

2. **Seed with content creators.** Partner with DIY YouTubers/TikTokers. Offer them a verified expert profile and a way to monetize their audience beyond ad revenue. They bring their own supply of questions.

3. **Cross-post to trade forums.** Reddit's r/electricians, r/plumbing, r/HomeImprovement, etc. are full of people who answer questions for free. Offer them a platform where they get paid.

4. **Free tier for experts initially.** Zero platform fee for the first 3 months. Let experts keep 100% of Q&A earnings to build momentum.

### Demand Side (Getting DIYers)

1. **The AI is the hook.** DIYers come for the free AI planning tool. The marketplace is the upsell when they need human validation. This is already the funnel -- people use the guided bot, generate reports, and then hit a "should I really do this?" moment.

2. **First question free.** Give every new user one free Q&A question. They experience the value, then pay for the next one.

3. **Contextual nudges.** When the AI generates a report with `proRequired: true` or safety warnings, surface the "Ask an Expert" CTA prominently. The user is already in the moment of uncertainty -- that is when they are most likely to pay for reassurance.

4. **Report sharing drives awareness.** The existing share feature (`/share/report/[token]`) already exists. When shared reports include "Verified by [Expert Name]" badges (from consultations), it creates social proof.

---

## Part 11: What Makes This Different

| Platform | How they start | Our advantage |
|----------|---------------|---------------|
| Thumbtack | "Describe your project" -> pay per quote sent | Contractors see full scope before deciding to bid. Zero cost until they win. |
| Angi | Lead gen (sell your info to 3-4 contractors) | DIYer controls who sees their project; no spam. AI scopes before any human involvement. |
| TaskRabbit | Task-based (small jobs only) | Full project lifecycle with codes, permits, materials, steps |
| HomeAdvisor | Lead gen (same as Angi) | DIYer controls the process; honest AI that says "DIY this" when appropriate |
| YouTube comments | Ask and hope someone answers | Paid, verified experts with accountability and full project context |

**The fundamental difference:** On every other platform, the first 30-60 minutes of any interaction is spent figuring out scope. On ours, the AI did that work before the expert ever gets involved. This means:

- Experts are more efficient (higher effective hourly rate)
- DIYers get better answers (experts have full context)
- Bids are more accurate (scope is defined, not guessed)
- Disputes are fewer (everyone agreed on the scope upfront)

**The fundamental question is: what happens when Angi or Thumbtack adds AI?** They ship a version that is 80% as good within 6 months. But their AI will always have a thumb on the scale toward "hire a pro" because that is how they make money. Our AI is structurally honest because we only monetize when a pro is genuinely needed. Users will figure this out. Trust accrues to the platform that tells the truth. The first time Angi's AI recommends a $3,000 contractor visit for something that takes $40 in parts and a YouTube video, the user learns the lesson. Our AI says "you can do this -- here's how" and the user remembers who was honest with them.

---

## Part 12: API Route Structure

New routes to add to the existing Next.js API structure at `/home/justin/AI-Projects/diy-helper-webapp/app/api/`:

```
app/api/
  experts/
    register/route.ts         -- POST: Create expert profile
    profile/route.ts          -- GET/PUT: Own profile
    [id]/route.ts             -- GET: Public profile view
    search/route.ts           -- GET: Search experts by specialty/location
    availability/route.ts     -- GET/PUT: Manage availability
    portfolio/route.ts        -- POST/DELETE: Manage portfolio images
    stripe-onboard/route.ts   -- POST: Create Stripe Connect onboard link
    stripe-webhook/route.ts   -- POST: Handle Stripe Connect webhooks
    dashboard/route.ts        -- GET: Dashboard stats

  qa/
    route.ts                  -- POST: Submit question, GET: List questions
    [id]/route.ts             -- GET: Question detail
    [id]/claim/route.ts       -- POST: Expert claims question
    [id]/answer/route.ts      -- POST: Expert submits answer
    [id]/accept/route.ts      -- POST: DIYer accepts answer
    [id]/review/route.ts      -- POST: DIYer leaves review

  consultations/
    route.ts                  -- POST: Book consultation, GET: List
    [id]/route.ts             -- GET: Detail
    [id]/join/route.ts        -- POST: Get video room credentials
    [id]/summary/route.ts     -- POST: Expert submits post-call summary
    [id]/cancel/route.ts      -- POST: Cancel booking
    [id]/review/route.ts      -- POST: Leave review

  rfps/
    route.ts                  -- POST: Create RFP, GET: List open RFPs
    [id]/route.ts             -- GET: RFP detail
    [id]/bids/route.ts        -- GET: All bids, POST: Submit bid
    [id]/bids/[bidId]/route.ts -- GET: Bid detail
    [id]/award/route.ts       -- POST: Award bid to contractor
    [id]/cancel/route.ts      -- POST: Cancel RFP

  messages/
    route.ts                  -- GET: List threads
    [threadId]/route.ts       -- GET/POST: Thread messages

  payments/
    webhook/route.ts          -- POST: Stripe webhook handler
```

### New Pages:

```
app/
  experts/
    page.tsx                  -- Expert search/browse (public)
    register/page.tsx         -- Expert registration flow
    dashboard/page.tsx        -- Expert dashboard (protected)
    [id]/page.tsx             -- Public expert profile

  marketplace/
    qa/page.tsx               -- DIYer Q&A submission
    consultations/page.tsx    -- DIYer consultation booking
    rfps/page.tsx             -- Browse RFPs (expert view)
    rfps/create/page.tsx      -- Create RFP from report (DIYer)
    rfps/[id]/page.tsx        -- RFP detail + bids
```

---

## Part 13: Key TypeScript Types

These extend the existing type system in `/home/justin/AI-Projects/diy-helper-webapp/lib/agents/types.ts`:

```typescript
// lib/marketplace/types.ts

// ── Expert Profile ──────────────────────────────────────────────────────────

export type VerificationLevel = 1 | 2 | 3;
export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected';

export type Specialty =
  | 'electrical' | 'plumbing' | 'hvac' | 'carpentry'
  | 'flooring' | 'roofing' | 'concrete' | 'drywall'
  | 'painting' | 'tile' | 'landscaping' | 'general_contracting'
  | 'other';

export interface ExpertProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  serviceRadiusMiles: number;
  verificationLevel: VerificationLevel;
  verificationStatus: VerificationStatus;
  hourlyRateCents: number | null;
  qaRateCents: number | null;
  avgRating: number;
  totalReviews: number;
  responseTimeHours: number | null;
  isActive: boolean;
  isAvailable: boolean;
  specialties: ExpertSpecialty[];
  createdAt: string;
}

export interface ExpertSpecialty {
  specialty: Specialty;
  yearsExperience: number | null;
  isPrimary: boolean;
}

// ── Q&A ─────────────────────────────────────────────────────────────────────

export type QAStatus = 'open' | 'claimed' | 'answered' | 'accepted' | 'disputed' | 'resolved';

export interface QAQuestion {
  id: string;
  diyerUserId: string;
  expertId: string | null;
  reportId: string | null;
  questionText: string;
  category: string;
  aiContext: ExpertContext | null;
  photoUrls: string[];
  priceCents: number;
  status: QAStatus;
  answerText: string | null;
  recommendsProfessional: boolean;
  proRecommendationReason: string | null;
  createdAt: string;
  answeredAt: string | null;
}

// ── Consultation ────────────────────────────────────────────────────────────

export type ConsultationStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  diyerUserId: string;
  expertId: string;
  reportId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  videoRoomUrl: string | null;
  diyerNotes: string | null;
  expertSummary: string | null;
  priceCents: number;
  status: ConsultationStatus;
  createdAt: string;
}

// ── RFP & Bidding ───────────────────────────────────────────────────────────

export type RFPStatus = 'open' | 'reviewing' | 'awarded' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type BidStatus = 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
export type MaterialsHandling = 'diyer_provides' | 'contractor_provides' | 'discuss';
export type TimelinePreference = 'asap' | 'within_2_weeks' | 'within_month' | 'flexible';
export type PermitHandling = 'contractor_pulls' | 'homeowner_pulls' | 'not_required';

export interface ProjectRFP {
  id: string;
  diyerUserId: string;
  reportId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  selectedSteps: number[];
  materialsHandling: MaterialsHandling;
  timelinePreference: TimelinePreference;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  city: string;
  state: string;
  sitePhotos: string[];
  status: RFPStatus;
  expiresAt: string;
  bidCount: number;
  viewCount: number;
  createdAt: string;
}

export interface ProjectBid {
  id: string;
  rfpId: string;
  expertId: string;
  totalPriceCents: number;
  perPhasePricing: Record<string, number> | null;
  estimatedStartDate: string | null;
  estimatedDurationDays: number | null;
  scopeNotes: string | null;
  materialsApproach: string | null;
  planModifications: string | null;
  permitHandling: PermitHandling;
  messageToDiyer: string | null;
  status: BidStatus;
  createdAt: string;
}

// ── Review ──────────────────────────────────────────────────────────────────

export interface ExpertReview {
  id: string;
  expertId: string;
  reviewerUserId: string;
  reviewType: 'qa' | 'consultation' | 'project';
  rating: number;
  title: string | null;
  body: string | null;
  expertResponse: string | null;
  createdAt: string;
}

// ── AI Context (shared with experts) ────────────────────────────────────────

export interface ExpertContext {
  projectSummary: string;
  projectType: string;
  location: { city: string; state: string };
  relevantCodes: string;
  safetyWarnings: string[];
  proRequired: boolean;
  proRequiredReason?: string;
  skillLevel: string;
  estimatedCost: number;
  steps: Array<{ order: number; title: string; skillLevel: string }>;
  diyerExperienceLevel: string;
}
```

---

## Part 14: Open Questions and Decisions to Make

1. **Video call provider**: Daily.co is the recommendation, but we should evaluate LiveKit for cost at scale. Decision needed before Phase 2.

2. **Background check provider**: Checkr is industry standard but expensive ($30-80 per check). Do we absorb this cost or charge experts? Recommendation: absorb it for the first 100 experts as a growth investment, then charge $25 as part of Level 3 verification.

3. **Insurance verification**: Manual process initially (we look at the uploaded document). At scale, integrate with an insurance verification API like AAIS or CoverageBook.

4. **Dispute resolution**: For MVP, a simple refund/no-refund decision by us. At scale, consider an arbitration system or partner with a dispute resolution service.

5. **Mobile experience**: The current app is web-only. Consultations will heavily favor mobile (DIYer pointing phone at the work area). Ensure the video call UI is mobile-optimized from day one.

6. **Expert availability for Q&A**: Do we use a queue model (questions wait for any expert) or a direct model (DIYer picks an expert)? Recommendation: queue model for MVP (faster to get answers, better for cold start), add direct selection later.

7. **Pricing strategy for launch**: Aggressive or conservative? Recommendation: lower prices and lower platform fees at launch to drive volume, then adjust as we learn.

8. **Legal**: We need Terms of Service updates, an expert agreement, and clear disclaimers that we are a platform, not a contractor. Our AI-generated reports are guidance, not engineering documents. Expert opinions are advice, not warranties. Get a lawyer involved before launch.

9. **Site visit workflow**: Should pre-bid site visits be a separate product (flat fee?) or handled as consultations? Contractors will not bid $8K+ on photos and an AI report alone. The question is whether we create a distinct "site visit" booking type with its own pricing or reuse the consultation infrastructure with a "pre-bid site visit" tag. The latter is simpler to build but may confuse the UX.

10. **Repeat customer pricing**: 5% flat for re-hires keeps contractors on-platform. But how do we detect off-platform re-engagement? The honest answer is that we probably cannot and should not try to police this. Instead, make staying on-platform more convenient than going around it: payment protection, warranty tracking, project history, dispute resolution, and the trust signal of platform-verified reviews. If we provide enough value, contractors stay voluntarily.

11. **AI uncertainty calibration**: How explicit should the AI be about what it does not know? Too uncertain and it seems useless -- "this might be a 100A panel or it might be a 200A panel, I really can't tell" is not helpful. Too confident and contractors bid on bad scope -- "this is a 100A panel" when it is actually 200A leads to wrong wire sizing in the materials list. We need to find the right balance through expert feedback, tracking which assertions get corrected most often, and calibrating confidence language accordingly.

12. **Contractor material suppliers**: The current materials integration is consumer-focused (Home Depot, Lowe's). Contractors buy from trade suppliers -- Rexel, Graybar, Ferguson, local distributors -- at significantly different price points and with trade-specific SKUs. Should we support supplier account linking so contractors can see their actual costs? At minimum, we should generate trade-format pick lists (organized by trade, with commercial product names and quantities) that contractors can hand to their suppliers directly.
