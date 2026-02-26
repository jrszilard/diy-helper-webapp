# Q&A Marketplace Implementation Plan

## Core Value Propositions (North Stars)

Everything below serves two value pillars that must be visible in every feature:

### For DIYers: "What the platform provides that a phone call cannot"
- **Living project context** — the expert already knows your project (AI report, photos, codes, safety warnings) before you even type a word
- **Conversation as documentation** — every answer becomes a searchable record you can reference mid-project
- **Payment protection** — escrow means you only pay if the answer helps; no risk of a wasted service call
- **Multi-expert triangulation** — get a second opinion without starting from scratch
- **AI triage first** — by the time you reach a human, you have a clear, focused question, saving everyone time and money

### For Tradespeople: "Why answering here beats a phone call"
- **Pre-contextualised questions** — no 20 minutes of "tell me about your project"; the AI report is already attached
- **Effective hourly rate of ~$120+/hr** — a $25 question takes ~5 minutes to answer thoughtfully
- **Reputation engine** — high ratings unlock premium queue access, badges, and project referrals
- **Zero marketing cost** — questions route to you based on specialty; no advertising needed
- **Project pipeline** — Q&A naturally graduates to paid project work through the platform

---

## Phase 0: Foundation & Value Reframe (Week 1)

**Goal**: Make the invisible value visible. No new features — just reframe what already exists.

### 0A. Feature Flags Foundation
- New file: `lib/feature-flags.ts` with env-var-based flags + percentage rollout via deterministic user ID hashing
- Add to `lib/config.ts` marketplace section:
  ```
  threadedConversations: false
  dynamicPricing: false
  expertBidding: false
  progressivePayments: false
  ```

### 0B. ProjectContextCard Component
- New component: `components/marketplace/ProjectContextCard.tsx`
- Renders the AI report context (from `buildExpertContext()`) as a visual card on the question submission page
- Shows: project summary, category, safety warnings, building codes, skill level, photos
- **Value message**: "Your expert will see all this context before answering — no need to explain your project from scratch"

### 0C. Value Messaging in QASubmitForm
- Edit `components/marketplace/QASubmitForm.tsx`:
  - Add ProjectContextCard above the question textarea
  - Replace "Ask a question" with "Get expert guidance on your project"
  - Add tagline: "Your AI report + photos give the expert full context before they even start"
  - Show pricing breakdown: "You pay $X → Expert earns $Y → Answer protected by escrow"

### 0D. Expert Identity — First-Name Only
- Edit expert display components to show first name + last initial only (e.g. "Mike R.")
- Add specialty badge, years of experience, response time, rating
- New component: `components/marketplace/ExpertIdentityCard.tsx`

### 0E. AI Chatbot Escalation Prompt
- Edit `app/api/guided-chat/route.ts`:
  - When the AI detects uncertainty (hedging language, safety-critical topics, repeated follow-ups on same issue), append a suggestion: "For hands-on expert guidance on this, you can [ask a verified tradesperson →]"
  - This is the primary funnel from free AI → paid human expert

---

## Phase 1: Threaded Conversations (Weeks 2-3)

**Goal**: Replace single-shot Q&A with back-and-forth conversation. This is the #1 feature that makes the platform better than a phone call — it creates a documented record.

### 1A. Database Migration
```sql
-- New table: qa_messages (replaces answer_text column for new questions)
create table qa_messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references qa_questions(id),
  sender_user_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('diyer', 'expert')),
  content text not null,
  attachments text[] default '{}',
  created_at timestamptz default now()
);

-- Index for conversation loading
create index idx_qa_messages_question on qa_messages(question_id, created_at);

-- RLS: participants only
alter table qa_messages enable row level security;
create policy "Participants can view messages"
  on qa_messages for select using (
    sender_user_id = auth.uid()
    or question_id in (
      select id from qa_questions
      where diyer_user_id = auth.uid() or expert_id = (
        select id from expert_profiles where user_id = auth.uid()
      )
    )
  );
```

### 1B. Conversation API Routes
- `app/api/qa/[id]/messages/route.ts` — GET (list messages) + POST (send message)
- POST applies `sanitizeContent()` from `lib/marketplace/messaging.ts`
- POST checks: only DIYer + claimed expert can post; question must be in `claimed` or `answered` status
- POST sends notification to the other party

