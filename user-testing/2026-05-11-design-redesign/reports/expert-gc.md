# User Test Report: Full Sweep — General Contractor Expert

**Persona**: Tony the General Contractor — 15 yrs in Austin, TX. Runs his own GC outfit, manages 6 active subs, bids whole jobs ($20k–$300k bath/kitchen/addition work). Heard about Fixerator from a colleague. Skeptical of yet another lead-gen platform after burning out on Angi.
**Environment**: https://fixerator.com (production)
**Mode**: Full Sweep — registration, dashboard, profile, Q&A queue, claim/answer, subscriptions, lead-gen, chat AI roleplay.
**Date**: 2026-05-11

---

## Overall Experience

The platform looks polished — dark UI is sharp, the Fixerator mascot has personality, and the AI is genuinely impressive. But as a busy GC, the value proposition collapses the moment I look at it through a project-leads lens. The Q&A queue had ONE question in it, and it was literal keyboard-mash gibberish with a $4 payout. There's no bidding-for-jobs surface anywhere. The only feature I actually care about — "Project leads" — is hidden behind the $79/mo Premium tier with zero detail on what that actually means. The expert sidebar nav is also inconsistent and disappears under conditions I couldn't pin down (likely tied to expert profile completion). I would not commit time to this platform in its current state, but the AI quality is so strong on multi-trade scoping questions that I'd come back to evaluate again in 6 months if they fix the supply problem.

---

## Findings (ordered by priority)

### 1. CRITICAL — Q&A queue is empty / contains gibberish in production

**Issue**: The Q&A queue has exactly ONE open question across the entire platform. Its content is literally a keyboard mash: `dfg;kmsfg;lkndsglnsf;,mdg;msfgd;kndg;sdf;kmdbg;knsdfgz;n`. Tagged `drywall`, $4.00 payout, 43 days old.

**User Impact**: I logged in to evaluate the platform. The only available work is test data with a payout below McDonald's hourly. As a GC, this tells me the platform has no DIYer supply. I would close the tab and not come back. There's also no expectation-setting copy explaining low volume in beta.

**Expected**: At minimum, gibberish test data should be filtered from prod, OR there should be an empty-state message ("We're in early beta — questions come in 2-5x/day on average. Expert your specialty filters to be notified.").

**Fix**: Wipe test-data questions in prod. Add an `is_test_data` flag or content moderation gate. Add an honest empty-state for the queue that sets volume expectations.

**Priority**: Critical

---

### 2. CRITICAL — Subscription tier "Project leads" feature has zero detail

**Issue**: The Subscription page lists three tiers:
- Free (18% fee): Queue access, Standard questions
- Pro $29/mo (15% fee): Priority queue, Analytics dashboard
- Premium $79/mo (12% fee): Featured profile, Direct question routing, **Project leads**

"Project leads" is the ONLY meaningful feature for a GC — Q&A at $4–$15 a pop is rounding error compared to whole-job bids. But there's NO information about what a project lead is: Pre-qualified? Geo-targeted? RFP-style with specs? Volume per month? Average job size? Cost per lead vs. flat fee? Without that, $79/mo is asking me to commit on faith.

**User Impact**: As a GC, this is the single number that determines whether I sign up at all. Burying it with no detail makes me distrust the platform. Compares unfavorably to Angi/Thumbtack which at least show you example leads in their pitch.

**Expected**: Premium tier card should expand on hover/click to show a real example lead (anonymized), geographic coverage, volume promise ("avg 8–12 leads/month in major metros"), and what "qualified" means.

**Fix**: Add lead-spec detail to `/experts/dashboard/subscription`. Consider a 1-week free trial of Premium to demonstrate. Also: Pro tier is essentially useless to GCs (the 3% fee savings don't break even until ~$1k/mo of Q&A earnings, which the current question supply can't sustain).

**Priority**: Critical

---

### 3. HIGH — Expert sidebar (`EXPERT` section) doesn't render for some logged-in experts

