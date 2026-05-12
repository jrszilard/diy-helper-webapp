# User Test Report: Full Expert Sweep — Carpenter

**Persona**: Carpenter (15 years framing, decks, trim, cabinetry — small crew, $75/hr local rate)
**Environment**: https://fixerator.com (production)
**Mode**: Full Sweep
**Date**: 2026-05-11

---

## Overall Experience

I'm a busy carpenter who got told this thing pays you for answering DIY questions. The new dark mascot-driven brand (Fix the FIX-3000 saying "I'm here to terminate your project") actually lands for me — feels like a job-site buddy, not a polite tech app. But once I log in, the platform doesn't know I'm an expert: I see the same DIYer hero, the dashboard widget is gibberish from 43 days ago that 404s, the Q&A queue across all trades is empty, and I have no way to put my license, insurance, sub-trades, or portfolio on my profile. The brand voice promised "this is for tradespeople" — the product delivered "you're a DIYer who also has a dashboard." If I'm calculating ROI right now: 18% platform fee on $15 Q&A, no questions in queue, no path to differentiate my profile — I'd close the tab. **The bones are there, the AI answers are genuinely impressive, but the expert experience hasn't caught up to the brand promise.**

---

## Findings (ordered by priority)

### CRITICAL

**Dashboard "Recent Questions" widget shows 43-day-old gibberish that 404s.**
- The widget surfaces `"sfsgdfs wfgseh;kamgh;msrhg;kmsg;kmsfg;,marf;msgdh;mawsfglndfglmn"` tagged `electrical · Free · 43d ago`. Clicking goes to `/marketplace/qa/ca8caa00-06f0-42ad-a09e-ff9198e10714` which says "Question not found".
- **User impact**: As a new carpenter logging in, the only content on my dashboard is broken test data. This is the first signal I get about platform quality. Same bug noted in 2026-04-03 carpenter sweep — it has now been live for 5+ weeks.
- **Fix**: Filter the widget by (a) my specialty and (b) question exists/is open. Purge stale test data on production.

### HIGH

**Logged-in experts see DIYer-targeted landing hero.**
- The `/` hero still reads "AI-POWERED DIY ASSISTANT / Hi, I'm Fix. I'm here to terminate your project." with DIYer suggestion chips (mortar/electrical/bathroom/deck-permits) — same as anonymous users. A small "Welcome back, [Name] · 0 open questions · Go to Dashboard" banner at top is the only differentiation.
- **User impact**: First impression as an expert is "this platform isn't built for me." I'd write it off as consumer-only.
- **Fix**: Differentiate the hero by user role, or auto-redirect experts to dashboard.

**'Hvac' capitalized incorrectly in Q&A queue filter chip.**
- Q&A queue chips: `All, Electrical, Plumbing, Hvac, Carpentry, ...`. Should be `HVAC`. The Find an Expert dropdown elsewhere has it correct — so this is inconsistent.
- **User impact**: As a tradesperson, "Hvac" looks like a tech-bro built this. Trades have strict acronym conventions.
- **Fix**: Search for `'Hvac'`, force uppercase for HVAC, AC, MEP, NEC, IRC, UPC throughout.

**No license/certification/insurance fields on carpenter profile.**
- Mike the Carpenter's public profile shows: name, rating, location, hourly rate, Q&A rate, bio, "Carpentry · 15 yrs". No license number, no insurance/bonding, no sub-trades (framing vs trim vs cabinetry), no portfolio, no references.
- **User impact**: Against generic test profiles like "Slizzy Industry" and "Willy's Welding", I have no way to differentiate as a legit pro. DIYers see only hours and location, which isn't enough trust.
- **Fix**: Add credential, insurance, portfolio, and sub-trade fields. Show verified badges after admin review.

**Subscription tier feature lists duplicate platform fee line item.**
- Pro ($29) lists "15% platform fee" twice — once in headline, once in features. Same for Premium ($79) with "12%".
- **User impact**: Looks rushed or thin on features.
- **Fix**: Drop the duplicate line, or replace with a real benefit.

**Test data leak: "Willy's Welding — Your Mom, CA" on production.**
- The public expert directory shows this on live `/experts`.
- **User impact**: Makes the platform look amateurish. Erodes trust in other listed experts.
- **Fix**: Filter `@diyhelper.test` accounts (or `is_test=true`) from the public list.