### 1C. ConversationView Component
- New component: `components/marketplace/ConversationView.tsx`
- Threaded message list with sender identification (DIYer / Expert badge)
- Photo attachments inline
- "Expert is typing..." indicator via Supabase Realtime presence
- Replaces current `QAAnswerView.tsx` for threaded questions (feature-flagged)

### 1D. Resolve Flow
- Expert can mark conversation as "resolved" (proposes resolution)
- DIYer sees resolve proposal with options: "Accept Answer" / "Continue Conversation" / "Not Helpful"
- On accept → triggers payout flow (same as current accept)
- On "Continue Conversation" → conversation continues (may trigger tier upgrade in Phase 3)

### 1E. Supabase Realtime Integration
- Subscribe to `qa_messages` inserts filtered by `question_id`
- Live message delivery without polling
- Typing indicators via Realtime presence channel

---

## Phase 2: Dynamic Pricing & AI Escalation (Weeks 4-5)

**Goal**: Price questions fairly based on complexity. The AI chatbot has already pre-filtered easy questions, so human questions deserve higher compensation.

### 2A. Difficulty Scoring Engine
- New file: `lib/marketplace/difficulty-scorer.ts`
- Inputs from `buildExpertContext()`:
  - `proRequired` flag → +3 difficulty
  - `safetyWarnings.length` → +1 per warning
  - Photo count → +1 per photo over 2
  - Category (code-specific categories → +1)
  - Skill level (advanced → +2, intermediate → +1)
  - Question text length / complexity signals
- Output: difficulty score 1-10

### 2B. Pricing Engine
- New file: `lib/marketplace/pricing-engine.ts`
- Maps difficulty score to price tier:

| Tier | Difficulty | DIYer Pays | Platform (18%) | Expert Earns | Effective $/hr |
|------|-----------|-----------|----------------|-------------|---------------|
| Standard | 1-3 | $15 | $2.70 | $12.30 | ~$147/hr |
| Complex | 4-6 | $25 | $4.50 | $20.50 | ~$123/hr |
| Specialist | 7-10 | $45 | $8.10 | $36.90 | ~$110/hr |

- Platform fee drops from current 20% to 18% — experts keep more, encouraging participation
- Edit `lib/marketplace/qa-helpers.ts`: Replace `calculateQAPrice()` with new engine (feature-flagged)
- Edit `lib/marketplace/constants.ts`: Add `QA_PRICING_V2` with tier definitions

### 2C. Price Display in QASubmitForm
- Show the auto-calculated tier with explanation: "Based on your project's complexity (electrical + safety warnings + code requirements), this question is rated **Complex** — $25"
- Show what the expert earns: "$20.50 goes directly to your expert"
- Show the value comparison: "A service call for this would cost $75-150"

### 2D. Expert Queue Pricing Display
- In the expert dashboard Q&A queue, show the earning amount prominently
- Sort by earning potential as secondary sort (after match quality)
- Show "Est. 5-10 min" time indicator based on question complexity

---

## Phase 3: Progressive Payment Tiers (Weeks 6-7)

**Goal**: As conversations deepen, unlock payment gates that increase compensation while keeping the DIYer informed.

### 3A. Tier Gate System
- Initial payment covers Tier 1 (the first answer + 2 follow-ups)
- After 2 follow-up messages from the DIYer, prompt: "Your conversation is getting into deeper territory. Unlock extended guidance for $X more?"
- Tier progression:

| Gate | Trigger | Additional Cost | Cumulative Expert Earnings |
|------|---------|----------------|--------------------------|
| Tier 1 | Initial question | $15-45 (auto-priced) | $12.30-36.90 |
| Tier 2 | 3rd DIYer message | +$10 | $20.50-45.10 |
| Tier 3 | 6th DIYer message | +$20 | $36.90-61.50 |

### 3B. Database Changes
```sql
alter table qa_questions add column current_tier int default 1;
alter table qa_questions add column tier_payments jsonb default '[]';
-- tier_payments: [{tier: 1, amount_cents: 1500, payment_intent_id: "pi_xxx", charged_at: "..."}, ...]
```

### 3C. Tier Upgrade Flow
- When DIYer hits a gate: show modal explaining what they've gotten so far and what extended guidance includes
- Use existing `chargeQAQuestion()` for additional charges (same saved payment method)
- Expert sees notification: "Conversation upgraded to Tier 2 — you'll earn an additional $8.20"
- If DIYer declines: conversation still accessible as read-only; expert can still mark resolved