**Issue**: When signed in as `test-expert-gc`, the sidebar showed only:
- DIY: My Projects, My Tools, Shopping
- EXPERTS: Find an Expert, My Questions

The `EXPERT` section (Dashboard, Q&A Queue, AI Review Queue, Messages) was MISSING from the sidebar, even though I was on `/experts/dashboard`. After session bouncing (via the shared Chrome instance with other test agents), I later saw the EXPERT section appear for the same account. Suggests a hydration / role-check race condition tied to expert profile completion or auth state.

**User Impact**: As a busy GC who multi-tabs, if I leave the dashboard I have no in-sidebar way to navigate back to Q&A Queue or Messages. I have to bookmark URLs or use back-button gymnastics. Critical for a freelancer who hops between apps.

**Expected**: Once authenticated as an expert (role=expert in DB), EXPERT section should render consistently on EVERY page, every load, regardless of expert profile completion state.

**Fix**: Audit `AppSidebar.tsx` for the conditional that hides the EXPERT section. Likely guarded by an `expert.is_active` or similar flag that takes a beat to load. Render the section optimistically based on role, and disable/grey individual links if profile is incomplete.

**Priority**: High

---

### 4. HIGH — There is NO bidding/RFP/lead-gen surface for GCs

**Issue**: I explored every expert route I could find: `/experts/dashboard`, `/experts/dashboard/qa`, `/experts/dashboard/reviews`, `/experts/dashboard/messages`, `/experts/dashboard/profile`, `/experts/dashboard/subscription`. None of them surface bigger-job opportunities. There's no "Browse Jobs", "Open RFPs", "Project Leads", or "Bid on Projects" page anywhere in the expert UI. The whole platform is built around Q&A micro-payments.

**User Impact**: As a GC, my entire income depends on whole-job bids. Q&A pays $4–$15. Project leads (Premium) is gated behind a paywall with no preview. I literally cannot see the product I'd be paying $79/mo for. As Tony, I close the tab.

**Expected**: An expert dashboard tile or sidebar link that says "Available Projects" — even if empty for me, even if all paywalled — so I can see SOMETHING resembling job-size lead-gen.

**Fix**: Add a `/experts/dashboard/leads` route showing project leads (or a preview of them for non-Premium subscribers). Surface it in the EXPERT sidebar section. If feature is genuinely not built yet, replace "Project leads" wording on the Premium tier with a "Coming Soon" badge so we're not over-promising.

**Priority**: High

---

### 5. HIGH — `/login` and `/auth/signout` routes return 404

**Issue**: Typing `https://fixerator.com/login` or `/auth/signout` directly in the URL bar produces a 404 page. The actual sign-in is a modal triggered by clicking the "Sign In" button in the sidebar; sign-out is in the user menu dropdown.

**User Impact**: As a returning GC who bookmarked `/login` from another similar app, this looks broken. Also bad for password manager auto-fill that targets `/login` paths. SEO/share-link friction: I can't send a teammate "Sign in here: fixerator.com/login".

**Expected**: `/login` should at minimum redirect to the home page with the sign-in modal auto-opened (similar to how `/?signIn=true` works). `/auth/signout` should clear session and redirect.

**Fix**: Add `app/login/page.tsx` that redirects to `/?signIn=true`. Same for `/signin`, `/sign-in`, `/auth/signin`. Add `/logout` and `/auth/signout` route handlers that clear session and redirect to home.

**Priority**: High

---

### 6. HIGH — Q&A payout ($4) doesn't match expert's self-set Q&A rate ($15)

**Issue**: My profile shows `Q&A Rate: $15.00`. The only available question on the queue offers `$4.00 payout`. My public expert profile page says "Ask a Paid Question — $15". The "Talk to a Pro" form (for DIYers) says "Free question used — this question costs $5–$8". Three different prices visible for the same product.

**User Impact**: As a GC, I set my Q&A rate at $15 expecting to earn $15 (less platform fee) per question. Seeing $4 in the queue tells me the system overrides my rate via some pool/auto-routing logic that I have no visibility or control over. I would feel cheated.

