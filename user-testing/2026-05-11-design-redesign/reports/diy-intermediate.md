# User Test Report: Fixerator Full Sweep — Intermediate DIYer

**Persona**: Intermediate DIYer (Sarah, weekend-warrior, comfortable with basic tools, knows trade terms but not all tricks)
**Environment**: https://fixerator.com (production)
**Mode**: Full Sweep — landing, chat, Find an Expert, Q&A submission, shopping flow, design-system, /about
**Date**: 2026-05-11

---

## Overall Experience

When I land on the page, the dark theme + Fix mascot feel premium and I get what this is. Quick-start chips speak my language ("I'm mid-project — my mortar isn't setting", "Is my electrical panel safe for a hot tub?") which is great — those are exactly the questions I'd actually type. The AI gave me a knockout response on deck screws — code-cited, climate-specific, with model numbers and store links. That's the dream.

But the rest of the platform is bumpy. URL discoverability is broken: `/projects`, `/shopping`, `/login` all 404 even though the sidebar nav implies they exist. I can never tell which user account I'm signed in as — the persistent orange "Welcome back, [name]" banner shows a different name than my actual account, and stays on screen even after I sign out. The very first time I tried to submit a paid question to a verified expert, my form crashed with a raw zod enum error because the "General" category default isn't a real backend option. That's a hard blocker the first time I try the marketplace.

If I could trust the auth state and URL paths worked, this would feel like a real intermediate-grade tool. Right now the chrome around the chat is fighting with the great chat experience.

---

## Findings (ordered by priority)

### 1. CRITICAL — Q&A submit fails with raw enum error on default category

When I picked a verified plumber and clicked "Ask a Paid Question — $15", I wrote up my question and hit Submit. The form crashed with red text dumping a zod-validator enum:

> Invalid option: expected one of "electrical"|"plumbing"|"hvac"|"carpentry"|"flooring"|"roofing"|"concrete"|"drywall"|"painting"|"tile"|"landscaping"|"general_contracting"|"other"

The Category dropdown defaulted to "General" — but that value isn't in the backend's accepted enum (the backend wants `general_contracting` or `other`). I had to manually switch to "Plumbing" to get past it. That's a blocker on the FIRST paid question I'd ever submit on this platform, and the error message exposes internals rather than helping me.

**Fix**: Either remove "General" from the UI dropdown, or map UI "General" → backend `other`. Show user-friendly validation messages, not raw enum dumps.

### 2. HIGH — "Welcome back, [name]" banner shows wrong/stale user name across the app

Every page in the experts section (Find an Expert, expert detail, Q&A submit, Q&A detail) carries an orange banner: "Welcome back, [name]... 0 open questions... Go to Dashboard". But the name in that banner kept showing a DIFFERENT expert than my actual logged-in user (shown in bottom-left): I'd see "Welcome back, Tony the General Contractor" while bottom-left showed "Sarah the Electrician". When I signed out completely (Sign In CTA visible bottom-left), the orange banner STILL showed "Welcome back, Tony the General Contractor".

**Note**: This may be partially exacerbated by the parallel-agent shared-Chrome-session conditions, but the banner persisting AFTER full signout is a real bug independent of that.

**Fix**: Banner state should derive from the live session, not be cached client-side. Hide entirely when no user is authenticated, or when user role doesn't include "expert".

### 3. HIGH — Banner shows EXPERT chrome to a CONSUMER user

The "Welcome back... open questions... Go to Dashboard" banner is the EXPERT-side welcome bar. As a consumer DIYer, I don't have an expert dashboard. The banner persists across consumer pages (marketplace/qa, /experts, /experts/:id) confusing the consumer flow. Compounded with #2, I genuinely couldn't tell what mode I was in.