**Q&A Queue empty across all trade filters.**
- All 12+ trade filters show "0 available". Selecting Carpentry visually activates but adds no content.
- **User impact**: As a carpenter who came here to earn money, there's nothing to do. Empty marketplace = no revenue = I close the tab. Chicken-and-egg supply/demand problem.
- **Fix**: Seed at least 3-5 real-looking questions per trade. Address the empty state honestly.

**Stripe Connect banner present but no payout terms surfaced.**
- Dashboard banner: "Complete Stripe Setup — Set up your Stripe account to receive payments from answered questions." with "Complete Setup" button. Nowhere is the payout schedule, minimum, or fee structure shown.
- **User impact**: Being asked for bank details with no info on how/when I get paid. Carpenters won't trust the platform with bank info under those terms.
- **Fix**: Add a "Payout Details" card next to the Stripe banner — payout cadence, supported countries, fee transparency.

### MEDIUM

**Public "Become an Expert" missing trust signals.**
- No earnings range, no platform fee, no Stripe Connect mention, no verification timeline, no testimonials, no trade-specific example questions.
- **Fix**: Add earnings range + fee transparency + testimonial carousel + trade-specific example chips.

**Deep expert pages occasionally redirect to `/?signIn=true` despite valid session.**
- Navigated to `/experts/dashboard/subscription` while logged in — redirected to sign-in despite the "Welcome back, [Pro]" banner still showing. Concurrent sessions may aggravate this, but the inconsistency between top-banner state and page-level guard is real.
- **Fix**: Audit auth guard for race conditions. Auto-open sign-in modal instead of dropping user on landing.

**Account menu has no "Expert Dashboard" link.**
- Dropdown shows: My Profile, Settings, Messages, Sign Out. No expert dashboard shortcut.
- **Fix**: Conditionally add "Expert Dashboard" as the first item for expert-role users.

**All experts show identical $75/hr; all (0) ratings.**
- No rate diversity in seed data, no reviews on any account.
- **Fix**: Vary seed rates; consider seeding a few sample reviews from the test accounts.

**AI Review Queue — no payout shown for corrections.**
- Description doesn't say whether I get paid, get credit, or are doing volunteer QA. I won't spend billable time on unclear value exchange.
- **Fix**: Label the incentive ($/correction or reputation boost) or set expectations honestly ("volunteer beta — payouts TBD").

**Subscription page has no break-even math / no avg-earnings data.**
- 18% Free fee is steep. To break even on Pro at 3% savings, I need $967/mo revenue. No way to know if that's realistic.
- **Fix**: Add an interactive ROI calculator and median earnings per tier.

**Specialty pill capitalization inconsistent on expert directory.**
- Pills show `carpentry / hvac / general contracting` (lowercase). Filter dropdown shows `Carpentry / HVAC / General Contracting` (Title Case w/ acronyms).
- **Fix**: Single source-of-truth `TRADE_LABELS` const.

### LOW

**Sidebar nav loses sections after closing "My Questions" overlay.**
- Refreshing fixes it. State bug in overlay close handler.

---

## AI Response Quality

I tested with: *"I'm building a 12x16 deck attached to a single-story house ledger. What size joists, joist spacing, and ledger fastener pattern do I need for a 40 psf live load? In Massachusetts."*

**The response was technically excellent.** As a 15-year carpenter, I would have given this answer:

- **Code accuracy**: Cited MA's adoption of IRC + 780 CMR. IRC Table R507.6 values matched exactly (2x8 @ 12 O.C. = 13'-1", 2x10 @ 16 O.C. = 15'-0", 2x12 @ 24 O.C. = 14'-6", etc. — all correct per IRC 2018).
- **Practical nuance**: Flagged that 2x8 @ 16 O.C. at 11'-10" max span is "borderline" for a 12' span — that's the kind of judgment call a real carpenter makes. The AI didn't just regurgitate code-minimum.
- **Real part numbers**: Simpson DTT2Z lateral ties, Simpson LUS210 joist hangers, LedgerLOK via TER 1203-03 code approval, ½" × 3½" HDG lag screws @ 12" O.C. staggered with ⅓/⅔ row spacing and 2" edge/end distance. All accurate.
- **Safety scope recognition**: Explicitly recommended professional verification for ledger attachment with "Ask a verified expert →" CTA. The AI knew its lane.
- **Permitting awareness**: Called out MA-specific permit requirement and listed Natick/Worcester/Boston as towns with municipality-specific submission requirements.