### 3D. Report Corrections Activation
- Activate the dormant `report_corrections` table
- New component: `components/marketplace/CorrectionForm.tsx` embedded in expert answer flow
- Experts can flag corrections to the AI report while answering: "The AI said X but actually Y"
- Corrections display on the DIYer's project report with expert attribution
- **Value message**: "Your project report gets smarter with every expert interaction"

### 3E. Expert Insight Notes
- Experts can add structured notes: tools needed, estimated time, common mistakes, local code notes
- These become part of the "living project context" that DIYers can reference later
- **Value message**: "This project advice stays with your project forever — not lost after a phone call"

---

## Phase 4: Expert Bidding & Proposals (Weeks 8-10)

**Goal**: For complex questions (Tier: Specialist), replace first-to-claim with a proposal system where experts compete on value, not speed.

### 4A. Database Migration
```sql
create table qa_bids (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references qa_questions(id),
  expert_id uuid not null references expert_profiles(id),
  proposed_price_cents int not null,
  pitch text not null,            -- "Here's how I'd approach this..."
  estimated_minutes int,
  relevant_experience text,       -- "15 years in residential electrical"
  status text default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz default now()
);

-- Add bidding mode flag to questions
alter table qa_questions add column pricing_mode text default 'fixed'
  check (pricing_mode in ('fixed', 'bidding'));
alter table qa_questions add column bid_deadline timestamptz;
```

### 4B. Bidding Flow
- Questions scored at difficulty 7+ automatically enter bidding mode
- DIYer sees: "Your question is complex enough that experts will submit proposals. You choose the best fit."
- Experts see the question + AI context and submit: pitch + price + estimated time + relevant experience
- Bid window: 4 hours (configurable via env var)
- After deadline or 3 bids received, DIYer reviews and selects
- Selected expert's bid price is charged; others are released

### 4C. Bid Card Component
- New component: `components/marketplace/BidCard.tsx`
- Shows: expert name/rating, pitch preview, price, estimated time, specialty match %
- DIYer can expand to read full pitch
- "Select This Expert" button triggers charge + claim

### 4D. Project Graduation Flow
- When a conversation reaches a natural "this needs hands-on work" point:
- Expert or DIYer can trigger "Graduate to Project"
- Pre-fills a project RFP from the conversation context (using existing `project_rfps` table)
- The expert who handled the Q&A gets priority positioning on the RFP
- **Revenue capture**: Project deposits processed via Stripe Connect destination charges
  - Add to `lib/stripe.ts`: `createDestinationCharge()` using `application_fee_amount` + `transfer_data.destination`
  - Commission: 10% on first $10K, 7% on $10K-$25K, 5% above $25K (already in `BIDDING_COMMISSION`)

---

## Phase 5: Reputation & Trust Engine (Weeks 11-12)

**Goal**: Build the reputation moat that makes the platform irreplaceable.

### 5A. Expert Reputation Score
- Composite score based on: answer acceptance rate, response time, tier upgrade rate (DIYers found it valuable enough to continue), correction quality, project graduation rate
- Display as star rating + "Expert Level" badge (Bronze/Silver/Gold/Platinum)
- High-rated experts get: priority in queue, higher visibility, access to premium questions

### 5B. Multi-Expert Triangulation
- For Specialist-tier questions, offer DIYers: "Get a second opinion from another expert — $15"
- Second expert sees the original conversation context + first expert's answer
- Display both answers side-by-side with agreement/disagreement highlights
- **Value message**: "Two expert opinions for less than one service call"

### 5C. Project Timeline View
- New component: `components/marketplace/ProjectTimeline.tsx`
- Visual timeline of all Q&A interactions, report corrections, expert notes for a project
- Shows the accumulating value: "3 expert consultations, 2 report corrections, 1 project quote"
- **Value message**: "Your project's complete knowledge base — try getting this from a phone call"

### 5D. Expert Portfolio & Embeddable Badges
- Public expert profiles with: specialties, response stats, sample answers (anonymized)
- Embeddable "Verified Expert on DIY Helper" badge for expert websites
- Drives expert investment in platform reputation

---

## Phase 6: Protection & Sustainability (Weeks 13-14)

**Goal**: Revenue protection and long-term platform sustainability.

