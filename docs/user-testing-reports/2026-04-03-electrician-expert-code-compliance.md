### User Test Report: AI Code Compliance & Dashboard Verification -- Electrician Expert

**Persona**: Sarah the Electrician (Licensed Electrician, Denver CO)
**Environment**: http://localhost:3000
**Mode**: Targeted -- NEC Code Compliance Focus + Dashboard Verification
**Date**: 2026-04-03
**Test Account**: test-expert-electrician@diyhelper.test

**Overall Experience**: The AI chat is genuinely impressive for electrical code compliance -- I would trust about 95% of what it told me, and the remaining 5% are minor code citation imprecisions, not safety-hazardous errors. As a licensed electrician evaluating this platform for earning potential, the AI quality is the strongest selling point. However, the dashboard and Q&A queue issues found by the carpenter expert are confirmed: my dashboard says "no open questions" while my queue has one, my Q&A rate is set at $15 but the question shows "Free," and there's still nowhere to display my electrical license number. If I can't show I'm licensed and I can't see what I'll get paid, I'm not committing my evenings to this platform.

---

## Findings (ordered by priority)

### Finding 1: Dashboard "Recent Questions" Widget Out of Sync with Q&A Queue
- **Issue**: Dashboard shows "No open questions in your specialties" while the Q&A Queue page shows 1 available electrical question. The expert banner on the main page also correctly shows "1 open question."
- **User Impact**: As an electrician checking in after a job, I'd glance at the dashboard, see "no questions," and close the tab. I'd miss the $15 payout sitting in my queue. This costs experts money and leaves DIYers waiting.
- **Expected Behavior**: Dashboard Recent Questions widget should show the same questions available in the Q&A Queue, filtered by my specialties.
- **Recommended Fix**: The dashboard query for recent questions appears to use a different filter or data source than the Q&A Queue page. Unify both to use the same API endpoint/query. Likely the dashboard is filtering by `status` or `specialty` differently.
- **Priority**: Critical
- **Cross-trade confirmation**: Also found by carpenter expert on same date.

### Finding 2: Q&A Rate Shows $0 / "Free Question" Despite $15 Expert Rate
- **Issue**: Expert profile has Q&A Rate set to $15.00, but the question in the Q&A queue is labeled "Free question." Dashboard shows Pending Payouts as $0.00.
- **User Impact**: I set my rate at $15 per Q&A answer. If I claim this question, will I get paid $15 or $0? The conflicting signals erode trust in the payment system. As an electrician, my time is worth real money -- I'm not answering code questions for free.
- **Expected Behavior**: Questions should display the payout amount the expert will receive when they claim and answer. "Free question" should indicate the DIYer's first free question, not that the expert earns $0.
- **Recommended Fix**: Separate the DIYer-facing "free question" label from the expert-facing payout display. Show the expert what they'll earn (e.g., "$15.00 payout" or "Platform-subsidized -- $15.00 to you").
- **Priority**: Critical
- **Cross-trade confirmation**: Also found by carpenter expert.

### Finding 3: No License/Certification Fields on Expert Profile
- **Issue**: Expert profile has Display Name, Bio, City, State, Zip, Service Radius, Hourly Rate, Q&A Rate, Specialties, and an Embeddable Badge. There are no fields for: electrical license number, license type (journeyman/master), license state, insurance info, bond details, years of experience, or continuing education.
- **User Impact**: As a licensed Master Electrician, my license is my most important credential. DIYers deciding whether to pay me $15-$75 need to verify I'm not some random person. Without license display, I have no competitive advantage over unlicensed handymen on this platform, and the platform can't differentiate verified professionals from pretenders.
- **Expected Behavior**: Profile should include: License Number, License Type (Apprentice/Journeyman/Master), Licensing State, Years Licensed, Insurance Status, and ideally a license verification integration.
- **Recommended Fix**: Add a "Credentials" section to the expert profile with trade-specific fields. For electricians: license number, type, state, expiration. Consider integrating with state licensing board APIs for verification badges.
- **Priority**: High
- **Cross-trade confirmation**: Also found by carpenter expert (no contractor license fields).