**Expected**: Either honor my $15 rate on every question (and show that $15 to DIYers), OR clearly explain the pool model upfront: "Pool questions pay $4–$8; direct questions to your profile pay your $15 set rate."

**Fix**: Audit the question-pricing logic. Add an "Earnings Model" section to the profile editor that explains how my Q&A rate, the pool rate, and platform fee interact. Surface "pool" vs "direct" tags on each queue card.

**Priority**: High

---

### 7. MEDIUM — Sidebar has both "EXPERTS" and "EXPERT" sections — confusingly named

**Issue**: When the full sidebar renders, there are two sections with near-identical names:
- `EXPERTS` (plural): "Find an Expert", "My Questions" — these are DIYer-side actions (hiring experts)
- `EXPERT` (singular): "Dashboard", "Q&A Queue", "AI Review Queue", "Messages" — these are expert-side tools

**User Impact**: As Tony, I clicked "Find an Expert" the first time looking for my dashboard. Wasted ~10 seconds. The visual hierarchy doesn't disambiguate — both are uppercase grey labels.

**Expected**: Rename for clarity. Suggest:
- `HIRE` or `FOR CUSTOMERS` (Find an Expert, My Questions)
- `WORK` or `PRO TOOLS` (Dashboard, Q&A Queue, AI Review Queue, Messages)

**Fix**: Update `AppSidebar.tsx` section labels.

**Priority**: Medium

---

### 8. MEDIUM — License/Credentials fields collected but not displayed publicly

**Issue**: The Expert Profile editor has fields for License Type, License Number, License State, Insurance Status (Insured / Bonded & Insured). I filled these out as Tony. The public expert profile (`/experts/<id>`) does NOT display any of this — only my display name, location, hourly rate, Q&A rate, specialties, and a bio.

**User Impact**: As a GC, my license number and bonded-and-insured status ARE my pitch. DIYers searching for a GC explicitly look for license verification. If I can't show "Tony Smith, License #GC-12345, TX, Bonded & Insured" on my public profile, the platform is failing my marketing.

**Expected**: Public profile should display credentials with a "Verified" checkmark if license was validated server-side. Show insurance status prominently.

**Fix**: Update `app/experts/[id]/page.tsx` to render credentials. Add a license-verification background job (or manual ops review) that sets a `credentials_verified_at` timestamp.

**Priority**: Medium

---

### 9. MEDIUM — Test data leaking into production: "Test account for general_contracting user testing agent." bio on public profile

**Issue**: My public expert profile bio reads "Test account for general_contracting user testing agent." That copy is visible to anyone browsing `/experts`. The HVAC test account "Lisa the HVAC Tech" and others likely have similar test bios. Also, "Willy's Welding" expert card shows location "Your Mom, CA".

**User Impact**: A real DIYer browsing the expert directory sees obvious placeholder data. Erodes trust in the platform. As a GC about to sign up, makes me think Fixerator isn't ready for prime time.

**Expected**: Either (a) hide test accounts from the public directory using a feature flag, (b) seed test accounts with realistic-looking dummy bios, or (c) clearly badge test accounts as "Demo profile".

**Fix**: Add an `is_test` flag to the expert table. Filter test accounts from `/experts` directory in prod. Or seed real-sounding bios on test accounts via a seed script.

**Priority**: Medium

---

### 10. MEDIUM — Claim button has no confirmation step — claiming a $0 / gibberish question is irreversible

**Issue**: On the Q&A queue, clicking "Claim" on a question immediately moves it to my "Your Active Questions" with a 2-hour timer to answer. There's no preview modal, no "are you sure?" confirmation, no "view full details before claiming" step.

**User Impact**: I clicked Claim on the gibberish question to test the flow and now I'm on the hook for 2 hours. If I had genuinely been busy and misclicked, my answer-on-time stat would tank. A more cautious GC might never re-engage after a single bad claim.

