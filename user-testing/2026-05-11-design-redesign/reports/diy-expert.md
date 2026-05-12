### User Test Report: Fixerator (full sweep) — Expert DIYer

**Persona**: Expert DIYer
**Environment**: https://fixerator.com (production)
**Mode**: Full Sweep — direct to chat, multi-turn technical Q&A, Q&A marketplace, expert profile review, navigation sweep
**Date**: 2026-05-11

---

**Overall Experience**

The AI brain is excellent — exactly the kind of code-literate, structurally-numerate response I want, with NDS table references, real IRC sections, and an honest "here are the tradeoffs" comparison rather than a generic "consult a professional" deflection. I would actually use this. The brand voice ("terminate your project", Terminator parody) works for me — it has personality, signals confidence, and doesn't waste my time with reassurance copy I don't need.

But the surrounding scaffolding is rough: the landing hero refuses to collapse after I start chatting, raw LaTeX leaks into the response, half of my sidebar navigation 404s when I'm signed out, and the Q&A marketplace lets me type a 576-character question before bouncing me to a sign-in wall. There's clearly excellent technical depth wrapped in a UX that has not yet been hardened for users who poke at edges.

---

**Findings** (ordered by priority)

#### 1. Hero block doesn't collapse after first chat message — eats 380px viewport (HIGH)
- **Issue**: After I sent my first message on the landing page, the "Hi, I'm Fix. I'm here to terminate your project." hero with mascot stays pinned above the conversation. On a 1252×952 viewport the hero consumes ~380px before the answer begins.
- **User Impact**: I want my answer to be the focus once we're in conversation — the marketing copy is fine for landing but becomes friction during use. I had to scroll repeatedly to switch between reading the response and typing a follow-up.
- **Expected**: Hero should collapse, shrink to a header bar, or move into the sidebar after the first message.
- **Fix**: Transition from 'pre-chat' to 'in-chat' layout state on first user message in the landing chat component.

#### 2. Sidebar links to /projects, /shopping, /tools all 404 for guests (HIGH)
- **Issue**: AppSidebar shows DIY menu items (My Projects, My Tools, Shopping) even when signed out. Clicking any of them lands on a bare "404 / This page could not be found" page with no sidebar nav, no explanation, no sign-in CTA. The 404 strips the AppShell except the FIXERATOR mark — looks broken.
- **User Impact**: As an expert exploring the app I clicked these expecting either a sign-in or a feature preview. The hard 404 reads as broken navigation and reduces trust.
- **Expected**: Either hide DIY menu links when signed out, OR redirect to /login?next=…, OR keep AppShell visible on 404 with a "Sign in to see your projects" CTA.
- **Fix**: Server-side auth check on these routes that redirects unauthenticated visitors to sign-in.

#### 3. "Ask a Paid Question" submit fails for guests with no upfront warning (HIGH)
- **Issue**: I filled out a 576-character carpentry question on /marketplace/qa and clicked Submit. The form said "Your first question is free! No payment method needed — just ask your question and submit." Submit produced the inline error "Please sign in to ask a question."
- **User Impact**: Wasted ~5 minutes of detailed question composition. Worse, the "no payment method needed" messaging implied no friction; discovering the sign-in gate at submit time was bait-and-switch.
- **Expected**: Either gate the form behind sign-in upfront, or allow guest submission with email verification after.
- **Fix**: Add explicit "Sign in to submit your first free question" notice above the form for guests, OR show the sign-in modal before the user starts typing. Bonus: preserve the typed question across the auth flow.

#### 4. Unrendered LaTeX in AI chat response — `$$Z_{double shear}...$$` (HIGH)
- **Issue**: In the second AI response on the structural-repair conversation, an inline equation appears as raw LaTeX: `$$Z_{double shear} \approx 1.75 \times Z_{single} \approx \mathbf{700-750 \text{ lbs/bolt}}$$`. The rest of the response (tables, ASCII bolt-pattern diagrams) renders fine — but block-math delimiters aren't being parsed.
- **User Impact**: I can still read LaTeX source, but it makes the AI look amateurish. For an audience that values polish, this undercuts an otherwise excellent answer.
- **Expected**: Math renders as formatted equations, or isn't generated at all.
- **Fix**: Add KaTeX/MathJax to the markdown renderer, OR adjust system prompt to suppress LaTeX. Inline `$...$` also needs handling.

