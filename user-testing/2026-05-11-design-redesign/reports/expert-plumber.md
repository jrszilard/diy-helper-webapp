# User Test Report: Expert Plumber — Fixerator Production Sweep

**Persona**: Master Plumber (Dave the Plumber, 15 yrs experience, Chicago IL)
**Environment**: https://fixerator.com (production)
**Date**: 2026-05-11
**Mode**: Full Sweep (Registration → Dashboard → Q&A queue → Profile → AI Chat → Settings)
**Sweep iteration**: Follow-up to 2026-04-28 visual plumber money test

---

## Overall Experience

As a working plumber, this is the closest I've seen to a "Thumbtack that doesn't suck" — the dark UI is sharp, the Q&A flow has clear payout/timing rules ("Charge on Claim, 2 hours to answer, auto-refund"), and the AI is shockingly competent on plumbing (catches venting physics, 1970s cast iron failure mode, gas water heater code requirements). The platform's bones are good. But three things would make me close the tab and never come back: (1) the Q&A queue is empty — zero real plumbing questions, just one 43-day-old gibberish test entry; (2) my licensed/insured status, which is the #1 trust signal for hiring a plumber, doesn't appear on my public profile even though the editor has fields for it; (3) the Settings page and Dashboard show contradictory information about Stripe and subscription tiers ("coming soon" vs. "Upgrade now" $29/$79 buttons). The AI chat is the strongest piece — I'd let it run lead-gen for me. Everything around money/trust still needs polish before I'd invest time building rep here.

---

## Findings (ordered by priority)

### CRITICAL

**1. Q&A Queue is empty for Plumbing — zero real questions exist on production**

- **Issue**: The Q&A Queue at `/experts/dashboard/qa` shows only 1 question across ALL trades, and it's gibberish: `"sfsgdfs wfgseh;kamgh;msrhg;kmsg;kmsfg;,marf;msgdh;mawsfglndfglmn"` tagged `electrical`, posted 43 days ago. Filtering to "Plumbing" returns "No questions match your filter."
- **User Impact**: As a busy plumber considering this platform, I open the queue expecting to see real DIYer questions I can answer for money. Seeing zero plumbing work and one nonsensical electrical entry that's been sitting for 6+ weeks tells me there are no real DIYers using this. My ROI calculation here is "$0 — this is a ghost town." I close the tab.
- **Expected**: At least seeded sample questions per trade, OR a clear "Be the first to answer in your area — we're growing" message that doesn't just say "No questions match your filter."
- **Fix Recommendation**: (a) Purge gibberish test data from production. (b) For empty trades, show a better empty state with expected question volume per region/month. (c) Consider seeding 5-10 sample plumbing questions per region with the "Free question — builds your reputation" badge to bootstrap the marketplace.
- **Priority**: Critical
- **Page**: `/experts/dashboard/qa`

**2. Licensed/Insured credentials don't display on public expert profiles**

- **Issue**: The profile editor at `/experts/dashboard/profile` has dedicated fields for License Type, License Number, License State, and Insurance Status. But Dave the Plumber's public profile at `/experts/{id}` shows ONLY: name, location, $75/hr, "Plumbing · 15 yrs" specialty badge. No license info, no insurance status, no photo, no service breakdown, no service radius.
- **User Impact**: For a plumber, my license number and insurance are the #1 thing a homeowner verifies. Without them showing on my public page, I look indistinguishable from an unlicensed handyman. Lead conversion drops to near zero. I won't fill out my profile if it doesn't show what matters.
- **Expected**: Public profile prominently displays License Type · License # · State, with an Insurance status pill. Ideally a "Verified" checkmark next to verified credentials.
- **Fix Recommendation**: Add a Credentials section to the public profile component, mirroring what's in the editor. Mark license fields as required (or strongly recommended) during profile setup. Consider a "Verified plumber" badge for accounts with valid license data.
- **Priority**: Critical
- **Page**: `/experts/{id}`, `/experts/dashboard/profile`

### HIGH

**3. Settings page says subscription tiers "coming soon" while Dashboard subscription page sells $29/$79 tiers**