### Finding 4: "Free Question" and "Pool" Tags Displayed Simultaneously on Q&A Card
- **Issue**: The single question in the Q&A queue shows three tags: "electrical" (category), "Standard" (tier?), and "Pool" (unclear meaning), plus a "Free question" label on the right side.
- **User Impact**: As an expert, I don't understand what "Pool" means in this context. Is it a payment pool? A question pool? Combined with "Free question" it's confusing -- am I getting paid from a pool, or is this free? "Standard" is also unexplained. These labels need to mean something to me at a glance.
- **Expected Behavior**: Tags should be immediately understandable: category (electrical), payout amount ($15), and urgency/age. Remove or explain ambiguous labels.
- **Recommended Fix**: Replace "Pool" with the actual payout mechanism explanation. Replace "Standard" with question difficulty or urgency. Show payout amount prominently instead of "Free question."
- **Priority**: Medium
- **Cross-trade confirmation**: Also found by carpenter expert.

### Finding 5: Gibberish Test Data in Q&A Queue
- **Issue**: The only available electrical question has the title "sfsgdfs wfgseh;kamgh;msrhg;kmsg;kmsfg;,marf;msgdh;mawsfglndfglmn" -- clearly test/garbage data.
- **User Impact**: As a professional electrician opening the Q&A queue for the first time, seeing gibberish as the only available question makes the platform look broken or dead. First impressions matter -- if I see junk data, I question whether real DIYers are even using this.
- **Expected Behavior**: Q&A queue should only show legitimate questions. Test data should be cleaned up or filtered.
- **Recommended Fix**: Delete test/seed data from production-visible queues, or add a minimum question quality filter (e.g., minimum character count, basic content validation).
- **Priority**: Medium (test environment specific, but affects first-impression testing)

### Finding 6: Raw Next.js RSC Payload Leaking into Page Text
- **Issue**: When extracting page text (e.g., for accessibility or search), massive amounts of raw Next.js React Server Component JSON payload is visible at the bottom of the page. Includes internal file paths like "/home/justin/lakeshore-studio/ai-projects/diy-helper-webapp/.next/dev/server/chunks/..."
- **User Impact**: Not visible in normal browsing, but could be exposed to screen readers, search engine crawlers, or automated tools. The internal file paths are a minor security/information disclosure concern.
- **Expected Behavior**: RSC payloads should not be readable as page text content.
- **Recommended Fix**: This appears to be a Next.js dev mode artifact. Verify it doesn't occur in production builds. If it does, investigate RSC hydration script placement.
- **Priority**: Low (dev mode only, likely)
- **Cross-trade confirmation**: Also found by DIYer testers.

### Finding 7: No Expert Subscription Tiers Visible
- **Issue**: There is no visible subscription management (Free/Pro/Premium tiers) anywhere in the expert dashboard or profile. The system prompt mentions $29/month Pro and $79/month Premium tiers with queue priority and fee reductions, but these are not implemented.
- **User Impact**: I can't evaluate the ROI of paying for a premium tier if the tiers don't exist yet. For my cost/benefit calculation, I need to know: what do I get for $29/month? How much faster do I see questions? What's the fee reduction?
- **Expected Behavior**: Subscription tier comparison should be visible from the dashboard, with clear ROI calculations.
- **Recommended Fix**: Implement or at minimum display the planned subscription tiers with a "Coming Soon" indicator so experts can understand the platform's direction.
- **Priority**: Medium (feature gap, not a bug)
- **Cross-trade confirmation**: Also found by carpenter expert.

---

## AI Response Quality -- NEC Code Compliance Deep Dive

### Overall AI Score: 9.4 / 10

The AI demonstrated exceptional electrical code compliance knowledge across 5 increasingly challenging questions. This is the strongest aspect of the platform from an electrician's perspective.

### Question 1: 240V Dryer Outlet Installation (Score: 8.5/10)

**What the AI got right:**
- 10 AWG copper wire, 10/3 NM-B cable -- correct per NEC Table 310.16
- 30A double-pole breaker on dedicated circuit -- correct
- NEMA 14-30R receptacle (4-prong) -- correct
- 4-wire requirement for new installations, NEMA 10-30 no longer compliant -- correct
- 2023 NEC GFCI requirement for dryer receptacles -- correct and current
- Excellent safety warning about utility-side lugs remaining energized
- "Ask a verified expert" CTA is well-placed