**Expected**: Either (a) two-step claim (preview question detail in a modal, then confirm claim), or (b) an "unclaim within 5 minutes" undo affordance for misclicks.

**Fix**: Add a confirmation modal showing full question text, photos, asker info, and payout breakdown before locking the 2-hour timer.

**Priority**: Medium

---

### 11. MEDIUM — Answer textarea limited to 2000 chars — too short for GC-grade answers

**Issue**: The answer form has a 2000-char limit (placeholder says "Provide a detailed, helpful answer (min 50 characters)"). My realistic GC answer to "what's the right phase sequence for a slab bathroom remodel" — even abbreviated — would be ~4000 chars with code references, sub schedule, and gotchas list.

**User Impact**: As a GC, I'd have to compress my answer or skip code references — exactly the value-add that justifies my rate. Sending a half-answer makes me look amateurish.

**Expected**: 5000–10000 char limit for expert answers, with Markdown formatting support (lists, tables, bold). Consider attaching a sketch/photo upload.

**Fix**: Raise text limit on the answer endpoint. Render answer as Markdown on the DIYer-facing view. Add file upload (image, PDF) to answers.

**Priority**: Medium

---

### 12. MEDIUM — AI's "Ask a verified expert" lead-gen routes DIYers to plumbers/electricians, not GCs

**Issue**: I asked the AI a complex multi-trade GC scoping question (full bathroom remodel, slab, multi-sub coordination, Austin permits). The AI's "💡 Want expert confirmation?" callout recommended "a verified local plumber or electrician" — never "a general contractor" — to confirm the bid. The lead-gen routing is hardcoded to single-trade specialists.

**User Impact**: As Tony, this is a direct insult: the platform's own AI doesn't think GCs add value on a multi-trade project. The lead routes that should land in my queue are being sent to my subs instead. Defeats my reason for being on this platform.

**Expected**: AI should detect multi-trade questions and route confirmation prompts to General Contractors. Single-trade questions stay with that specialist.

**Fix**: In the AI prompt for "Want expert confirmation?", branch on number of trades involved. If 2+ trades or "scoping" / "sequencing" / "permits" / "bid" appear in the question, recommend a GC. Otherwise stay with the relevant specialist.

**Priority**: Medium

---

### 13. LOW — Subscription tier descriptions have duplicate "platform fee" lines

**Issue**: On `/experts/dashboard/subscription`:
- Pro tier text: "15% platform fee" appears once near the top of the card AND once in the features list.
- Premium tier text: "12% platform fee" same duplication.

**User Impact**: Minor cosmetic — feels lazy / not proofread.

**Expected**: Show "platform fee" once per tier.

**Fix**: Remove the duplicated line in the tier features array. Source likely in `app/experts/dashboard/subscription/page.tsx`.

**Priority**: Low

---

### 14. LOW — Sidebar link label "AI Review Queue" vs URL `/experts/dashboard/reviews` — mismatch

**Issue**: The sidebar EXPERT section has a link "AI Review Queue" whose underlying route is `/experts/dashboard/reviews`. Directly typing `/experts/dashboard/ai-review` (which a user would guess from the label) hits a 404.

**User Impact**: As a power user who shares URLs with team members, the URL `/reviews` is confusable with "customer reviews of me". Either label or URL should change.

**Expected**: URL should match label semantics. Suggest `/experts/dashboard/ai-review` as the route (and `/reviews` 301-redirects to it).

**Fix**: Rename route to `/experts/dashboard/ai-review`. Add a redirect from old `/reviews`.

**Priority**: Low

---

### 15. LOW — Find-an-Expert card for "Mike Thompson" is missing the `$75/hr` rate line

**Issue**: On the public `/experts` directory, all expert cards show `$75/hr` EXCEPT Mike Thompson's card, which shows only specialty (electrical) and location. Possibly a missing default rate on that account.

**User Impact**: As a DIYer or comparison shopper, the card looks incomplete. As a fellow expert, makes me wonder if there's a data integrity issue.