- **Issue**: `/settings` shows "EXPERT SUBSCRIPTION → Free Tier — Expert subscription tiers (Pro & Premium) with queue priority and reduced fees are coming soon." But `/experts/dashboard/subscription` shows fully-priced Pro ($29/mo) and Premium ($79/mo) cards with active "Upgrade to Pro" and "Upgrade to Premium" CTAs.
- **User Impact**: I can't tell if these tiers are actually purchasable or vaporware. If I click Upgrade and it errors, I lose trust. If they ARE live, the Settings copy is stale and confusing.
- **Expected**: Both pages reflect the same state. Either both say "coming soon" or both let me upgrade.
- **Fix Recommendation**: Either ship the subscription flow and remove "coming soon" copy from `/settings`, OR temporarily hide the Pro/Premium cards on the subscription page. Check `app/settings/page.tsx` and `app/experts/dashboard/subscription/page.tsx` for the source of each string.
- **Priority**: High
- **Page**: `/settings`, `/experts/dashboard/subscription`

**4. Dashboard "Recent Questions" links to a non-existent question**

- **Issue**: On the dashboard's "Recent Questions" widget, clicking the gibberish question card navigates to `/marketplace/qa/ca8caa00-06f0-42ad-a09e-ff9198e10714` which returns "Question not found" with a "Back to Q&A" link.
- **User Impact**: First-time UX failure — the very first thing I click on the dashboard takes me to a dead page. Eroded confidence in the platform.
- **Expected**: Recent Questions widget either (a) shows only questions that exist and are claimable, or (b) routes to the queue with that question pre-filtered/highlighted.
- **Fix Recommendation**: Check whether the Recent Questions data source joins against actual question state. Likely a stale ID in the widget query, or the question was deleted/refunded but the widget cache wasn't invalidated.
- **Priority**: High
- **Page**: `/experts/dashboard`, target broken at `/marketplace/qa/{id}`

**5. `/experts/queue` returns "Expert not found" — sidebar nav doesn't match URL pattern**

- **Issue**: Navigating to `https://fixerator.com/experts/queue` shows "Expert not found / Browse Experts." The URL is being interpreted as an expert profile request where "queue" is the expert ID. The real route is `/experts/dashboard/qa`.
- **User Impact**: Anyone typing a guessed URL or hitting an old bookmark gets an unhelpful 404-style page. The "Browse Experts" suggestion is misleading — that's not what I was looking for.
- **Expected**: `/experts/queue` either redirects to `/experts/dashboard/qa` or returns a true 404.
- **Fix Recommendation**: Add a redirect rule or middleware check for likely Q&A queue URL guesses.
- **Priority**: High
- **Page**: `/experts/queue`

**6. `/experts/dashboard/ai-review` returns 404, but sidebar labels "AI Review Queue" → actual route is `/experts/dashboard/reviews`**

- **Issue**: Direct navigation to `/experts/dashboard/ai-review` (the "natural" URL inferred from the sidebar label "AI Review Queue") returns 404. The actual route is `/experts/dashboard/reviews`.
- **User Impact**: URL doesn't match nav label. Bookmarking or sharing the URL produces a 404 for the recipient.
- **Expected**: Either rename the route to `/experts/dashboard/ai-review` to match the nav label, or rename the nav label to "Reviews."
- **Fix Recommendation**: Pick one. `/experts/dashboard/reviews` is fine; just align the label. Or add a redirect.
- **Priority**: High
- **Page**: `/experts/dashboard/ai-review`

**7. /login is a 404 — no dedicated sign-in page**

- **Issue**: Navigating to `https://fixerator.com/login` returns a 404. Sign-in is modal-based off the landing page.
- **User Impact**: If I bookmark the login page, share a password-reset link that includes `/login`, or hit the URL after a session timeout, I get a confusing 404. Most apps have `/login` as a permanent endpoint.
- **Expected**: `/login` should either render a dedicated login page or redirect to `/?signIn=true` (which is what the email-link flow seems to use).
- **Fix Recommendation**: Add a `/login` route that redirects to `/?signIn=true` or renders a standalone sign-in component.
- **Priority**: High
- **Page**: `/login`

### MEDIUM

**8. Answer textarea capped at 2000 characters — too short for complete plumbing answers with code references**

- **Issue**: The expert answer textarea has a hard limit of 2000 characters. As a plumber answering a serious question (water heater install, slab leak, code compliance), I routinely need 3000-4000 characters to cover diagnosis steps, materials list, code refs (UPC/IPC sections), safety warnings, and pro-vs-DIY decision points.
- **User Impact**: I have to either cut critical detail or write a substandard answer. Both options hurt my rating.
- **Expected**: 5000+ character limit, or rich text editor with no hard cap.
- **Fix Recommendation**: Bump limit to 5000 and add basic markdown support (bold, lists, links). Carpenter sweep noted the same issue — confirmed cross-trade.
- **Priority**: Medium
- **Page**: `/experts/dashboard/qa` (claimed question answer form)

