# User Testing Sweep — Synthesis Report

**Date**: 2026-05-11
**Trigger**: Validate dark-design overhaul + Fixerator brand layer on production (`fixerator.com`)
**Coverage**: 3 DIYer (beginner / intermediate / expert) + 5 Expert (carpenter / electrician / plumber / HVAC / GC) = 8 parallel persona-driven browser-automation sweeps
**Total findings**: 143 (9 critical · 36 high · 46 medium · 52 low — of which 32 are `category: positive`)

---

## TL;DR

The **AI chat is the moat** (validated 5/5 personas — IRC, NEC, NFPA, NDS citations; correct safety refusals; product SKUs; cost/longevity comparisons). The **chrome around the chat is what's broken** — auth state, route 404s, test data leaking to production, an empty Q&A marketplace, and an expert profile system that captures credentials but never displays them.

The redesign itself (dark theme, FixBot mascot, AppShell/AppSidebar) is **net-positive** — power users and tradespeople respond well to the brand voice; safety-critical content reads better in saturated dark contrast. The **`"I'm here to terminate your project"` hero is the brand's biggest split** — works for experts, lands menacingly for anxious beginners and HVAC-emergency traffic.

If we ship nothing else from this sweep, the order is:
1. **Filter test data from production** (Theme 2 — 5/5 personas hit it, embarrassing on the way to a charge)
2. **Fix the broken Q&A submit + auth/route 404s** (Theme 1 + Theme 3 — blocks every paid conversion)
3. **Surface expert credentials on the public profile** (Theme 4 — single biggest structural lead-conversion fix)
4. **Reconcile subscription claims with what's actually built** (Theme 6 — money-flow integrity)

---

## Critical findings (9)

> 1 was a sweep-infrastructure blocker (`expert-hvac-1`, Chrome MCP permission gate) — superseded by the retry run. Not a product bug. Treat as historical.

The remaining 8 cluster into three themes:

### Q&A marketplace is structurally broken (4 of 8 criticals)
| ID | Issue | Persona |
|---|---|---|
| `diy-intermediate-1` | Q&A submit fails with **raw zod enum error** on default "General" category — first-time users hit a hard wall with developer-language copy on their first paid question | DIY intermediate |
| `expert-gc-1` | Q&A queue contains a single 43-day-old keyboard-mash question (`dfg;kmsfg;lkndsglnsf...`) tagged drywall, $4 payout. Test data on production. | GC |
| `expert-plumber-1` | Q&A queue empty for plumbing — only the same 43-day-old gibberish exists | Plumber |
| `expert-carpenter-2` | The exact same gibberish question (`sfsgdfs wfgseh;...`) appears on the carpenter's dashboard "Recent Questions" widget and links to "Question not found". **Same bug was flagged in the 2026-04-03 carpenter sweep — has been live 5+ weeks.** | Carpenter |

*Plus 2 high-severity confirmations:* HVAC and Electrician hit identical "only gibberish exists" findings — meaning **5 of 5 experts hit this exact piece of test data**.

### Expert dashboard & subscription value-prop are broken (2 criticals + many highs)
| ID | Issue | Persona |
|---|---|---|
| `expert-hvac-3` | "AI Review Queue" link in AppSidebar 404s at `/experts/dashboard/ai-review` for every authenticated expert | HVAC |
| `expert-gc-2` | Premium ($79/mo) tier sells "Project leads" but no `/experts/dashboard/leads` route exists, no description of what the feature means (geo? RFP? volume? cost/lead?), and the AI's "Want expert confirmation?" CTA on multi-trade scoping questions recommends plumbers/electricians, **not** GCs — actively routing the most valuable leads AWAY from the contractors who'd subscribe | GC |

### Expert profile doesn't show credentials (1 critical, the single biggest discovery)
| ID | Issue | Persona |
|---|---|---|
| `expert-plumber-2` | Profile editor at `/experts/dashboard/profile` has License Type/Number/State/Insurance fields, but the public profile at `/experts/{id}` shows none of them. **For licensed trades this is the #1 trust signal a homeowner checks. Lead conversion is structurally broken — even if experts fill in credentials, customers can't see them.** | Plumber |