**Expected**: Every expert card renders the same fields. If rate isn't set, show "Rate on request" or default to $75/hr.

**Fix**: Default null rates to a placeholder in the card render. Audit DB for null `hourly_rate` rows.

**Priority**: Low

---

### 16. POSITIVE — AI chat quality on multi-trade GC scoping is exceptional

**Issue**: I asked the AI: "I am a GC scoping a full bathroom remodel for a 1962 home in Austin TX. [...] Walk me through the right phase sequencing, which subs to bring in and when, the permits I need, and the realistic timeline assuming the home has a slab foundation. What gotchas should I price in?"

The AI's response was outstanding:
- Identified all 4 trade permits (Building, Plumbing, Electrical, Mechanical) with Austin-specific Chapter 25-12 citations
- Provided a 9-phase sequencing plan with realistic 10–14 week timeline
- Called out cast iron stack risk for 60+ year old homes
- Flagged asbestos/lead survey requirements with TCEQ regulatory context
- Identified Federal Pacific / Zinsco panel risk (fire hazard)
- Correctly cited NEC 406.4(D)(2) for ungrounded GFCI labeling in pre-1962 homes
- Recommended GPR scan for post-tension cable detection ($400–600)
- Specific waterproofing system recommendations (Schluter Kerdi, LATICRETE Hydro Ban, Mapei AquaDefense)
- Specific call-out NOT to use RedGard alone on curbless shower floor with linear drain
- 24-hour flood test protocol with 2" depth water mark
- Linear drain labor surcharge of 25-30%
- IRC toilet clearances (15" centerline, 24" front)
- $1,500–4,000 cast iron stack replacement, $800–3,500 asbestos abatement — realistic pricing buffers
- Termite warning specific to Central Texas
- Full sub-schedule summary table

**User Impact**: As a 15-year GC reading this, I'd be hard-pressed to add much to it. The AI is genuinely producing GC-grade content. If THIS is what a DIYer sees before they reach my profile, they're going to come to me well-prepared.

**Why this matters**: The AI is the platform's primary moat. It works. Keep investing here.

**Priority**: Positive

---

### 17. POSITIVE — Profile editor has comprehensive credential fields

**Issue**: The Expert Profile editor includes: Display Name, Bio, City, State, Zip Code, Service Radius (miles), Hourly Rate, Q&A Rate, License Type, License Number, License State, Insurance Status (Not specified / Insured / Bonded & Insured), Available-for-Work toggle, Specialties (with years of experience per specialty AND Primary flag), and an Embeddable Badge with copy-paste HTML.

**User Impact**: This is a thorough profile model. As a GC, having Service Radius (geo-targeting), License + Insurance fields, and an Embeddable Badge for my own website is exactly what I'd want to fill out.

**Why this matters**: Underlying data model is solid — the gap is just exposure on the public profile page (see Finding 8).

**Priority**: Positive

---

### 18. POSITIVE — "Talk to a Pro" value-prop copy is well-crafted

**Issue**: The DIYer "Talk to a Pro" form's value-prop callouts:
- "Pre-contextualized answer — your expert sees your full AI report, photos, and building codes upfront"
- "Documented record — every answer stays with your project forever, not lost after a call"
- "Payment protection — only charged when an expert claims; full refund if unanswered"
- "Verified tradespeople — rated experts matched by specialty to your project"

**User Impact**: As a GC reading the DIYer-facing copy, I really like "Pre-contextualized answer" — it tells DIYers the platform saves my time. "Documented record" is a strong differentiator vs. a phone call. "Payment protection" reduces DIYer friction without exposing me to deadbeats.

**Why this matters**: The bridge between DIYer and Expert is well-articulated. This copy is selling FOR me without me having to write it.

**Priority**: Positive

---

### 19. POSITIVE — Dark UI / Fixerator mascot is on-brand and feels premium

**Issue**: The dark color palette, orange/red accent, mascot illustration (Fix the FIX-3000), and the playful "I'll be back… with the receipts from Home Depot" subhead all land cleanly. The brand feels like a real product, not a side project.