### 6A. Enhanced Contact Sanitization
- Upgrade `lib/marketplace/messaging.ts` `sanitizeContent()`:
  - Add NLP-based patterns: "call me at", "text me", "my number is", "reach me at", spelled-out numbers
  - URL detection and masking
  - Social media handle detection
  - Log flagged attempts for fraud review (don't block — flag + sanitize)

### 6B. Fraud Detection & Activity Logging
- New table: `qa_activity_log` for tracking suspicious patterns
- Signals: rapid message exchanges, repeated sanitization triggers, same expert-DIYer pairs with short conversations
- Weekly digest to admin dashboard (not automated blocking — humans review)

### 6C. Expert Subscription Tiers
```
Free:     Queue access, standard questions, 18% platform fee
Pro $29:  Priority queue, analytics dashboard, 15% platform fee
Premium $79: Featured profile, direct question routing, 12% platform fee, project leads
```
- Use existing `createCheckoutSession()` in `lib/stripe.ts` with new price tiers
- Reduces platform fee as experts invest more — aligns incentives

### 6D. Consultation Booking
- Activate dormant `consultations` table
- Video/phone consultation scheduling for complex scenarios
- 15/30/60 min slots at expert-set rates
- Platform takes 15% (already in `CONSULTATION_PRICING`)

---

## Critical Path (Minimum Viable Upgrade)

**Phase 0 (1 week)** → **Phase 1 (2 weeks)** → **Phase 2A-C (1 week)** = **~4 weeks**

This gives you:
1. Value messaging that explains why the platform beats a phone call
2. Back-and-forth conversations (the biggest UX gap today)
3. Fair dynamic pricing based on question complexity
4. AI chatbot → human expert escalation funnel

Everything else builds incrementally on this foundation.

---

## Migration Summary

| Phase | Migration | Tables Affected |
|-------|-----------|----------------|
| 0 | Feature flags config | `lib/config.ts` only |
| 1 | `create_qa_messages` | New: `qa_messages` |
| 2 | `add_difficulty_scoring` | Alter: `qa_questions` (add `difficulty_score`, `price_tier`) |
| 3 | `add_tier_payments` | Alter: `qa_questions` (add `current_tier`, `tier_payments`) |
| 4 | `create_qa_bids` | New: `qa_bids`; Alter: `qa_questions` (add `pricing_mode`, `bid_deadline`) |
| 5 | `add_reputation_scores` | Alter: `expert_profiles` (add `reputation_score`, `expert_level`) |
| 6 | `create_activity_log` | New: `qa_activity_log`; Alter: `expert_profiles` (add `subscription_tier`) |

---

## New Files Inventory

| Phase | File | Purpose |
|-------|------|---------|
| 0 | `lib/feature-flags.ts` | Feature flag system |
| 0 | `components/marketplace/ProjectContextCard.tsx` | AI context display |
| 0 | `components/marketplace/ExpertIdentityCard.tsx` | First-name expert card |
| 1 | `components/marketplace/ConversationView.tsx` | Threaded message UI |
| 1 | `app/api/qa/[id]/messages/route.ts` | Conversation API |
| 2 | `lib/marketplace/difficulty-scorer.ts` | Complexity scoring |
| 2 | `lib/marketplace/pricing-engine.ts` | Dynamic pricing |
| 3 | `components/marketplace/CorrectionForm.tsx` | Report corrections |
| 3 | `components/marketplace/TierUpgradeModal.tsx` | Payment gate UI |
| 4 | `components/marketplace/BidCard.tsx` | Expert proposal card |
| 4 | `app/api/qa/[id]/bids/route.ts` | Bidding API |
| 4 | `lib/marketplace/bidding.ts` | Bid management logic |
| 5 | `components/marketplace/ProjectTimeline.tsx` | Project knowledge view |
| 5 | `components/marketplace/TriangulationView.tsx` | Second opinion UI |
| 6 | `lib/marketplace/fraud-detection.ts` | Suspicious activity flagging |

---

## Key Architecture Decisions

1. **Keep charge-on-claim + transfer-on-accept** — do NOT switch to Stripe manual capture (7-day auth expiration is a trap for conversations that last days)
2. **18% platform fee** (down from 20%) — experts keep more, encouraging participation
3. **Feature-flag everything** — percentage rollout with deterministic user ID hashing enables gradual rollout
4. **Build moat, not wall** — anti-bypass strategy is making the platform indispensable, not adversarial blocking
5. **Destination charges for projects** — when Q&A graduates to project work, use Stripe Connect destination charges (`application_fee_amount` + `transfer_data.destination`) for proper marketplace accounting
