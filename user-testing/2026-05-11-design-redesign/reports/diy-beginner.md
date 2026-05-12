# User Test Report: Fixerator Full Sweep — Beginner DIYer

**Persona**: Sarah, anxious first-time DIYer. Sink is leaking under the kitchen cabinet, she has never done plumbing before, and she's afraid of flooding her house or making things worse. Has YouTube'd a few things but doesn't know parts names or what to buy.

**Environment**: https://www.fixerator.com (production)

**Mode**: Full Sweep — Landing, Chat, Shopping, Q&A Marketplace, Find an Expert, About, Project Templates

**Test infrastructure caveat**: This run shared a single Chrome instance with 7 concurrent agents. Auth state flipped repeatedly between accounts (`test-expert-carpenter`, `test-diyer-intermediate`, `test-expert-gc`, `test-expert-hvac`, `test-expert-electrician`, and signed-out). Findings reported below are the ones that were observed on Fixerator's UI itself (not cross-agent state interference). One mid-test chat appeared to swap into another agent's conversation history; I have treated that as test-infra noise rather than a production bug, since the underlying cause was Chrome session sharing.

## Overall Experience

I came here scared. I have a leak. The very first thing the homepage said to me, in giant letters, was that something would be **terminated**. I almost left.

Then the AI said "I'm sorry to hear that! ... don't worry — this is a very common DIY repair," and I felt better. The AI's empathy did the work the headline didn't. The actual project-template flow (Replace a Faucet) was excellent and made me feel guided. The Talk to a Pro flow, by contrast, was a silent dead end — I wrote my question, clicked Submit, and nothing happened.

If I had to summarize my experience as a first-time DIYer: **the AI knows how to talk to me, the brand voice doesn't, and the expert marketplace looks like a demo I shouldn't trust with my credit card.**

## Findings (ordered by priority)

### 1. Hero copy lands as menacing to an anxious first-timer (HIGH — content)

The landing reads, in massive type, **"Hi, I'm Fix. I'm here to terminate your project."** with the word "terminate" highlighted in red/orange against the dark background. Below in smaller text: "I'll be back… with the receipts from Home Depot."

Once you "get" the Terminator joke it's funny. But before you get it — which is the entire first impression — the dominant signal is hostility. I came here because something in my house was broken; the page told me it would terminate things. The robot mascot holds a drill that points back toward "terminate" reinforcing the visual.

**Expected**: Reassurance first, brand-voice jokes second. A first-time visitor in beginner mode should not have to figure out a pop-culture reference to feel safe.

**Fix**: A/B test a softer first-visit headline, or pair "terminate" with a clearer inline wink. The Terminator voice should be earnable from inside the product, not the first three words I read.

### 2. Free-form sink-leak chat answer omits the water-shutoff safety step (HIGH — ai-quality)

I typed "my sink is leaking underneath and I don't know what to do." The AI gave a beautiful empathetic opener, listed 5 likely causes (P-trap, drain basket, supply line, faucet body, garbage disposal) with prices and a diagnosis flow. The Fix bullet under P-Trap Leak reads "Tighten the slip-joint nuts by hand or replace the P-trap (~$5–10)."

Nowhere in the response did it tell me to turn the water off first.

The **Project Template** path for "Replace a Faucet" handled this perfectly — Step 1 is literally "Prep & Shut Off Water — Turn off the hot and cold shut-off valves under the sink (turn clockwise)." But the free-form chat path skipped that floor.

My #1 fear as a beginner is flooding my house. The single most important thing I needed was that one sentence.

**Fix**: For any leak/plumbing prompt that smells like a beginner asking, inject a one-line safety preamble before any "tighten" / "replace" instruction. The template flow already gets this right; copy that into the free-form system prompt.

### 3. Talk to a Pro Submit button silently disabled, with confusing "Free question used" copy (HIGH — bug + content)

I clicked "Talk to a Pro", typed a 209-character beginner question ("Is it safe for me to try to fix a leaking pipe under my kitchen sink myself?"), and clicked the red "Submit Question" button. Nothing happened. No toast, no inline error, no scroll-to-error.

Inspection shows `button.disabled === true`. The button has no title attribute and no aria-disabled message. There's a "Save Payment Method" button above it I hadn't clicked.

Worse, the price block above reads **"Free question used — this question costs $5–$8."** I have never submitted any expert question. As an anxious beginner, "free question used" reads as "they tricked me out of my freebie before I knew it existed."

**Fix**: 
- If submit is disabled because no payment method is saved, swap the button label to "Save Payment Method to Submit" or show an inline message on click.
- Audit the "Free question used" eligibility — either grant a clearly-labeled free question to new accounts or remove the "used" framing until it actually applies.

### 4. Find an Expert page shows placeholder data including "Your Mom, CA" (HIGH — content)

`/experts` lists eight experts. Every single one shows 0 reviews, 0 stars, and the same $75/hr rate. One expert's **location is literally "Your Mom, CA"**. Other names include "Slizzy Industry". 

Contrast with `/about`, which shows believable expert spotlights like "Mike T., Licensed Electrician, Portland OR, 4.9 (47 reviews), $2,400/mo avg."

If I'm going to put my credit card down to ask one of these people a question, I need to believe they're real. Right now the marketplace UI says they are not.

**Fix**: Curate the seed experts. At minimum scrub "Your Mom, CA" and "Slizzy Industry." Add some real-looking ratings/review counts, or gate the page behind a beta-data notice.

