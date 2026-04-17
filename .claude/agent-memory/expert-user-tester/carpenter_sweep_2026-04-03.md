---
name: Carpenter Full Sweep Report 2026-04-03
description: First expert user test — carpenter persona full sweep against localhost:3000. Found dashboard data inconsistency, $0 payout bug, missing expert subscription tiers, and strong AI responses.
type: project
---

### User Test Report: Full Sweep -- Carpenter Expert

**Persona**: Carpenter (Mike the Carpenter, 15 years experience, Portland OR)
**Environment**: http://localhost:3000
**Mode**: Full Sweep
**Date**: 2026-04-03

**Overall Experience**: As a 15-year carpenter, I found the platform's expert dashboard functional but missing key trust-building features. The Q&A flow works -- I claimed and answered a structural question successfully. But the $0.00 payout display when my profile clearly says $15/question is a deal-breaker for trust. The AI chat responses on carpentry topics (load-bearing walls, beam sizing, deck ledger boards) were impressively accurate -- some of the best I've seen from an AI. If the money side gets sorted out, this platform has real potential.

---

## Findings (ordered by priority)

### 1. Dashboard shows "No open questions" when Q&A Queue has 2 matching questions
- **Issue**: The dashboard "Recent Questions" widget says "No open questions in your specialties" but the Q&A Queue page (`/experts/dashboard/qa`) shows 2 open carpentry questions. The notification bell also showed a notification about a new carpentry question.
- **User Impact**: As a carpenter checking in quickly between jobs, I'd glance at the dashboard, see zero questions, and leave. I'd miss real paying work. This directly costs me money.
- **Expected Behavior**: Dashboard should show the same questions visible in the Q&A Queue filtered by my specialties.
- **Recommended Fix**: The dashboard's Recent Questions query likely has a different filter or time window than the Q&A Queue. Audit the API call on the dashboard page (`/experts/dashboard`) and ensure it uses the same query logic as `/experts/dashboard/qa` when filtering by expert specialties.
- **Priority**: Critical

### 2. Q&A payout shows $0.00 despite expert having $15 Q&A rate configured
- **Issue**: When I claimed a question, the "Your payout" field showed "$0.00". My expert profile has Q&A Rate set to $15.00, and my public profile displays "Ask a Paid Question -- $15" to DIYers. After answering, earnings on the dashboard also remained $0.00.
- **User Impact**: I just spent 10+ minutes writing a detailed structural repair answer (joist sistering with code references) and got paid nothing. If this is by design for "free questions," the labeling is confusing -- the Q&A card shows both "Free question" AND "Paid" tags simultaneously. If it's a bug, it's a trust-destroying one.
- **Expected Behavior**: Either (a) payout should reflect the expert's Q&A rate for paid questions, or (b) "free" questions should not show "Paid" tags, and the zero payout should be clearly explained before claiming.
- **Recommended Fix**: Investigate the question pricing flow. The simultaneous "Free question" label and "Paid" tag on Q&A cards is contradictory. If "Free question" means the DIYer doesn't pay, clarify whether the platform subsidizes the expert payout or if the expert is working for free. Make the economics crystal clear before claim.
- **Priority**: Critical