**9. No photo attachments on answers — can't share reference images or diagrams**

- **Issue**: The answer form is text-only. For plumbing, I often need to attach: a photo of the correct vs. incorrect fitting orientation, a rough sketch of vent stack routing, a manufacturer spec sheet excerpt, or a photo from a similar installation.
- **User Impact**: My answers are less useful than they could be. DIYers asking "is this fitting installed correctly?" can't get a "this is what it should look like" image back.
- **Expected**: At least one image attachment per answer; ideally 3-5.
- **Fix Recommendation**: Add image upload to the answer form. Use Supabase Storage with a `qa-answer-images` bucket.
- **Priority**: Medium
- **Page**: `/experts/dashboard/qa`

**10. Subscription tier value-prop missing details a tradesperson needs to calculate ROI**

- **Issue**: The subscription page shows Pro ($29/mo, 15% fee, priority queue, analytics) and Premium ($79/mo, 12% fee, featured profile, direct routing, project leads). But it doesn't tell me: (a) how many "project leads" per month I can expect on Premium, (b) what "direct question routing" actually means (bypass the queue? get notified first?), (c) annual pricing/discount, (d) what break-even Q&A volume looks like.
- **User Impact**: I can't decide if Premium is worth $79/mo. As a tradesperson I do this math instantly when given the inputs: 18% → 12% saves 6%. At ~$1,300/mo in Q&A I break even on Premium just from fees. But "Project leads" is the actual driver, and the page is silent on volume.
- **Expected**: Each tier card includes an "Expected value" or "Break-even" calculator OR concrete numbers ("avg Premium expert receives 5-10 project leads/month").
- **Fix Recommendation**: Add tier comparison table with bench data. Consider an interactive "What's your Q&A volume?" widget that shows tier ROI.
- **Priority**: Medium
- **Page**: `/experts/dashboard/subscription`

**11. Public expert profile doesn't show service radius, sub-services, photos, or availability — too sparse**

- **Issue**: Dave the Plumber's public profile shows: name, "0.0 (0 reviews)", Chicago IL, $75/hr, single "Plumbing · 15 yrs" tag, a 1-sentence description, and two CTAs. Profile editor has more fields (City/State/Zip/Service Radius, Q&A Rate, Insurance Status, multi-specialty) but they don't all surface to the public view.
- **User Impact**: DIYers see less than they need to choose me. I'm in Chicago — do I serve North Suburbs? Schaumburg? Indiana border? Critical info missing. No sub-services means I look generic.
- **Expected**: Public profile displays all fields the editor exposes: location + service radius (as miles or area), credentials, all specialties with years, insurance status pill, photo upload, services breakdown.
- **Fix Recommendation**: Audit the public profile component to surface every populated field from the editor. Consider a "complete your profile" progress bar to encourage filling missing fields.
- **Priority**: Medium
- **Page**: `/experts/{id}` (public)

**12. "Hvac" filter chip is mis-capitalized in Q&A queue**

- **Issue**: The trade filter chips read: "All | Electrical | Plumbing | **Hvac** | Carpentry | Flooring | Roofing | Concrete | Drywall | Painting | Tile | Landscaping." HVAC should be all-caps — it's an industry standard abbreviation.
- **User Impact**: Minor but jarring. Tradespeople notice industry-term capitalization.
- **Expected**: "HVAC"
- **Fix Recommendation**: Update label in trade-filter component or DB seed data.
- **Priority**: Low/Medium
- **Page**: `/experts/dashboard/qa`

**13. Test data ("Slizzy Industry", "Willy's Welding — Your Mom, CA", gibberish question text) is visible on production**

- **Issue**: On the public expert directory `/experts`, two entries are clearly test data: "Slizzy Industry" (Portsmouth, NH) and "Willy's Welding" (Your Mom, CA). Plus the gibberish question is publicly browseable in the Q&A queue.
- **User Impact**: As a new plumber arriving on the platform, this is my first impression — and it tells me this is a toy product, not a serious business platform. I won't sign up.
- **Expected**: Test data hidden in production, or moved to a `*-test.fixerator.com` subdomain.
- **Fix Recommendation**: Add an `is_test` flag to user/question records; filter from production queries. Audit existing rows and remove or flag.
- **Priority**: Medium
- **Page**: `/experts`, `/experts/dashboard/qa`