#### 5. Production expert profiles show "Test account for…" bios (MEDIUM)
- **Issue**: /experts in production lists "Mike the Carpenter" (Portland, OR) with bio "Test account for carpentry user testing agent." Other seed accounts: "Slizzy Industry", "Willy's Welding" in "Your Mom, CA". All show $75/hr flat rate, 0 reviews.
- **User Impact**: Seeing "Test account for…" destroys credibility. The marketplace reads as dev sandbox, not real product.
- **Expected**: Clean seed bios, or hide test accounts in production, or label the marketplace as "Demo".
- **Fix**: Add `is_test_account` flag on expert profiles and filter from public listings. Clean up "Your Mom, CA" placeholders.

#### 6. /about page renders in light theme while rest of app is dark (MEDIUM)
- **Issue**: Navigating from any dark Fixerator page to /about flips to a cream/light theme with a duplicate top header. Two layouts collide (AppShell sidebar + inner page nav).
- **User Impact**: Disorienting theme flip — felt like a different product. The duplicate header is also visually noisy.
- **Expected**: Consistent theme across the app.
- **Fix**: Decide whether /about is a marketing page (own layout, no sidebar) or an in-app page (sidebar visible, dark theme). Currently it's neither.

#### 7. About page contradicts paywall: "No signup required" but Q&A requires sign-in (MEDIUM)
- **Issue**: Top of /about reads "Free to use · Instant answers · No signup required · Verified experts". But paid-Q&A submission requires sign-in.
- **User Impact**: Once I hit the auth wall later, the contradiction became obvious. Marketing oversells.
- **Expected**: Caveat the claim — "No signup required for AI chat".
- **Fix**: Adjust about-page tagline to be precise about which features require sign-up.

#### 8. AppShell sidebar shows both DIY and EXPERT menus to dual-role users (MEDIUM)
- **Issue**: Signed in as a dual-role account (DIYer + Expert), the sidebar shows DIY, EXPERTS, AND EXPERT sections with 11+ links total.
- **User Impact**: Information overload. Had to scan past pro-side dashboard links to find the DIY chat I wanted.
- **Expected**: Role toggle or section collapse for users who don't always need both.
- **Fix**: Add a role toggle to AppSidebar at the top — Customer Mode vs Pro Mode.

#### 9. Guest conversations don't persist across navigation (MEDIUM)
- **Issue**: After my multi-turn structural-repair conversation, I navigated to /marketplace/qa. When I came back to /, the chat input was reset and the prior conversation appears lost. No "resume" or "Sign in to save" prompt.
- **User Impact**: Lost the thread mid-evaluation. Harder to file a coherent follow-up paid question.
- **Expected**: At minimum, conversation persists in localStorage for the current session.
- **Fix**: Add localStorage-backed guest conversation persistence with "Continue" / "Start fresh" affordances.

#### 10. AI initial chat response takes 20+ seconds to start streaming (MEDIUM)
- **Issue**: After submitting my first question, no content appeared in the response area for ~20 seconds — only a spinner. The eventual response was excellent but the initial latency felt much longer than chat services I'm used to.
- **User Impact**: I almost re-submitted thinking my message had failed.
- **Expected**: Either faster first-token latency, or clearer "Reasoning…" / "Looking up codes…" feedback.
- **Fix**: If using extended-thinking, surface that with an explicit state. Or pre-stream a "Looking up code references…" acknowledgment.

#### 11. /design-system is publicly accessible (LOW)
- **Issue**: /design-system loads the internal component library in production with no auth gate.
- **User Impact**: Minor — but shipping internal pages publicly is a polish/professionalism flag.
- **Expected**: Auth-gate, noindex, or move under /_dev/.
- **Fix**: Add a NEXT_PUBLIC env-flagged check, or robots.txt rule + noindex meta.

#### 12. Mascot image clips right edge on landing (LOW)
- **Issue**: The FIX-3000 mascot image is partially cut off at the right on a 1252×952 viewport — rightmost detail looks chopped.
- **User Impact**: Looks slightly unfinished. Brand asset deserves a clean frame.
- **Fix**: Inspect hero layout grid; likely object-contain or padding-right adjustment.

---

**AI Response Quality** (expanded — this was the main attraction)