**Fix**: Conditionally render the expert banner only when user has expert role AND is on consumer-side pages (it's a cross-promo). Hide entirely for non-expert users.

### 4. HIGH — `/projects`, `/shopping`, `/login` all return 404

Sidebar items "My Projects" and "My Tools" open in-sidebar drawers (which is fine), but direct URLs to /projects and /shopping return 404. As an intermediate user, I deep-link to common app routes by habit — and `/login` is the most universal URL guess of all. Anywhere a 404 happens here, I lose trust the platform is finished.

**Fix**: Either make /projects, /shopping, /login real routes that mirror the drawer content, OR redirect them to `/` with the appropriate drawer pre-opened (`?drawer=projects` etc.).

### 5. HIGH — "Sidebar items open drawers" pattern is hidden — no affordance

"My Projects", "My Tools" in the sidebar look like nav links but actually open in-sidebar drawer panels (good behavior) — but there's no visual cue (caret, drawer icon, distinct hover state) telling me they behave differently from "Find an Expert" or "Dashboard" which actually navigate. Even worse, when I click "My Projects" the main content area shows my CURRENT page (e.g., 404 if I was on /projects) instead of refreshing to something coherent.

**Fix**: Add visual affordance (small expand icon on right of drawer items) and route to home/dashboard when opening drawers from a 404 or unrelated page.

### 6. MEDIUM — "General" category in Q&A is misleading — should map to "Other"

Even if backend accepted "general", the label "General" doesn't tell me what kinds of questions go there. I'd actually expect to use it for general home-improvement Qs, but the backend treats general as `general_contracting` (a specific trade). The UI label and backend taxonomy don't match.

**Fix**: Rename UI option to "Other" or "Not Sure", with helper text. Make `general_contracting` distinct as "General Contracting".

### 7. MEDIUM — Test/seed data leaking to prod expert listings

Find an Expert page shows production cards with:
- "Willy's Welding" location: **"Your Mom, CA"** (clearly a joke seed)
- Expert bios like "Test account for plumbing user testing agent."
- All experts rated **(0)** stars
- All experts uniformly priced **$75/hr** and **$15/Q&A**

As an intermediate making a $15 purchase decision, this signals "this platform is unfinished" and "no one has actually used it yet". Trust killer.

**Fix**: Filter test/seed accounts from production marketplace listings using a flag on the user record. Show "Newly joined" badges instead of (0)-star rating to reduce empty-state stigma. Allow variable pricing.

### 8. MEDIUM — Banner copy still calls Q&A rate "$15" even when first question is free

On expert detail page I see "$15 Q&A Rate" prominently. On clicking "Ask a Paid Question — $15", the destination form says "Your first question is free! No payment method needed" and "FREE — First question on us!" — so the actual cost is $0. The CTA price and the actual price mismatch.

**Fix**: When first-question-free promo is active for the user, show "Ask a Question (First one free!)" on the expert detail card instead of "$15".

### 9. MEDIUM — "What you get that a phone call can't provide" panel has poor contrast

On the Q&A submission form, the value-prop panel listing 4 points uses slate-blue text on a dark surface. Hard to read at a scan — and as a power-user who scans, I almost skipped it. The actual points (pre-contextualized answer, documented record, payment protection, verified tradespeople) are great selling points but I missed them.

**Fix**: Bump contrast to AA — use a brighter foreground or larger weight for the bullet text.

### 10. MEDIUM — Empty-state "My Questions" panel shows below active question form

When composing a question on the Q&A submission page, scrolling down reveals the "My Questions: No questions yet. Connect with a verified expert..." empty state RIGHT under the submit form. That's the same page user is composing on — feels redundant and competes for attention.

**Fix**: Hide the My Questions section while the form is in-progress, or move it above the form, or make it collapsible.

### 11. MEDIUM — Tag/specialty pills on expert cards are nearly invisible

On the Find an Expert grid, the trade tags ("carpentry", "electrical", "hvac", "plumbing") are low-contrast lavender/pink-ish on the dark card. The expert's specialty is the #1 filter I'd use to pick from 8 cards. Make these pop.

**Fix**: Stronger color tokens for trade tags. Each tag could use the trade-specific accent color (e.g., copper for carpentry, slate-blue for electrical).

### 12. MEDIUM — "Recent Conversations" on landing shows other people's data when session is corrupted

On the landing page after signin (and across signin attempts), "Recent Conversations" carousel shows previous chats — but in my testing it consistently showed conversations from OTHER accounts (e.g., when I was supposed to be intermediate DIYer, it showed expert questions like "Can I use 14 gauge wire to wire..." and "I want to build a 12x16 deck attached..."). This is partly the parallel-agent issue but the carousel doesn't seem to clear/refresh on auth change.

**Fix**: Re-fetch recent conversations on auth state change. Show skeleton/loading state instead of stale data.

### 13. LOW — "Hi, I'm Fix. I'm here to terminate your project." landing copy

As an intermediate, I get the Terminator joke — it's playful and confident. But mid-project I'm sometimes anxious or frustrated, and "terminate" can momentarily read as "ruin/destroy" before the brand voice clicks. It's the right tone 90% of the time but doesn't reassure when I'm coming in stressed.

**Fix**: Keep the hero but consider an A/B with a softer variant for first-time visitors, or add a contextual subtitle: "as in, finish it." Could also localize "terminate" → "wrap up" / "knock out" for users showing stress signals.

### 14. LOW — `/about` page is light-mode and feels like a different site

`/about` renders in cream/light styling with totally different navigation chrome (no sidebar, has top nav with "About / Become an Expert / Get Started"). Switching from the dark app to this marketing page is jarring — feels like getting bounced to a different site. The content itself ("One platform, two ways to win", side-by-side DIY/Expert framing) is good for marketing.

**Fix**: Either convert /about to dark theme matching the app, OR ensure /about is only reachable from logged-out marketing flows (currently the sidebar has no link to it but URL still works while signed in).

### 15. LOW — "Save Materials" CTA missing for guest users

When the AI gave me an excellent shopping list (deck screw recommendations with brands/SKUs), I expected a clear "Save these to a project" or "Send to my shopping list" CTA at the bottom. Nothing appeared as a guest. As a guest scrolling out, I'd lose that whole curated list.

**Fix**: For guests, show "Save these — sign up takes 10 seconds" CTA above the response. Convert at the moment of highest intent.

### 16. POSITIVE — Chat response on deck screws is genuinely excellent for my level

I asked "What size deck screws for 5/4 composite on PT 2x8 joists at 16" OC, MN climate?" and got back:
- Specific spec: "#10 x 2-3/8" or 2-1/2""
- Coating comparison table (Cost / Longevity / Notes) with stainless 304/316, ACQ-Rated epoxy, hot-dip galvanized, zinc/electroplated (with red ❌ "Do NOT use")
- **Code citation**: 2020 MN Residential Code MRC Table R507.2.3 & R317.3
- Top product picks: GRK R4, CAMO ProTech, Deckmate/FastenMaster, Hillman/Grabber #10 x 2-1/2" Type 305 SS
- Direct links to Home Depot and Lowe's
- Installation tips (pre-drill near ends, drive flush not countersunk, 2 screws/board/joist)
- Minnesota Code Notes section
- Offer to show installation videos

This is exactly the depth and specificity an intermediate wants. I would 100% pay for this if I had to.

### 17. POSITIVE — Find an Expert filters are clean and functional

The filter row (Specialty / State / Min Rating) is exactly what I'd want. The expert grid layout is scannable. Once trust issues are addressed (real ratings, real bios, varied pricing), this is solid.

### 18. POSITIVE — Q&A submission flow has thoughtful UX details

- 1500-char limit with 20-char minimum (prevents spam, encourages detail)
- Photo upload with "JPG, PNG up to 5MB each" guidance
- "Direct Question" callout showing recipient
- Free-first-question promo is generous and clear
- The post-submit confirmation page ("Waiting for an expert to answer...") is calm and reassuring

### 19. POSITIVE — Dark theme aesthetic is genuinely premium

The rust/copper accents with dark surfaces, the Fix mascot with red eye/glow, the monospace "I'll be back… with the receipts from Home Depot." tagline pill — it all feels like a real product, not generic CRUD. The intermediate user (me) thinks "this team actually cares about brand". Worth noting that the design-system page (`/design-system`) shows thoughtful token names (rust, copper, forest-green, slate-blue, warm-brown, earth-tan, bot-eye, bot-glow).

### 20. POSITIVE — Sidebar layout post-redesign is clean for scanners

The AppShell sidebar with sections "DIY / EXPERTS / EXPERT" (when role grants both) is clean. The icons + labels are scannable. For a returning user, the in-sidebar drawer pattern for Projects/Tools is space-efficient once you know it. The bottom user pill is a good account anchor.

---

## AI Response Quality

- **Appropriateness for skill level**: Excellent. No talking-down, no over-explaining what 2x8 or PT lumber is. Acknowledged my exact framing ("composite on 2x8 at 16" OC, MN climate") and stayed at that level.
- **Technical accuracy**: Very good. Code references (MRC R507.2.3, R317.3) are real Minnesota Residential Code sections that govern deck fasteners. Screw sizing recommendation (#10 x 2-3/8" or 2-1/2") is industry standard for 5/4 composite on 2x lumber. Brand picks (GRK R4, CAMO ProTech, FastenMaster) are all legitimate composite-specific fasteners.
- **Safety guidance quality**: Good. Explicit "Do NOT use — will rust in PT lumber" callout on zinc/electroplated screws is the kind of safety warning that matters at my level. Also "Pre-drill near board ends (within 1" of edge) to prevent cracking" is the right gotcha.
- **Jargon handling**: Right calibration for intermediate. Doesn't over-explain "ACQ-rated" or "MRC Table R507.2.3" — assumes I can look it up if needed, and explains exactly enough ("ACQ-Rated coatings work well for composite").

---

## What's Working Well (consolidated)

1. **AI chat depth + code citation**: Best-in-class for intermediate-level DIY questions. Real codes, real products, real climate awareness.
2. **Find an Expert grid**: Clean filter + card layout. Bones are right.
3. **Q&A submission form**: Thoughtful constraints, free-first-question promo, photo upload.
4. **Dark theme aesthetic**: Premium and distinctive. The mascot lands.
5. **Sidebar drawer pattern** (My Projects, My Tools): space-efficient once discovered.
6. **Inline expert escalation** in chat responses (the "Want expert confirmation? Ask a verified expert →" callout I saw on an earlier conversation): smart upsell.

---

## GIF Recordings

(No GIFs recorded — too much parallel-agent session interference made multi-step flows non-reproducible. Screenshots cover key states.)

---

## Notes on testing conditions

This sweep ran in parallel with 7 other agents sharing the same Chrome session, so authentication state was overwritten frequently (test-diyer-intermediate would get replaced by test-expert-carpenter, then test-expert-hvac, then test-expert-gc, etc., based on which agent was active). I navigated around this by focusing on findings that were either:
- Reproducible regardless of which account was active (404s, banner persistence, category-enum bug)
- Inherent to the UI/UX visible (design contrast, copy, layout)
- Stable across the chat flow as guest (no session state needed)

Some findings (e.g., "Recent Conversations" showing other-user data) may be partly an artifact of session-sharing, but the bigger issue — that the UI didn't gracefully detect the auth-state changes and refresh stale content — is a real bug that a single user with multiple browser tabs or post-sign-out would also encounter.