**User Impact**: As a GC who's seen every white-with-blue-buttons SaaS dashboard in the universe, Fixerator stands out. I'd remember the brand.

**Why this matters**: First-impression confidence is high. The brand earns the right to charge $29-$79/mo IF the underlying features deliver.

**Priority**: Positive

---

## AI Response Quality (GC Lens)

**Score: 9.5/10**

- **Technical accuracy**: 10/10 — Austin permit chapters, NEC code citations, IRC clearances, real product names (Schluter Kerdi vs. RedGard distinction), realistic pricing buffers.
- **Safety of advice**: 9/10 — Correctly flagged Federal Pacific Stab-Lok as a fire risk, called for licensed plumber/electrician sign-off on slab work, abatement before demo, GPR scan for post-tension cables. Did NOT recommend any DIY-on-gas-or-load-bearing-structures.
- **Code compliance awareness**: 10/10 — Cited Austin Chapter 25-12, NEC 406.4(D)(2), IRC fixture clearances, TCEQ regulations for asbestos. All real, all correct.
- **Appropriate scope recognition**: 8/10 — Correctly identified this is GC-level scoping work. ONE deduction: the "Want expert confirmation?" CTA recommended plumber/electrician verification, never a GC. For a multi-trade question, that's misrouted lead-gen.

The AI is genuinely producing content that a GC would charge $200/hr to deliver. The depth, accuracy, and structure (tables, phase breakdowns, pricing ranges) are professional-grade.

---

## ROI Assessment

**Would I continue using the platform as Tony the GC?**

**Not right now. Maybe in 6 months.**

The fundamentals are good — the AI is excellent, the brand is sharp, the profile data model is comprehensive. But the value chain doesn't close for a GC:

1. Q&A volume is non-existent (1 gibberish question on the entire platform).
2. The Premium tier's "Project leads" feature has no detail — it's a marketing bullet, not a product I can evaluate.
3. There's no bidding/RFP surface visible anywhere in the expert UI.
4. The AI's own lead-gen text routes DIYers to specialists (plumbers, electricians), not to GCs — defeating the platform's value to me.

**Time math**:
- 30 min to set up profile, Stripe, certifications: acceptable
- $4-15 per question, 1 question available, ~5 min to answer = $48-180/hr theoretical max
- Real expected hourly: near zero because question supply is zero
- Premium $79/mo gating real leads: I won't pay for an unspecified feature

**Verdict**: I'd come back in 6 months. If you want me to commit now, show me ONE real lead in my area before asking for $79/mo.

---

## What's Working Well

1. **AI chat quality on multi-trade scoping is best-in-class.** Real code citations, real product names, realistic pricing buffers, proper trade sequencing.
2. **Profile editor is thorough** — license, insurance, service radius, embeddable badge, years-per-specialty.
3. **DIYer-side "Talk to a Pro" copy** is well-written and sets up the expert handoff correctly.
4. **Dark UI + mascot brand** feel premium and memorable.
5. **"Charge on Claim" banner** with 2-hour answer window is clear and reduces DIYer no-shows.
6. **Embeddable badge** is a real growth-loop feature — I'd put it on my GC website.
7. **"Pre-contextualized answer"** value prop (DIYer's AI report + photos shared upfront) genuinely saves expert time.

---

## GIF Recordings

None captured this run. The `save_to_disk` flag on screenshots did not persist images to a discoverable location in this environment. Findings rely on text extraction from `get_page_text` and JSONL records.

---

## Session/Cookie Caveat

This testing ran concurrently with 7 other persona agents sharing the same Chrome instance. Multiple times during the sweep, my session bounced between accounts (test-expert-gc → test-expert-electrician → Lisa the HVAC Tech → etc.) as other agents authenticated. Some findings — particularly the sidebar render bug (Finding 3) — may have been influenced by this shared-cookie environment. I noted findings only when reproducible across multiple page loads as the GC account.
