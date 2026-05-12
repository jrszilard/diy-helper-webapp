# User Test Report — HVAC Expert (full sweep)

- **Persona**: Lisa the HVAC Tech (test-expert-hvac@diyhelper.test) — Minneapolis-based, 15 years experience, EPA 608 Universal, NATE-certified residential
- **Environment**: https://fixerator.com (production)
- **Sweep date**: 2026-05-12
- **Mode**: Full sweep (registration touch, dashboard, Q&A queue, profile, public profile, subscription tiers, AI chat with two HVAC-domain questions)

## Overall Experience

The platform has serious technical chops on the AI side — both HVAC questions I tested returned answers I'd be comfortable handing to a customer as a starting point. But the expert-side product is half-built: the Q&A queue is empty, a sidebar nav link 404s, my profile has no field to display the EPA 608 cert that legally lets me touch refrigerant, and the headline mascot copy ("I'm here to terminate your project") is tone-deaf for the kinds of urgent no-heat / no-A/C searches that drive most HVAC traffic. As an HVAC tech evaluating whether to bring my time here, I'd be in a holding pattern: come back in 30 days, check whether HVAC question volume has appeared, and decide then. Today there is zero earnable inventory in my specialty.

## Findings (highest priority first)

### Critical

1. **AI Review Queue sidebar link 404s.** `/experts/dashboard/ai-review` returns Next.js 404, but the sidebar link is shown to every authenticated expert. A new expert clicking the link in their first session immediately loses trust. Either ship the route or remove the link.

2. **`/login` returns 404.** Sign-in is modal-only. Direct navigation to `/login` (a common bookmark) 404s. Add a route that renders the modal or redirects to `/?signIn=true`.

### High

3. **Mascot copy "terminate your project" misreads for HVAC emergencies.** HVAC traffic skews toward urgent failures — no heat in January, no A/C in July, CO concerns. The Terminator-voiced "terminate" verb pulls in the opposite direction of the trust signal an emergency-state homeowner is looking for. The secondary tagline ("I'll be back… with the receipts from Home Depot") nails the brand voice; the primary headline does not.

4. **Q&A Queue has 1 ancient gibberish question total — zero HVAC.** The only open question in the entire marketplace is keyboard-mash test data tagged `electrical`, 43 days old. Filter by HVAC → "No questions match your filter." There is literally nothing for an HVAC expert to earn on. Either seed the marketplace or set expectations with empty-state copy.

5. **No EPA 608 / NATE / HVAC-specific credential fields on profile.** The profile Credentials section has free-text "License Type" and "License Number" with placeholders matching general contractors. EPA Section 608 is federally required for refrigerant handling — the single most important credential signal for HVAC. No field for it. No NATE, no HVAC Excellence, no brand certs (Mitsubishi Diamond, Daikin Comfort Pro). DIYers asking refrigerant questions cannot tell if I'm legally allowed to answer.

6. **Specialty filter chip says "Hvac" instead of "HVAC".** Acronym title-cased to "Hvac" on the Q&A Queue filter row. Reads as if no tradesperson reviewed the UI copy. Same value is correctly "HVAC" on the expert directory and profile specialty selector — inconsistency.

### Medium

7. **Subscription tier card duplicates the platform fee line.** Pro card lists "15% platform fee" in the header AND as a bullet under features. Same for Premium ("12% platform fee" twice). Forces re-reading to find what's actually different between tiers.

8. **Subscription tier ROI is unanswerable with an empty queue.** Pro saves 3% in fees ($29/mo) → break-even at $967/mo in answered questions. With zero HVAC questions available, every paid tier is negative-ROI. The tier comparison page can't be meaningfully evaluated until there's question volume to compare against.

9. **Sidebar account identity desyncs across tabs.** Observed sidebar displaying `test-expert-carpenter`, `Sarah the Electrician`, and `Tony the General Contractor` in succession on the same tab as parallel agents logged in/out. This was a parallel-agent test artifact, but the same race could happen if a real platform user has multiple Fixerator tabs and one tab logs out. Worth tightening the session storage model (BroadcastChannel sync or tab-scoped session keys).

10. **Mascot illustration crops at right edge of hero on ~1280px width.** One of the mascot's tools/arms appears clipped. Either intentional (looks like a layout bug) or unintentional (is one). On a 13" laptop in a truck cab on LTE I'd assume the page didn't load.

11. **No Stripe Connect explainer before "Complete Setup" CTA.** Black-box payment onboarding. As a tradesperson I want to know fees, payout timing, and what Stripe will ask for BEFORE clicking. A 5-minute intro panel would dramatically increase Stripe completion rates.

### Low

12. **Public expert directory leaks test data.** `/experts` shows "Willy's Welding — Your Mom, CA" alongside real-looking experts. Profane test data exposed to production directory. Hide test accounts or scrub joke values.

13. **Logged-out sidebar is empty real estate.** When signed out, the entire sidebar collapses to just the FIXERATOR wordmark + Sign In button. The Become-an-Expert link only appears in the chat footer. Logged-out HVAC techs evaluating the platform have no clear pro-onboarding path in primary nav.