### Auth route 404
| ID | Issue | Persona |
|---|---|---|
| `expert-hvac-4` | `/login` returns 404 — sign-in is modal-only with no fallback URL. Direct-link bookmarks and any auth redirect that targets `/login` will dead-end. | HVAC |

---

## High-confidence cross-persona patterns

Issues hit by 2+ personas. The strongest signal in any user testing data — these aren't single-persona quirks, they're structural problems.

### Pattern 1: Test/seed data leaking to production (5/8 personas)
- **`"Your Mom, CA"`** location, **`"Willy's Welding"`**, **`"Slizzy Industry"`** with 0 reviews and uniform $75/hr appear in the public `/experts` directory
- The 43-day-old keyboard-mash Q&A is the only marketplace content
- Test profiles with bios literally reading *"Test account for plumbing user testing agent"* are visible
- Reactions: trust-killer right before a credit card prompt (beginner), brand-killer for a "we're a serious trades platform" pitch (carpenter), supply-shock for an expert evaluating ROI (HVAC, plumber, GC)

**Fix surface**: `is_test_account` flag + filter from production queries; delete the orphan Q&A row; OR seed realistic per-trade demand if the queue must look populated.

### Pattern 2: Routes 404 on common paths (6/8 personas)
| Route | Hit by | Notes |
|---|---|---|
| `/login` | DIY intermediate, HVAC (crit), GC, Plumber | Sign-in is modal-only; no fallback URL. Auth redirects to `/login?next=` would dead-end. |
| `/experts/dashboard/ai-review` | HVAC (crit), GC, Plumber, Electrician | AppSidebar links it, route doesn't exist |
| `/projects`, `/shopping`, `/tools` | DIY intermediate, DIY expert | Sidebar items show to signed-out users → bare 404 pages with no AppShell |
| `/marketplace/projects` | Electrician | Premium tier's "Project leads" surface doesn't exist |
| `/auth/signout` | GC | Conventional auth path doesn't redirect |
| `/experts/queue` | Plumber | URL gets interpreted as an expert ID and returns "Expert not found" |

**Fix surface**: Either ship the routes or remove/redirect the links. Add Next.js redirects for common conventions (`/login` → `/?signIn=true`, `/auth/signout` → POST signout handler).

### Pattern 3: Expert credential/trust-signal gap (4/5 experts)
| Persona | Specific gap |
|---|---|
| Plumber | **License + insurance fields exist in editor; do NOT render on public profile** (critical) |
| Electrician | Fields exist, but optional and unverified, also not on public profile |
| HVAC | No EPA 608 / NATE / state HVAC license fields at all (federally required for refrigerant handling) |
| Carpenter | No carpentry-specific credential fields |