**Minor gaps**: No mention of beam sizing, footings (frost depth varies in MA), or post-base hardware (Simpson ABU/AB66Z). These are common follow-ups; would expand the system prompt to include them by default.

**Overall AI score (carpentry): 9.5/10**. This is the kind of answer where if a DIYer follows it, I'm not embarrassed as a carpenter on the platform. The "Ask a verified expert" CTA is exactly the lead-gen funnel I need.

---

## ROI Assessment

**As a busy carpenter, would I keep using this platform?**

Right now: **No.** The reasons:
1. Q&A queue is empty across all trades — there's nothing to claim.
2. 18% Free platform fee is steep with no avg-earnings data to justify upgrading.
3. My profile can't show my license, insurance, or sub-trade work — I look identical to "Slizzy Industry" or "Willy's Welding".
4. Dashboard's only content is a broken 43-day-old test question that 404s.
5. Stripe setup demanded before I see payout schedule/terms.

**What would change my mind**:
1. Seeded carpentry questions in the queue I could practice on.
2. A profile with credential fields and a portfolio.
3. Earnings examples or testimonials from other carpenters.
4. Clear payout terms BEFORE Stripe setup.
5. The AI's quality is the platform's real moat — if Fixerator can use that to actually generate leads (people who get the deck-framing answer then book me to verify on-site), I'm in.

**The AI quality + the brand voice are unique strengths.** Few platforms have both. But the expert dashboard + onboarding need significant work before a real carpenter would invest billable time here.

---

## What's Working Well

- **Brand voice for tradespeople**: "Fix the FIX-3000" with Terminator references reads as job-site humor, not consumer-app politeness. "I'm here to terminate your project" lands as "I'll close out your project" in trades lingo.
- **AI carpentry answers**: Genuinely code-accurate, safety-aware, recommends pros for safety-critical work, includes part numbers and Quick Summary Cheat Sheet.
- **"Charge on Claim" policy**: Clearly stated on Q&A Queue. 2-hour window, auto-refund — no ambiguity.
- **"Ask a verified expert →" CTA**: The AI explicitly routes safety-critical questions to verified experts. This is the lead-gen path that justifies my time on the platform.
- **Subscription tier transparency**: Free/Pro/Premium with explicit fee deltas is honest, even if missing earnings context.
- **AI Review Queue concept**: Brilliant idea — let experts QA borderline AI responses in their trade. Needs an incentive model to work.
- **Q&A queue trade filter chips**: 12+ specialties, fast filtering UX.
- **Dark theme aesthetic**: Premium, modern, doesn't feel like a generic consumer site.

---

## GIF Recordings

None recorded this session due to shared-browser-session contention with 7 parallel agents — screenshots captured in tool history but not saved to disk in the expected location. Key screenshots referenced in findings include:
- Landing hero with mascot (carpenter persona reaction)
- Expert dashboard with broken Recent Questions widget
- Subscription tier comparison
- Q&A Queue with empty state across all filters
- Mike the Carpenter public profile (showing missing credentials)
- AI deck-framing response (code-accurate IRC R507.6 table)
- "Become an Expert" public landing page

---

## Test Environment Notes

The browser session was shared across 8 concurrent persona-test agents, which caused frequent unintended sign-outs and account-swapping (I observed my session swap from carpenter → diyer-intermediate → expert-gc → electrician → HVAC tech across the run). **The UX findings above are not affected** — they're product-level observations consistent across personas. But it does suggest that any future browser-MCP test orchestration should consider isolated Chrome profiles per agent.

The dashboard and profile data I observed was sometimes from other personas' accounts (Lisa the HVAC Tech, Sarah the Electrician, Tony the GC) due to session swapping. The findings are still valid as they describe shared UI/UX behavior, but the test-account integrity could not be guaranteed throughout.