## Positive findings

14. **AI mini-split sizing response is HVAC-pro-quality.** Manual J-style load breakdown, correct cooling/heating totals, sound 9K BTU recommendation with explicit anti-oversizing warning, real cold-climate model recommendations (Mitsubishi MSZ-FH09, Fujitsu hyper-heat, Daikin Aurora), correct electrical specs (240V 15-20A dedicated, outdoor disconnect within sight), cited Minnesota Mechanical Code Chapter 1346 correctly, named real utility rebate programs (Xcel, CenterPoint, Minnesota Power). Flagged slab edge insulation and air-sealing-before-final-sizing — pro-level callouts. This is the kind of pre-work I'd actually use as a starting point with a customer.

15. **AI furnace short-cycling response correctly escalates CO risk to expert referral.** Ordered diagnostic steps properly (LED flash code first → filter → flame sensor → condensate), called out flame sensor oxidation as #1 cause on 15-yr units, kept DIYers out of gas valve / heat exchanger territory, and prominently flagged "cracked heat exchanger on a 15-year-old furnace is a carbon monoxide risk and not something to DIY" with an inline "Ask a verified expert" link. This is the right triage for life-safety scenarios — and it's the most valuable lead-gen pathway for HVAC pros on the platform.

16. **Expert banner correctly shows specialty-filtered open question count.** "1 open question" on the welcome banner reflected only questions matching the logged-in expert's specialty, not the global queue. Right UX — experts care about THEIR queue.

17. **Secondary tagline pill "I'll be back… with the receipts from Home Depot" nails brand voice.** Joke is in-on-the-trade and lands. Lean into THIS kind of construction-context humor and away from the destructive "terminate" verb in the primary headline.

18. **Profile now has License Type/Number/State and Insurance Status fields** (improvement vs prior sweeps — they used to be missing entirely). Still need HVAC-specific credential fields layered on top.

## AI Response Quality (HVAC lens)

**Technical accuracy**: 9/10. Manual J methodology correct, BTU calculations defensible, model recommendations current, MN code citations accurate, cost estimates within market rates. Two minor nits worth a one-line qualifier: (a) south window solar gain coefficient of 150 BTU/sf is on the high end — typical low-e double-pane is 100-130; (b) the claim that "most 9K units are rated to -13F to -22F" is true only for hyper-heat specific models — standard 9K mini-splits lose 50%+ capacity below 17F.

**Safety of advice**: 10/10. Furnace short-cycling response correctly kept DIYers away from gas valves, heat exchangers, and combustion components. Flagged CO risk specifically by age (15-year unit). Yellow/orange flame → CO risk callout is accurate (steady blue is correct). "Smell of gas → evacuate and call the gas company" is the correct procedure.

**Code compliance awareness**: 9/10. Correctly cited MN Mechanical Code Chapter 1346 for mini-split permitting. Correctly noted variable local enforcement of homeowner installs. Could mention International Mechanical Code (IMC) for non-MN readers but the MN-specific localization was appropriate given my question framing.

**Appropriate scope recognition**: 10/10. Both responses included escalation paths to verified experts at the right moments — sizing complex enough that on-site assessment matters, and combustion safety where DIY ends.

## ROI Assessment

As an HVAC tech with bills to pay, would I continue using the platform? **Not yet — but I'd come back.** The AI is good enough that the lead-generation flow (DIYer asks furnace question → AI triages → "Ask a verified expert" link → I get a paid consultation) is a real revenue model. Today the volume isn't there. If the platform can seed 10-20 real HVAC questions per week in my service area, the math starts to work even on the Free tier. The $79/mo Premium tier is unsellable until I can see at least $1000/mo in question volume in my specialty.

## What's Working Well (summary)

- AI domain expertise is genuinely impressive for HVAC questions — Manual J approach, MN-specific code/rebate localization, real model numbers, CO-risk escalation
- License Type/Insurance Status fields exist (an improvement)
- Specialty-filtered queue count on welcome banner
- Secondary tagline brand voice ("receipts from Home Depot")
- Embeddable expert badge for off-platform marketing
- Dark theme contrast is generally readable

## Screenshots / GIFs

Screenshots were captured during the sweep via the Chrome MCP `save_to_disk: true` parameter and saved to the harness-managed screenshot directory. Key states captured: landing dark hero, signed-out state, login modal, expert dashboard (Free tier, $0 stats), Q&A queue empty state with Hvac filter active, expert profile with credential fields, subscription tier comparison, Lisa the HVAC Tech public profile, Find an Expert directory, expert registration marketing page, AI chat response to mini-split sizing question, AI chat response to furnace short-cycling question.

## Notes on session contamination during this sweep

This sweep ran in parallel with 7 other agents sharing a single Chrome profile. Cookie/localStorage-based Supabase sessions were observed swapping between agents mid-task. The findings above reflect observations of the actual platform UI; the persona-identity assertions ("logged in as Sarah the Electrician" in some screenshots) are an artifact of the parallel-agent environment, not the production behavior real users would see. Where session-leak observations informed a bug filing (finding #9), that has been called out explicitly.