**Minor issues:**
- Cited NEC 210.52 for dedicated circuit requirement; the more precise reference is NEC 210.23(A) for branch circuit ratings or NEC 220.54 for dryer load calculation
- Did not mention NEC 250.140 by number (the specific code prohibiting neutral-as-ground in new installations)
- No mention of conduit requirements for exposed cable runs

### Question 2: Kitchen Breaker Tripping -- Circuit Load Calculation (Score: 9/10)

**What the AI got right:**
- Accurate load calculation: microwave 900-1,200W (~10A) + toaster 800-1,500W (~7-12.5A) = 17-22+ amps on 15A circuit
- Correctly identified this as a capacity problem, not a bad breaker
- 80% continuous load rule applied correctly
- Critical safety warning: never put 20A breaker on 14 AWG wire (fire hazard)
- NEC 210.52(B) kitchen small appliance circuit requirements (two 20A circuits) -- correct
- Diagnostic framework distinguishing capacity problem vs. weak breaker vs. wiring fault -- excellent
- Wire gauge diagnostic checklist (14 AWG = 15A max, 12 AWG = 20A capable) -- correct

**Minor issues:**
- Option 1 mentions "20A double-pole" for kitchen upgrade -- should be single-pole 20A for 120V kitchen circuits
- The exact NEC section for two kitchen small appliance branch circuits is 210.11(C)(1), not just 210.52(B) (which covers receptacle placement)

### Question 3: Garage Circuit Extension -- GFCI Requirements (Score: 9.5/10)

**What the AI got right:**
- Correctly stated you CANNOT extend a house circuit into the garage per NEC 210.11(C)(4) -- the garage needs its own dedicated 20A circuit
- NEC 210.8(A)(2) GFCI requirement for ALL garage outlets -- correct with "no exceptions for new work"
- NEC 210.52(G)(1) one receptacle per vehicle bay -- correct
- Wire sizing table: 12 AWG/20A for general, 10 AWG/30A for 240V tools -- correct
- Recommended two dedicated circuits (one for freezer, one for general) -- practical and correct
- Food spoilage risk justification for dedicated freezer circuit -- real-world awareness
- Permit and inspection requirements correctly flagged
- Conduit vs. NM-B local variation noted

**Minor issues:**
- Could have mentioned NEC 210.12 AFCI requirements that some jurisdictions apply to garages (though this is debated and varies by AHJ)

### Question 4: 100A to 200A Panel Upgrade (Score: 10/10)

**What the AI got right:**
- Clearly and emphatically stated this is NOT a full DIY job
- Task-by-task risk matrix from Low to LETHAL -- outstanding safety communication
- Red alert: service entrance lugs are ALWAYS LIVE even with main breaker off -- this is life-or-death information, perfectly communicated
- Utility company involvement for service disconnect -- correct
- Wire sizing: 2/0 AWG copper or 4/0 AWG aluminum for 200A service -- correct per NEC Table 310.16
- Ground rods: two 8-ft copper-clad, 6 ft apart per NEC 250.53 -- correct
- Ground wire: 4 AWG copper minimum per NEC 250.66 -- correct
- Working clearance: 30"x36"x6.5ft per NEC 110.26 -- correct
- Federal Pacific (FPE) Stab-Lok and Zinsco/Sylvania fire hazard warning -- critical real-world knowledge
- AFCI (NEC 210.12) and GFCI requirements for new circuits -- correct
- Cost breakdown realistic ($1,500-$4,000 for full electrician)
- Hybrid approach suggestion (DIYer does inside work, electrician does service entrance) -- practical and common
- Specific panel brand/model recommendations with pricing -- actionable

**This response is textbook-perfect. I would be comfortable with any homeowner reading this.**

### Question 5: AFCI Debate & Refrigerator Nuisance Tripping (Score: 9.5/10)