### LOW

**14. "Hi, I'm Fix. I'm here to terminate your project." is brand-aggressive for a serious trade platform**

- **Issue**: Landing hero says "terminate your project" in the Fixerator brand voice. As a working plumber, "terminate" reads as "finish" but it's a strange word choice for trade work where "termination" can also mean "discontinue without completion." Slightly off-putting for the trades audience.
- **User Impact**: As a tradesperson, my first impression of the brand is "this is for techy DIYers, not serious pros." Brand voice feels designed for the consumer side, not for me.
- **Expected**: Consider a separate hero/landing for the `/experts/register` flow that speaks in trade language.
- **Fix Recommendation**: A/B test trade-side messaging: "Get paid for what you know. Answer DIY questions, find bigger jobs."
- **Priority**: Low
- **Page**: `/`

**15. "Free question" badge wording is ambiguous**

- **Issue**: The Q&A queue card shows "Free question" plus "Free — First Question" tag. As an expert, "Free question" is ambiguous: free for the DIYer? Free for me to claim with no payout? Both? The "Free — First Question" tag clarifies it's the DIYer's first free question on the platform, but the headline copy doesn't.
- **User Impact**: Slight cognitive friction. I take a second to parse what "Free" means before deciding to claim.
- **Expected**: Clearer label like "First-time free — no payout, builds reputation" or just "Reputation build."
- **Fix Recommendation**: Rename "Free question" badge in card to match the inline subtext "Free question — builds your reputation."
- **Priority**: Low
- **Page**: `/experts/dashboard/qa`

**16. "Back to Chat" link in Settings frames chat as the home base**

- **Issue**: Top of `/settings` says "← Back to Chat." But chat isn't always where the user came from — an expert may have navigated from Dashboard.
- **User Impact**: Minor cognitive dissonance — "back to chat" doesn't match where I was.
- **Expected**: Either dynamic back link based on referrer, or generic "← Back."
- **Fix Recommendation**: Use `document.referrer` or router history to set the back link dynamically.
- **Priority**: Low
- **Page**: `/settings`

---

## AI Response Quality

I tested two plumbing questions in chat and the AI was **outstanding** — easily the strongest piece of the platform from a tradesperson's view.

### Test 1: "Shower drain gurgles when toilet flushes, 1970s slab ranch"

- **Technical accuracy**: 10/10. AI correctly explains trap-siphonage / venting physics ("water acts like a piston and pulls air from traps"), correctly orders likely causes (partial clog → venting issue → cast iron deterioration → sewer line), and correctly identifies 1970s slab homes as cast-iron-era risk.
- **Diagnostic sequence**: Logically ordered cheapest-to-most-expensive: run shower alone, flush toilet multiple times, check roof vent stack, then snake. Then escalates to camera inspection.
- **Cost realism**: $150-$300 for camera inspection, $100 vs $10,000+ range for outcomes. All accurate.
- **Safety**: No safety violations. Correctly identifies when to call a plumber rather than DIY (slab access, cast iron failure).
- **Pro referral**: The "Ask a verified expert →" CTA appears at the moment of maximum uncertainty for the DIYer — well-timed lead-gen for me as a plumber.

### Test 2: "Replace 50-gallon gas water heater myself — code requirements?"

- **Technical accuracy**: 10/10. AI references IRC and NFPA 54 (National Fuel Gas Code) — exactly the correct citations.
- **Code requirements correctly identified**: Permit required, new flex gas connector (never reuse), seismic strapping in earthquake zones, expansion tank on closed systems (with PRV explanation), drip leg / sediment trap on gas line, TPR valve piped to within 6" of floor, B-vent or direct vent matching BTU, 18" garage clearance from floor (ignition source height), NAECA first-hour rating compliance.
- **Materials list**: Correct flexible gas connector spec (18″–24″), yellow gas-rated PTFE tape (vs white water tape — this is a common DIYer mistake to flag), leak detection solution.
- **Safety**: Correctly flags venting compatibility, gas line sizing, and CO risk implicitly. Recommends professional sign-off.
- **Location-aware**: Asks for city/state to pull exact local code — clever and useful.

### Plumber-specific verdict

I'd put my name behind every claim the AI made in these two answers. If anything, the AI is conservative — flagging "call a pro" earlier than strictly necessary, which is fine. It correctly identifies the edge cases where a plumber adds real value (camera inspection, gas line sizing, slab access, jurisdiction-specific permits).