**Appropriateness for skill level**: Excellent. The AI did not explain what a floor joist is, did not lecture me on basic carpentry, did not over-warn about safety. It treated me as a peer who came in with a specific technical question. The follow-up showed the AI registered my expertise level from the initial question vocabulary (NDS, IRC section numbers, "tension side", "simply-supported") and didn't reset.

**Technical accuracy** (spot-checks):
- IRC sections R502.1, R502.6, R502.7, R502.8, R301.5, Table R502.3.1(1) — all real and correctly applied
- NDS Supplement Table 11A reference — correct for 1/2" bolt in 2x lumber main member
- Bolt shear values: ~400 lb single shear parallel-to-grain, ~700-750 lb double — these match published NDS reference design values for 1/2" bolt in SPF
- End distance 7×bolt diameter (3.5"), spacing 8×bolt diameter (4") parallel — matches NDS bolt spacing rules
- Drilled hole vs notch distinction under R502.8 — correctly answered
- "Through-bolts preferred over lags for clamping; lags lose clamping over time due to wood shrinkage" — correct expert insight

**Minor pushback** (I would mention these if reviewing the response):
- "Sister restores ~80-90% of original capacity" lowballs the structural recovery of a properly installed full-span sister on an undeflected joist. A by-the-numbers calc usually gives 100%+ recovery.
- The response was very prescriptive about full-span vs partial sister. In practice a partial sister extending ~6 ft past each side of the crack with proper fastening is also a legitimate repair if the joist isn't deflected. Not wrong, just conservative.
- "Minimum 1.5 inch bearing at joist ends" was cited but it's a new-construction spec, not strictly a repair spec.

**Safety guidance**: Appropriate for skill level — no nanny warnings, but did flag the permit requirement and AHJ engagement (which is the real-world safety net for a structural repair, not a "turn off the water first" tutorial).

**Jargon handling**: No issues. The AI used trade vocabulary correctly (PL Premium, KD-19, flitch plate, AHJ, sill plate, composite action) without explaining. Exactly what I want.

**Multi-turn depth**: The follow-up handled three different technical sub-questions (drilling under R502.8, A36 plate adequacy, bolt shear values in SPF) and answered each with appropriate specificity. The AI did not lose context between turns.

---

**What's Working Well**

1. **AI technical depth is the headline feature.** Code citations, NDS values, ASCII bolt-pattern diagrams, honest "this option vs that option" tradeoffs — this is genuinely better than what I'd get from a typical online resource. If the team can keep this calibration as the model evolves, the product has a real moat.

2. **"Talk to a Pro" value props are sharp.** "Pre-contextualized answer", "Documented record", "Payment protection", "Verified tradespeople" — this is the clearest articulation of why the paid Q&A exists. Each bullet addresses a real pain point.

3. **First-question-free is the right onboarding.** Removes the "but will I get charged?" hesitation. (Though the auth gate should be surfaced earlier — see #3 above.)

4. **Brand voice has personality.** The Terminator parody won't be for everyone but it signals confidence and avoids the saccharine "we're here to help you on your journey" tone of competitor products. As an expert, I'd rather a product with a point of view than mush.

5. **"Save to Project" CTA after AI response.** Right post-conversation action for power users — turn a one-shot question into a tracked reference.

6. **Find an Expert page works well as guest.** Clean grid, specialty tags, location, separate hourly vs Q&A rate. Right structure even if the seed data needs cleaning.

7. **Dark theme is well-executed.** Rust/copper primary against earth-brown neutrals reads premium and confident. Consistent application of the dark palette across most pages.

---

**GIF Recordings**

None captured in this run — the screenshot tool's `save_to_disk` route didn't produce files in the expected screenshots/ directory under this sweep's path. Subsequent runs should use a more explicit path or verify the save target. Screenshots were observed inline during the session and informed the findings above.

---

**Summary for developers**

The product's core value-prop — expert-level AI guidance on structural and code questions — is genuinely working. Three quick wins would dramatically improve the expert experience:

1. **Collapse the landing hero after first message** (visual real-estate win)
2. **Fix the LaTeX rendering** (credibility win)
3. **Gate the Q&A submission form correctly for guests, OR remove the auth requirement for first question** (conversion win)

After those three, the dual-role sidebar UX and the /about theme inconsistency are the next layer.