**What the AI got right:**
- Diplomatically handled the "buddy electrician" disagreement without dismissing either party
- Complete NEC AFCI timeline table from 1999 (bedrooms only) through 2020/2023 (virtually all circuits) -- accurate
- Correctly explained that NEC is a model code adopted at different paces by different jurisdictions
- Acknowledged the refrigerator AFCI nuisance tripping concern as "very legitimate"
- Modern CAFCI (Combination AFCI) breaker improvements since ~2015 -- correct
- Nuisance trip risk matrix by scenario (new fridge + modern CAFCI = Low, older fridge = Moderate) -- practical
- Suggestion to try different CAFCI brand if tripping occurs -- real-world electrician knowledge
- Square D QO CAFCI as best for nuisance-trip resistance -- common field observation
- Correctly noted 2020/2023 NEC does NOT provide blanket exemption for refrigerator circuits
- Local jurisdiction amendments noted as variable factor

**Minor issues:**
- Could have cited NEC 210.12(A) by section number alongside the timeline
- Did not mention the NEC 210.12(D) exception for fire alarm circuits or other specific exemptions

---

## Carpenter's Critical Findings -- Verification Status

| Carpenter Finding | Electrician Verification | Status |
|---|---|---|
| Dashboard "Recent Questions" says "No open questions" while Q&A Queue has questions | CONFIRMED -- Dashboard shows 0, Q&A Queue shows 1 electrical question, banner shows "1 open question" | Confirmed |
| Q&A payout showing $0.00 despite expert having Q&A rate set | CONFIRMED -- Q&A Rate is $15.00 in profile, but queue shows "Free question" and dashboard shows $0.00 Pending Payouts | Confirmed |
| "Free question" and "Paid" tags appear simultaneously | CONFIRMED (variant) -- "Free question" and "Pool" tags appear simultaneously | Confirmed |
| No credential/license fields on expert profile | CONFIRMED -- No license number, type, state, insurance, or verification fields | Confirmed |
| 2000-char answer limit too short | NOT TESTED -- No legitimate electrical question to answer (only gibberish test data) | Untested |
| No photo attachment for answers | NOT TESTED -- Same reason | Untested |

---

## ROI Assessment

As a licensed electrician in Denver billing $75/hour for on-site work, here is my calculation:

**Revenue potential:**
- Q&A answering at $15/question, estimated 5-10 min per answer = $90-$180/hour effective rate (GOOD)
- Lead generation from Q&A to consultation bookings = potentially high value ($150-$500+ per job)

**Current blockers to committing:**
1. I can't display my Master Electrician license -- so DIYers can't verify my credentials
2. Payment flow is unclear -- $15 rate set but questions show "Free"
3. Dashboard mismatch means I'll miss available questions
4. Only 1 question in queue after 4 days -- not enough volume yet

**Verdict:** The AI quality would bring me back. The code compliance responses are genuinely excellent and would save me time explaining the same NEC references I repeat daily. But the payment clarity and credential display need to work before I invest real time here. Fix those two things and I'm in.

---

## What's Working Well

1. **AI electrical code compliance is exceptional** -- NEC citations are specific and almost always correct. The AFCI timeline, panel upgrade risk matrix, and garage circuit requirements demonstrate deep domain knowledge. This is the single biggest differentiator from other platforms.

2. **Safety warnings are prominent and appropriate** -- The lethal warning about service entrance lugs, the fire hazard warning about 20A breakers on 14 AWG wire, and the FPE/Zinsco panel alert are all critical. The AI correctly identifies when to recommend hiring a licensed electrician.

3. **Expert banner bridges DIYer and Expert contexts** -- When logged in as an expert, the banner on the main page shows "1 open question" and "Go to Dashboard" links. This is a good cross-context bridge.

4. **Embeddable Badge** -- The expert profile badge with embed code is a good marketing tool for attracting experts. I can put this on my website.

5. **Markdown rendering in AI responses** -- Tables, warning callouts, code blocks (for the panel diagram), and formatted lists all render correctly and make the technical content scannable. The tables for wire gauge specifications are particularly effective.

6. **"Save Materials" detection** -- When the AI response included specific panel models and materials, a "Save Materials" button appeared with local store price search integration. This is smart UX.

7. **Expert referral CTAs contextually placed** -- Each response ends with a contextually relevant "Want expert confirmation?" callout that links to the Q&A marketplace. The messaging varies appropriately by question complexity.

---

## GIF Recordings

- `electrician-nec-code-compliance-chat-2026-04-03.gif` -- 50-frame recording of the full 5-turn NEC code compliance chat roleplay (downloaded to browser)

---

*Report generated by Electrician Expert User Testing Agent, 2026-04-03*