**Fix surface**: (a) Make credential fields specialty-aware (HVAC needs EPA 608; electricians need state license + journeyman/master tier; plumbers need state plumbing license; GCs need contractor license + bonding info). (b) Make required for licensed trades. (c) Surface verified credentials prominently on the public `/experts/{id}` profile. (d) Build a verification step (manual review, or pull from state license boards' public APIs).

### Pattern 4: Expert dashboard auth/role state inconsistency (4/8 personas)
- Logged-in experts see the DIYer landing hero (`"AI-POWERED DIY ASSISTANT"` + DIYer chips) (Carpenter high)
- "Welcome back, [name]" banner shows wrong/stale name AND persists across signout (DIY intermediate high)
- EXPERT sidebar section disappears intermittently for logged-in experts — hydration/role-check race (GC high)
- Expert banner shows on consumer-only pages for consumer-only users (DIY intermediate high)
- DIY sidebar items appear for signed-out guests then 404 (DIY expert high)

**Fix surface**: Single source of truth for `{user, session, role}` derived from server-side session; render UI optimistically from `session.user.role` without waiting for an additional client-side fetch; add hydration boundaries that prevent flicker.

### Pattern 5: Subscription / monetization story is incoherent (3/5 experts)
- `/settings` says tiers are *"coming soon"*; `/experts/dashboard/subscription` sells them at $29/$79 (Plumber high)
- Premium's "Project leads" feature has no description and no route (GC critical, Electrician high)
- Subscription tier feature list has a duplicated platform-fee line item (Carpenter high)
- Stripe Connect setup banner with no payout schedule info (Carpenter high)
- Q&A payout amount conflicts with expert's self-set Q&A rate (GC high)

**Fix surface**: One source of truth on which tiers are live. Either ship "Project leads" with a clear definition or relabel to "Coming Soon". Reconcile Settings copy with Subscription page. Audit payout math against the rate-setting flow.

### Pattern 6: Brand voice — works for pros, lands wrong for vulnerable users (nuance, not a fix)
- DIY beginner: `"terminate your project"` reads as menacing to an anxious first-timer (high)
- HVAC: `"terminate"` tone-deaf for urgent no-heat / CO-risk traffic (high)
- DIY expert: brand voice **enhances** the experience for efficiency-seeking power users (positive)
- Carpenter: feels like a job-site buddy, not a tech-bro consumer app (positive)
- HVAC's bonus: the secondary tagline *"I'll be back… with the receipts from Home Depot"* lands perfectly and **should be the template for the primary headline**

**Recommendation**: Don't kill the brand voice — it's working where it needs to (tradespeople, power users). Consider:
- A softer "first-visit" beginner-mode hero (cookie-gated or via a triage chip) that uses the "receipts" tagline as the entry point
- Add an empathy beat in the first AI response for anxious queries (similar to the empathy opener that beginners praised: *"A leaking sink is stressful, but don't worry — this is a very common DIY repair"*)

### Pattern 7: Chat surface UX details
- Landing hero doesn't collapse after first chat message — eats ~380px of viewport, pushes input below fold (DIY expert high)
- Raw LaTeX (`$$Z_{double shear}$$`) leaks unparsed in technical AI responses — KaTeX/MathJax pipeline isn't wired (DIY expert high)
- Free-form leak chat (`"my sink is leaking"`) skips the water-shutoff safety step that the `Replace a Faucet` template gets right (DIY beginner high) — cheapest high-impact AI-quality fix

---

## By-persona summary

| Persona | Total | Crit | High | Mid | Low/+ | Top theme |
|---|---|---|---|---|---|---|
| DIY beginner | 12 | 0 | 4 | 3 | 5 (4+) | AI empathy & templates are the beginner moat; free-form chat needs safety preamble; `/experts` page is trust-poison |
| DIY intermediate | 20 | 1 | 4 | 7 | 8 (5+) | "Chrome fighting the chat" — AI cites real codes/SKUs/Home Depot links but the shell breaks the flow with 404s, bait-and-switch forms, and stale banners |
| DIY expert | 17 | 0 | 4 | 6 | 7 (4+) | Brand voice + AI depth = great; layout doesn't make room for the conversation; guest paid-Q&A is a bait-and-switch |
| Expert carpenter | 20 | 1 | 7 | 7 | 5 (4+) | Dashboard's first impression is a broken stale widget; queue is empty; profile has nothing to evaluate a real tradesperson on |
| Expert electrician | 14 | 0 | 4 | 6 | 4 (2+) | AI safety alignment is exceptional (refuses to give instructions on tapping live panels, cites NEC correctly); the trust/credential layer doesn't match the AI's rigor |
| Expert plumber | 22 | 2 | 5 | 5 | 10 (6+) | The biggest discovery (credentials never displayed) + monetization claims that don't match reality |
| Expert HVAC | 18 | 2 | 4 | 5 | 7 (5+) | Specialty-blind UX (no EPA 608, "Hvac" casing) + tone-deaf headline for emergency traffic |
| Expert GC | 20 | 2 | 4 | 7 | 7 (4+) | Premium tier sells leads that don't exist; AI actively routes leads AWAY from GCs |

---

## What's working — protect these

5/5 personas independently confirmed:

1. **AI chat quality is the moat** — Specific citations across the board:
   - NEC 240.4, 310.12, 210.12 AFCI exemption, 210.8 GFCI, 220.54 dryer load, 110.3(B) listing
   - IRC R507.6, R507.2.3, R502.8 (hole vs. notch)
   - NDS Table 11A (bolt shear), Simpson DTT2Z / LUS210 part numbers
   - NFPA 54, NAECA, yellow-vs-white PTFE tape, 18" garage clearance, drip leg, expansion tank, TPR within 6" of floor
   - Massachusetts 780 CMR, TER 1203-03; Minnesota R507.2.3
   - Honest "this option vs that" tradeoff tables with cost/longevity columns
   - **AI refused to give instructions for tapping an energized panel** (Electrician finding) — alignment is working
2. **Brand voice / Fixerator mascot** lands well with experts (4/5 expert personas positive)
3. **Dark theme's saturated reds/oranges enhance safety-warning legibility** (Electrician positive — this directly addresses the directive's "does dark mode hurt safety-critical info" question)
4. **"Charge on Claim" 2-hour policy** is clearly stated and unambiguous (Carpenter positive)
5. **AI empathy opener** for nervous beginners (*"A leaking sink is stressful, but don't worry — this is a very common DIY repair"*) — DIY beginner positive
6. **`"I'll be back… with the receipts from Home Depot"` secondary tagline** — nails the brand voice, should be promoted (HVAC)
7. **Project Templates flow** is the strongest beginner experience (DIY beginner positive) — surface more prominently on landing