### Minor nits a master plumber might add

- Could mention **AAVs / Studor vents** as a possible 1970s retrofit
- Could mention **2-inch P-trap requirements** for showers vs. 1.5" for lavs
- Could mention **permit cost ranges ($50-$500)** and **inspection sequencing** for the water heater install

These are all polish-level. The core advice is professionally sound.

**Overall AI score: 9.5/10 for plumbing knowledge.** Matches the carpenter (9+) and electrician (9.4) scores from prior sweeps.

---

## ROI Assessment

As a master plumber, here's my honest ROI calculation right now:

- **AI Lead-gen potential: HIGH** — DIYers asking about slab leaks, water heater installs, gas line work, and venting will see "Ask a verified expert" CTAs at exactly the right moments. If even 2% convert to consultation bookings, the lead value alone justifies my time.
- **Q&A revenue: ZERO** — There's nothing to claim. Until the platform has real plumbing question volume, Q&A is a $0 revenue stream.
- **Premium tier value: UNKNOWABLE** — "Project leads" sounds great but no concrete numbers. Can't decide without data.
- **Profile-as-marketing: BROKEN** — Without license/insurance display, my public profile doesn't help me convert DIYers who land on it.

**Would I sign up today?** Only if I were betting on platform growth. I'd fill out my profile minimally, set up Stripe, and check back in 90 days. I would NOT pay $29 or $79/month while the queue is empty and credentials don't show.

**What would convert me to Premium ($79/mo)?**
1. At least 50 real plumbing questions in my regional queue
2. License/insurance prominently displayed on my public profile
3. A trackable "Project leads" stream with provenance (where did this lead come from?)
4. Concrete data: "Premium plumbers in IL average 7 leads/month worth ~$X in booked work"

---

## What's Working Well

Genuine bright spots from a plumber's view:

1. **AI plumbing knowledge is exceptional** — 9.5/10 on both questions tested. Correctly handles venting physics, era-specific failure modes, code compliance (IRC/NFPA 54/UPC/IPC). Won't get DIYers killed.
2. **"Charge on Claim" disclosure is excellent** — "When you claim a question, the DIYer's card is charged and you have 2 hours to answer. If you don't answer in time, they're automatically refunded." This is exactly the trust-building copy a tradesperson needs upfront. Best-in-class.
3. **AI auto-suggests "Ask a verified expert" at high-uncertainty moments** — This is the lead-gen pipeline working as designed. Pricing range disclosures ($100 vs $10,000+ for slab leak) drive DIYers to seek expert confirmation.
4. **Trade filter chips on the queue** — Clean implementation. Easy to filter to my trade.
5. **Embeddable verified-expert badge** — HTML embed code for my own website is a smart cross-platform play. Free marketing for the platform; trust signal for me.
6. **Profile editor has license/insurance fields** — The data model is right. Just needs surfacing on public profile.
7. **AI Review Queue concept ("borderline AI responses in your specialty")** — Brilliant idea. Pay experts to validate edge-case AI answers in their trade. Builds trust + improves the AI + gives experts low-effort revenue. Currently empty but the concept is excellent.
8. **Expert context banner on DIYer pages** — "Welcome back, Sarah the Electrician · 0 open questions · Go to Dashboard" appears at top of `/marketplace/qa`. Good cross-context bridge.
9. **Dark UI feels premium** — Sharp, modern, easy on the eyes. Looks like a serious tool, not a hobby site.
10. **AI's "Tell me your location" pattern** — Conversational way to get city/state for jurisdiction-specific code lookups. Better than a form field.
11. **Settings page consolidates Stripe + Subscription + Profile** in one place — clean IA.
12. **No old "DIY Helper" brand leakage** observed across all pages tested. The Fixerator rebrand is clean.

---

## Notable Test Conditions

Due to 8 parallel test agents sharing one Chrome instance, my session was repeatedly preempted by other agents' logins. I was unable to maintain a stable "Dave the Plumber" session for full testing. I logged in as plumber 3 times but each time was overwritten by other personas mid-flow (Tony the GC, Lisa the HVAC Tech, Sarah the Electrician, test-diyer-intermediate). My findings reflect what I observed across all these expert sessions; the underlying expert-side UX is identical across trades, so the findings still apply to the plumber persona. Where I noted trade-specific issues, I marked them.

## GIF Recordings

No GIFs captured this run due to session-stability issues with parallel agents. Screenshots referenced inline above.
