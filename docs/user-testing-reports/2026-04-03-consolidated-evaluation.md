# Consolidated User Testing Evaluation

**Date**: 2026-04-03
**Branch**: `feat/ux-improvements`
**Testing period**: 2026-04-02 (DIYer sweeps) to 2026-04-03 (Expert sweeps)

## Test Coverage

| Date | Persona | Mode | Report |
|---|---|---|---|
| 2026-04-02 | Beginner DIYer | Full Sweep | `2026-04-02-beginner-diyer-sweep.md` |
| 2026-04-02 | Intermediate DIYer | Full Sweep | `2026-04-02-intermediate-diyer-sweep.md` |
| 2026-04-02 | Expert DIYer | Full Sweep | `2026-04-02-expert-diyer-sweep.md` |
| 2026-04-03 | Carpenter Expert | Full Sweep | `2026-04-03-carpenter-expert-sweep.md` |
| 2026-04-03 | Electrician Expert | Code Compliance Focus | `2026-04-03-electrician-expert-code-compliance.md` |

**Note**: 14 bugs from DIYer testing were fixed in commit `198d575` before expert testing began.

---

## Cross-Cutting Issues (found by 2+ personas)

These are **high-confidence platform issues** confirmed across multiple user types.

### CRITICAL

| # | Issue | Found By | Notes |
|---|---|---|---|
| 1 | **Dashboard "Recent Questions" shows zero while Q&A Queue has questions** | Carpenter, Electrician | Dashboard widget uses different query/filter than Q&A Queue page. Both experts saw questions in their queue but dashboard said "No open questions in your specialties." Expert banner correctly shows count. |
| 2 | **Q&A payout shows $0.00 despite expert having $15 Q&A rate** | Carpenter, Electrician | Expert profile has Q&A Rate=$15, but claimed questions show $0.00 payout. "Free question" label (DIYer-facing) displayed to experts without explaining economics. Deal-breaker for expert trust. |

### HIGH

| # | Issue | Found By | Notes |
|---|---|---|---|
| 3 | **Markdown tables render as raw pipe text** | Beginner DIYer, Expert DIYer, (Electrician confirmed working in chat) | Tables in AI chat responses render as raw `| col | col |` text. Note: Electrician saw tables rendering correctly -- may have been fixed in `198d575` or varies by context. Needs verification. |
| 4 | **Raw JSON/materials data leaks into chat** | Intermediate DIYer, Expert DIYer | `---MATERIALS_DATA---` blocks with raw JSON visible in chat bubbles. |
| 5 | **No credential/certification fields on expert profile** | Carpenter, Electrician | No license number, type, state, insurance, or years-of-experience fields. Experts can't differentiate themselves from unqualified sign-ups. |
| 6 | **Duplicate question cards on Q&A detail page** | Beginner, Intermediate, Expert DIYer | Question text appears twice with "Question" and "Your Question" headings. Found by all 3 DIYer personas. |
| 7 | **Answer textarea limited (2000 chars), no formatting or attachments** | Carpenter | Expert carpentry answers barely fit. No markdown rendering, no photo/diagram uploads. Electrician couldn't test (no legitimate question to answer). |

### MEDIUM

| # | Issue | Found By | Notes |
|---|---|---|---|
| 8 | **Stale chat persists across sign-out/different accounts** | Beginner DIYer, Intermediate DIYer | localStorage chat data not scoped to user. Previous account's conversation visible after sign-out and sign-in as different user. |
| 9 | **"Free question" + "Pool"/"Paid" tags displayed simultaneously** | Carpenter, Electrician | Ambiguous tag combinations on Q&A cards. Experts don't understand what "Pool" or "Standard" means. |
| 10 | **Settings page shows DIYer context for expert users** | Carpenter, Electrician | `/settings` shows DIYer subscription info instead of expert-specific settings. |
| 11 | **No expert subscription tiers exist** | Carpenter, Electrician | Planned Free/Pro/Premium tiers not implemented. No queue priority or fee reduction path. |
| 12 | **Shopping list invisible to guest users** | Beginner DIYer | No Save Materials button for guests. AI promises features unavailable without auth. |

---

## New Issues from Expert Testing (not found by DIYers)