### 3. "Become an Expert" CTA buried in footer -- no expert onboarding path from main nav
- **Issue**: The landing page has no mention of the expert/tradesperson opportunity in the main navigation or hero area. The "Become an Expert" link is only in the footer, in small text next to "About" and "Powered by Claude AI."
- **User Impact**: A tradesperson visiting this site for the first time (e.g., from a colleague's recommendation) would see a DIYer-focused landing page and might leave before realizing there's an expert program. The footer link is easily missed.
- **Expected Behavior**: There should be a visible path to expert registration from the main navigation or a secondary CTA on the landing page (e.g., "Are you a tradesperson? Earn money answering questions.").
- **Recommended Fix**: Add an "Earn as an Expert" or "For Pros" link in the top navigation (perhaps in a secondary position after "Find an Expert") and/or add a section on the landing page targeting tradespeople.
- **Priority**: High

### 4. No expert subscription tiers exist (Free/Pro/Premium)
- **Issue**: The system prompt describes evaluating Free/Pro ($29)/Premium ($79) expert tiers, but no such subscription system exists. The Settings page (`/settings`) shows DIYer subscription info (Free plan, 5 reports & 30 messages), not expert-specific tiers.
- **User Impact**: I can't evaluate the ROI of upgrading because there's nothing to upgrade to. There's no queue priority system, no fee reduction tiers, no premium features to differentiate serious experts from casual ones.
- **Expected Behavior**: Expert subscription tiers with clear value propositions (queue priority, lower platform fees, featured profile, etc.).
- **Recommended Fix**: This is a missing feature, not a bug. Build out expert tier system with clear break-even calculations (e.g., "At $15/question, Pro pays for itself after X questions/month").
- **Priority**: High (revenue feature)

### 5. Answer textarea has 2000-character limit and no rich text formatting
- **Issue**: The Q&A answer field is limited to 2000 characters with no formatting options (bold, lists, headers) and no photo/diagram attachment capability. My structural repair answer (joist sistering with 4 numbered steps, code references, tool list, and timeline) barely fit at 1441 characters, and I had to cut corners.
- **User Impact**: As a carpenter answering a structural question, I need to include code references, step-by-step instructions, tool lists, material specs, and safety warnings. 2000 characters forces me to choose between being thorough and being concise. Without formatting, my numbered steps and bold headings render as flat text. Without photo attachments, I can't sketch a diagram for the DIYer.
- **Expected Behavior**: At least 5000 characters, basic markdown support (bold, numbered lists, headers), and the ability to attach 1-2 reference photos.
- **Recommended Fix**: Increase character limit to 5000+. Add markdown rendering for answers (the AI chat already supports rich formatting -- same renderer should work). Add image upload capability for answer attachments.
- **Priority**: High

### 6. No certifications/license field on expert profile
- **Issue**: The expert profile has display name, bio, location, rates, and specialties, but no fields for contractor's license number, trade certifications (EPA 608 for HVAC, journeyman card, etc.), insurance status, or years in business.
- **User Impact**: As a licensed carpenter, my contractor's license is my credibility. Without being able to display it, I look the same as someone who watched a YouTube video and signed up. DIYers can't verify my credentials, which undermines the whole "verified expert" value prop.
- **Expected Behavior**: Fields for license numbers (with optional verification), certifications, insurance status, and years in business, displayed prominently on the public profile.
- **Recommended Fix**: Add a "Credentials" section to the expert profile with fields for license type, license number, issuing state, certifications, and insurance status. Consider a verification badge system where the platform validates license numbers against state databases.
- **Priority**: High

### 7. Expert dropdown menu missing "Dashboard" link
- **Issue**: The expert account dropdown menu (clicking username) shows "My Profile," "Settings," and "Sign Out" but no "Dashboard" link. When navigating to Settings or other pages, there's no quick way back to the dashboard from the dropdown.
- **User Impact**: Minor friction -- I have to click the DIY Helper logo or use browser back button to return to the dashboard. The "Go to Dashboard" button in the expert banner helps, but it's not in the dropdown where I'd instinctively look.
- **Expected Behavior**: "Dashboard" should be the first item in the expert dropdown menu.
- **Recommended Fix**: Add a "Dashboard" item with a home/grid icon as the first entry in the expert dropdown menu in `AuthButton.tsx` (the `isExpert` items array).
- **Priority**: Medium

### 8. Settings page shows DIYer context for expert users
- **Issue**: When an expert navigates to `/settings`, the page shows the DIYer subscription plan (Free, 5 reports & 30 messages) and DIYer navigation (Projects, My Tools, My Questions). The expert banner at the top provides "Go to Dashboard" but the page content is entirely DIYer-focused.
- **User Impact**: Confusing context switch. I went to Settings expecting to see expert settings (payout preferences, notification settings, Stripe account status) and instead saw DIYer subscription info that's irrelevant to my expert workflow.
- **Expected Behavior**: Expert users should see expert-specific settings, or the Settings page should have separate sections for DIYer and Expert settings.
- **Recommended Fix**: Create an expert-specific settings section at `/experts/dashboard/settings` or add an "Expert Settings" tab/section to the existing Settings page when the user is an expert.
- **Priority**: Medium

### 9. No photo upload on expert profile
- **Issue**: The expert profile uses a letter avatar (M for Mike) with no option to upload a profile photo.
- **User Impact**: In my trade, people hire people they trust. A real headshot builds trust far more than a letter in a circle. Every other platform (HomeAdvisor, Thumbtack, Angi) lets me upload a photo.
- **Expected Behavior**: Profile photo upload with a recommended minimum size.
- **Recommended Fix**: Add an image upload field to the expert profile form with crop/resize functionality.
- **Priority**: Medium

### 10. Embeddable badge shows "0 questions answered" after answering a question
- **Issue**: The embeddable badge on the expert profile page still shows "0 questions answered" immediately after I submitted an answer to a Q&A question.
- **User Impact**: Minor -- probably a caching or accepted-answers-only count issue. But if I embed this badge on my website, I want it to reflect my activity accurately.
- **Expected Behavior**: Badge should update in near-real-time after answering questions, or at least clarify if it only counts accepted/paid answers.
- **Recommended Fix**: Check the badge API endpoint to ensure it counts all answered questions (not just accepted/paid ones), or add a note explaining what counts.
- **Priority**: Low

### 11. Sign-in modal causes Chrome extension screenshot failures
- **Issue**: When the sign-in modal opens, Chrome browser automation tools (screenshots, clicks, JavaScript execution) all fail with "Cannot access a chrome-extension:// URL" errors. The entire tab becomes inaccessible until the modal is dismissed.
- **User Impact**: This is a testing tooling issue, not a user-facing bug. However, it prevented me from capturing the login flow visually and forced me to use a workaround (JavaScript-based Supabase auth).
- **Expected Behavior**: Modal should not interfere with browser automation tools.
- **Recommended Fix**: This may be related to how the Modal component renders (possibly a focus trap or portal rendering that confuses Chrome extension messaging). Low priority since it only affects automated testing.
- **Priority**: Low (testing tooling only)

---

## AI Response Quality

### Technical Accuracy in Carpentry Domain: 9/10

**Question 1: Load-bearing wall identification and removal**
- Correctly identified joist direction as the primary indicator
- Accurate table of load-bearing wall signs with appropriate confidence levels
- Correctly emphasized permits, structural engineer, and temporary shoring
- Strong safety warnings throughout
- Minor gap: could specify beam type recommendations by span (LVL vs steel thresholds)

**Question 2: 14-foot beam sizing for second-floor load**
- Accurate LVL beam size recommendations (3-ply and 4-ply 1.75"x14" LVL)
- Correct steel I-beam alternatives (W8x31, W10x26)
- Properly identified post and foundation requirements
- Appropriate cost ranges
- Correctly and repeatedly stated that engineer must confirm sizing
- Excellent practical consideration of beam depth vs ceiling height trade-offs

**Question 3: Deck ledger board attachment through vinyl siding**
- Immediately and emphatically said DO NOT attach through vinyl siding -- correct
- Referenced IRC Section R507.2.3 -- correct code citation
- Excellent flashing stack-up diagram (ASCII art showing layer order)
- Correct ledger sizing recommendation (2x10 for 12x16 deck)
- Proper fastener specifications (1/2" lags, staggered pattern, pre-drill)
- Critical ACQ-treatment / galvanized fastener warning -- trade-level knowledge
- Pro tips included butyl tape, band joist inspection, threshold clearance

### Safety of Advice: 9.5/10
- Every structural question included strong "hire a structural engineer" guidance
- Permit requirements were emphasized as "non-negotiable"
- The "Want expert confirmation?" callouts with links to verified experts were well-placed
- The AI appropriately flagged limitations of remote advice for structural questions
- No unsafe advice detected in any response

### Code Compliance Awareness: 9/10
- Referenced IRC R502.8 (joist notching) in the Q&A question context
- Referenced IRC R507.2.3 (ledger attachment) in deck response
- Cost estimates included permit fees
- Mentioned local code variation and AHJ verification
- Could improve by mentioning IRC R507.2.4 (lateral load connections for ledger-attached decks)

### Appropriate Scope Recognition: 10/10
- Every response that involved structural decisions recommended hiring a professional
- The "Ask a verified expert" callouts created a natural bridge to the platform's expert Q&A service
- Never overstepped into specific engineering calculations without disclaimers
- Appropriate for a DIYer audience: enough detail to understand the work, but clear on when to hire a pro

---

## ROI Assessment

As Mike the Carpenter, would I continue using this platform? **Conditionally yes -- but the money flow needs to work.**

**The positive:**
- The Q&A claim-and-answer flow is fast and frictionless
- Questions in the queue are real carpentry questions with enough detail to write good answers
- The 2-hour claim window creates healthy urgency without being stressful
- The AI's carpentry advice is genuinely good -- it's not giving dangerous advice that I'd need to correct
- The expert banner and "Go to Dashboard" button make switching between DIYer and expert views easy
- The notification system correctly alerted me to a new carpentry question

**The blockers:**
- I answered a detailed structural question and saw $0.00 payout. If the platform doesn't pay me, there's no ROI calculation to make.
- No subscription tiers means no path to increased earnings or priority access
- Without certifications on my profile, I can't differentiate myself from less qualified "experts"
- The 2000-character answer limit forces me to give inferior answers

**Break-even math (if payouts work):**
At $15/question and ~10 minutes per answer, that's $90/hour equivalent. Not bad. But I bill $75/hour for real work, so this only makes sense if I can answer questions during downtime (waiting for materials delivery, rainy days, evenings). If I could answer 3-4 questions per day during downtime, that's $45-60/day or $900-1200/month in supplemental income. Worth it if the volume is there.

---

## What's Working Well

1. **Expert dashboard layout** -- Clean, shows the right metrics at a glance (earnings, questions, reviews). The 6-card stat layout is efficient.
2. **Q&A Queue trade filters** -- The Carpentry filter correctly showed only carpentry questions. Filter tabs are easy to scan.
3. **Claim-and-answer flow** -- Smooth one-click claim, clear 2-hour timer, simple answer form, instant submission. The mechanics are right.
4. **Notification system** -- Correctly notified me of a new carpentry question. Clicking the notification took me directly to the Q&A Queue.
5. **Expert banner on DIYer pages** -- The "Welcome back, Mike the Carpenter" banner with "1 open question" and "Go to Dashboard" button is an excellent bridge between the two user contexts.
6. **AI response quality** -- Genuinely impressive carpentry knowledge. Correct code references, appropriate safety warnings, good use of tables and formatting. The "Ask a verified expert" callouts naturally bridge to the platform's expert Q&A service.
7. **Public expert profile** -- Clear layout with rates, specialties (with years), location, and prominent CTAs for contacting the expert and asking paid questions.
8. **Embeddable badge** -- Nice feature for experts to promote their platform presence on their own websites.
9. **Charge on Claim banner** -- Clear explanation of the payment/refund mechanics before claiming a question.
10. **Zero console errors** -- No JavaScript errors observed throughout the entire testing session.

---

## GIF Recordings

- `carpenter-expert-full-sweep.gif` -- 50 frames covering dashboard, Q&A queue, claiming a question, writing an answer, profile page, messages, settings, and chat roleplay with 3 carpentry questions.