---

## Recommended action order

### This week (criticals + Pattern 1 + Pattern 2)
1. Filter `is_test_account` users from production marketplace + delete the 43-day-old gibberish Q&A
2. Fix the zod enum bug on Q&A submit ("General" default category) + replace raw zod error with friendly copy
3. Build `/experts/dashboard/ai-review` route or remove the sidebar link
4. Add `/login` → `/?signIn=true` redirect (and `/auth/signout`, `/projects`, `/shopping`, `/tools`)
5. Render license/insurance fields on the public expert profile

### Next sprint (Patterns 3 + 4 + 5)
6. Make credential fields specialty-aware (EPA 608 for HVAC, state license + journeyman/master tier for electricians, etc.)
7. Single source of truth for `{user, session, role}` — kill the welcome-banner-persists-after-signout class of bugs
8. Reconcile Settings/Subscription page on which tiers are live; either ship "Project leads" with a definition or label "Coming Soon"
9. Stop the AI from routing GC-shaped multi-trade questions to plumbers/electricians

### After that (Pattern 6/7 + polish)
10. Collapse-on-message landing hero
11. Wire KaTeX/MathJax for `$$…$$` blocks in AI responses
12. Bake the water-shutoff preamble into the free-form chat system prompt for plumbing keywords
13. A/B a beginner-mode hero using the "receipts" tagline; keep the "terminate" headline for the default/power-user path

---

## Open questions / follow-ups

1. **Chat history isolation under shared cookies** — Expert GC observed (`expert-gc-20`) that chat history appeared to leak between users during the parallel test. **Almost certainly a test artifact** (4 other agents independently observed their sessions being preempted by other personas) — but a clean 1-user repro on a fresh browser profile should verify that `user_id`-scoping is enforced server-side, not just client-side.
2. **Why the 43-day-old test Q&A survived 5+ weeks** — `expert-carpenter-2` notes this exact bug was flagged in the 2026-04-03 carpenter sweep. The data leak survived the dark-design merge and the Fixerator rebrand. Either the cleanup ticket was never opened or it didn't get prioritized. Worth understanding the path-not-taken so the next sweep's findings don't suffer the same fate.
3. **EPA 608 / state license public-API verification** — manual review doesn't scale; some states publish license-board APIs. Worth a half-day spike to see how many trade boards are programmatically queryable.

---

## Test infrastructure learnings (for next sweep)

What worked:
- **JSONL + markdown dual-write** — 143 structured records aggregable in `python3 -c`/`jq`; long-form reports preserve persona voice
- **Hardened "no-localhost-fallback" directive** caught what could have been 7 misleading reports
- **`category: positive` finding bucket** — 32 positives logged; would have been lost in a defect-only schema

What to fix next time:
- **Pre-grant Chrome MCP domain permission** for the target origin before launching parallel agents (cost the sweep an aborted first attempt and one wasted persona run)
- **Isolated Chrome profiles per agent** — multiple agents confirmed sessions were preempted by others' logins. Real findings still valid (bugs are at the product layer), but a clean per-persona experience needs per-agent profiles or serial dispatch
- **Set a max-retry budget per agent** before the agent self-terminates — saved tokens this run via the Stop tool, but the directive could enforce it