### 5. Jargon explained inconsistently in chat responses (MEDIUM — ai-quality)

In the sink-leak response, **P-trap** is helpfully glossed ("The curved pipe under your sink that holds water to block sewer gases"). But these immediately followed unglossed: **slip-joint nuts**, **shut-off valves** (mentioned without locating them), **faucet cartridge**, **plumber's putty or Teflon tape** (no guidance on which to use when).

The inconsistency was worse than uniform jargon. The first definition primed me to expect every term to be explained, and the absence of subsequent definitions felt like the app changed its mind about me.

**Fix**: In the chat system prompt, add: "When introducing any trade term, follow it with a 1-line plain-English gloss." Or use hover-tooltips for terms.

### 6. My Questions vs Ask Anything not differentiated for beginners (MEDIUM — usability)

The new sidebar has "Ask Anything" CTA on landing and a sidebar entry "My Questions" under EXPERTS. After my long sink-leak chat I clicked "My Questions" expecting to find my conversation. Got empty state: "You haven't asked any questions yet." 

There's no explanation that My Questions = paid expert questions, separate from the AI chat history.

**Fix**: Rename to "Expert Questions" or "Paid Q&A", or add empty-state explainer pointing to "Recent Conversations" for AI chat.

### 7. "Free question used" copy on fresh accounts (MEDIUM — content)

Captured separately under finding 3 above. Repeating because it's a distinct content bug worth fixing in isolation: the price block "Free question used — this question costs $5–$8" appears on accounts that have never submitted an expert question.

### 8. Mascot positioning: drill points toward "terminate" headline (LOW — design)

The Fix robot holds the drill aimed back at the words "terminate your project." Combined with finding 1, it doubles the first-impression hostility. Cute on its own, less so in context.

**Fix**: A neutral or lowered-drill pose for the landing's first frame.

## AI Response Quality

**Appropriateness for skill level**: B+. The free-form chat opened with perfect empathy and graded the explanation level appropriately for a beginner-sounding prompt. But the template-driven response was better-structured than the same chat path. Beginners would benefit if the free-form chat adopted the template's safety-first ordering.

**Technical accuracy**: A. Everything I observed was accurate (price ranges, tool purposes, ¼-turn-past-hand-tight, basin wrench specifics). The /about comparison page even cited specific code refs ("MA NEC 2023 requirements included").

**Safety guidance quality**: Mixed. The Replace-a-Faucet template flow nailed it — water shutoff is step 1. The free-form leak-diagnosis flow missed it entirely (finding 2). This is the most actionable AI-quality fix.

**Jargon handling**: Mixed (finding 5). One term explained beautifully (P-trap), several others left bare (slip-joint nuts, shut-off valves, faucet cartridge). Either all or none — the inconsistency is worse than either policy alone.

## What's Working Well

- **AI empathy opener** ("I'm sorry to hear that! ... don't worry — this is a very common DIY repair.") — single most reassuring thing on the entire site for a nervous user.
- **Project Templates** (especially "Replace a Faucet") produce structured, safety-first, beginner-perfect responses. This is the strongest beginner experience in the product. Surface it more prominently.
- **Dark warm-brown theme** (`rgb(42,37,32)` body bg with cream text) reads as a serious craft tool, not a sterile tech app. AAA-grade contrast. The dark mode is a quiet win.
- **Tool tables with PURPOSE column** in the faucet response ("Adjustable wrench — Loosening/tightening supply line nuts") — exactly how you teach a beginner. More of this everywhere.
- **Cost transparency** in chat responses (~$5-10 for P-trap, $15-20 for basin wrench) — anxious beginners want to know the financial damage upfront.
- **Pro Tips** sections in template responses ("Take a photo of your existing plumbing setup before disconnecting anything") — this is the kind of practical wisdom that calms anxious users.
- **Empty states** in Shopping panel that tell me what's missing AND what to do next ("Start a chat, ask for a materials list, then save it to a project. Go to chat").
- **/about page** is excellent for beginners — "No signup required", "Free to use", comparison vs "Generic AI"/"Google Search", and the project template grid is the perfect on-ramp.
- **Brand cleanup**: zero "DIY Helper"/"diyhelper" strings leaked through that I could find — the Fixerator rebrand is clean on the surfaces I tested.

## GIF Recordings

No GIFs captured this run — the shared-tab interference and high cost of cross-agent timing made GIF recordings unreliable. The screenshots referenced in the test session are visible in tool call results but were not persisted to `screenshots/`. Recommend a future run with isolated browser instances per agent for clean GIFs.

## Top 3 Things for Immediate Developer Attention

1. **Add a water-shutoff safety preamble to free-form leak/plumbing chat responses** (finding 2). The Replace-a-Faucet template already does this perfectly; copy that prompting into the free-form path. Single highest-leverage AI-quality fix for the beginner persona.
2. **Clean the production `/experts` data** (finding 4). "Your Mom, CA" as a location, "Slizzy Industry" as a name, and 0 reviews across the board destroys trust for a user who is about to enter their credit card. Either curate the seed accounts or gate the page.
3. **Fix the silent Talk-to-a-Pro submit + "Free question used" copy** (findings 3 + 7). A disabled button with no feedback plus copy that implies "you already burned your freebie" is a dead-end UX for an anxious user who already typed out a real question.