| # | Priority | Issue | Found By |
|---|---|---|---|
| 13 | High | **"Become an Expert" CTA buried in footer** -- No expert onboarding path from main nav or hero | Carpenter |
| 14 | Medium | **Expert dropdown missing "Dashboard" link** -- Only My Profile, Settings, Sign Out | Carpenter |
| 15 | Medium | **No profile photo upload for experts** -- Letter avatar only | Carpenter |
| 16 | Medium | **Gibberish test data in Q&A queue** -- Junk question visible to experts | Electrician |
| 17 | Low | **Embeddable badge shows "0 questions answered" after answering** | Carpenter |
| 18 | Low | **No prominent "New Chat" function** | Expert DIYer |
| 19 | Low | **Second Q&A question requires payment with no remaining-questions indicator** | Expert DIYer |

---

## Previously Found & Fixed (14 bugs, commit 198d575)

These were identified in DIYer testing on 2026-04-02 and fixed before expert testing. Not re-evaluated here.

---

## AI Response Quality Summary

### DIYer Side

| Dimension | Beginner | Intermediate | Expert |
|---|---|---|---|
| Skill-level calibration | Excellent | Excellent | Excellent |
| Technical accuracy | Good | Strong | Very Good |
| Safety guidance | Very Good | Good | Strong |
| Jargon handling | Good (some unexplained) | Perfect for level | Perfect for level |
| Multi-turn context | N/A | N/A | Excellent |

### Expert Side (Trade Knowledge)

| Dimension | Carpenter (3 questions) | Electrician (5 questions) |
|---|---|---|
| Technical accuracy | 9/10 | 9.4/10 |
| Safety of advice | 9.5/10 | 9.5/10 |
| Code compliance | 9/10 (IRC citations) | 9.4/10 (NEC citations) |
| Scope recognition | 10/10 | 10/10 |
| Willing to be corrected | Excellent | Excellent |

**AI is the platform's strongest asset.** Both trades rated it highly. Specific code citations (IRC R502.8, R507.2.3, NEC 210.8, 210.52, 250.53) were almost always correct. Safety guidance appropriately flags when to hire a professional. The platform's AI quality is genuinely differentiated from competitors.

---

## Prioritized Fix List

### Tier 1: Fix Now (blocks expert adoption)

1. **Dashboard Recent Questions query mismatch** -- Unify with Q&A Queue query logic
2. **Q&A payout display ($0.00 bug)** -- Show actual expert payout, clarify "free question" economics
3. **Raw JSON/materials data leaking into chat** -- Strip `---MATERIALS_DATA---` blocks before rendering
4. **Markdown table rendering** -- Verify remark-gfm fix from 198d575, ensure consistent rendering

### Tier 2: Fix Soon (trust & usability)

5. **Duplicate Q&A question cards** -- Consolidate into single display
6. **Add credential/certification fields to expert profile** -- License number, type, state, insurance
7. **Answer form improvements** -- Increase char limit to 5000+, add markdown support, photo upload
8. **Stale chat persistence** -- Scope localStorage by user ID, clear on sign-out
9. **Clarify Q&A card tags** -- Remove/explain "Pool", "Standard", show expert payout amount
10. **Expert "Become an Expert" visibility** -- Add to main nav or hero section

### Tier 3: Feature Gaps (medium-term)

11. **Expert subscription tiers** (Free/Pro/Premium)
12. **Expert-specific settings page**
13. **Expert dropdown: add Dashboard link**
14. **Profile photo upload**
15. **Shopping list visibility for guests**
16. **Q&A question character limit** -- Increase from 500 to 1500
17. **Clean up test/gibberish data from Q&A queue**

### Tier 4: Polish

18. Embeddable badge question count accuracy
19. New Chat button prominence
20. Free question counter/indicator

---

## ROI Assessment from Experts

**Carpenter**: Conditionally yes. $15/question at 10 min = $90/hr equivalent. Would answer 3-4 questions/day during downtime for $900-1200/month supplemental income. **Blockers**: payout display, no credentials.

**Electrician**: Conditionally yes. AI code compliance quality would bring them back. **Blockers**: payout clarity, can't display license, low question volume.

**Both experts agree**: Fix the money flow and credential display, and the platform is worth their time. The AI quality is the strongest selling point.

---

*Generated from 5 persona-driven user test reports across 2 testing sessions.*
