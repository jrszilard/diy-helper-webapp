# Supplemental directive for all user-testing agents — 2026-05-11 sweep

This directive is in addition to your normal agent-config behavior.

## Test target

- **Environment**: `https://fixerator.com` (production)
- **Focus**: We just shipped a dark-design overhaul + Fixerator brand layer. Pay extra attention to:
  - Visual hierarchy in the new dark UI
  - Mascot ("Fix the FIX-3000") presence and copy ("Hi, I'm Fix. I'm here to terminate your project.")
  - "Terminated" status copy on completed projects
  - AppShell / AppSidebar layout (replaced AppHeader)
  - Any old "DIY Helper" or "diyhelper" strings still leaking through (brand regression)
  - Dark-mode contrast / readability issues

## Output requirements — TWO things per finding

For **every** issue, insight, or observation you make, write BOTH:

### 1. Long-form persona report (markdown)

Write your full report to:
`user-testing/2026-05-11-design-redesign/reports/<persona>.md`

Use your normal agent report format (Overall Experience, Findings, AI Response Quality, What's Working Well, GIF Recordings).

Filename `<persona>` must be one of:
- `diy-beginner.md`, `diy-intermediate.md`, `diy-expert.md`
- `expert-carpenter.md`, `expert-electrician.md`, `expert-plumber.md`, `expert-hvac.md`, `expert-gc.md`

### 2. Structured findings (JSONL — APPEND ONLY)

For **every finding** (including positives), append ONE JSON object as a new line to:
`user-testing/2026-05-11-design-redesign/findings.jsonl`

Schema is in `user-testing/2026-05-11-design-redesign/SCHEMA.md`. **Read it before writing.**

Critical rules:
- One JSON object per line. No multi-line JSON.
- Append only (never overwrite). Use `>>` not `>`.
- Each finding gets a unique `id` = `<persona>-<n>` where n is your local counter starting at 1.
- Include `positive` findings too — what's working well is as important as what's broken.
- Use the `timestamp` field with ISO 8601 UTC.
- Set `severity` honestly: `critical` only blocks a core flow.

Recommended append pattern (Bash):
```bash
cat >> /home/justin/lakeshore-studio/ai-projects/diy-helper-webapp/user-testing/2026-05-11-design-redesign/findings.jsonl << 'EOF'
{"id":"<persona>-1","persona":"<persona>","timestamp":"2026-05-11T..","severity":"...","category":"...","title":"...","description":"...","user_impact":"...","page_path":"/","tags":["..."]}
EOF
```

## Screenshots & GIFs

- Save screenshots to `user-testing/2026-05-11-design-redesign/screenshots/<persona>-<n>-<short-slug>.png`
- Save GIFs to `user-testing/2026-05-11-design-redesign/gifs/<persona>-<short-slug>.gif`
- Reference them via the `screenshot` / `gif` fields in JSONL findings.

## Browser tab discipline (IMPORTANT — multiple agents running concurrently)

You are running in parallel with 7 other agents that ALL share the same Chrome instance. To avoid clobbering each other:

1. **Always create your own tab** at the start with `mcp__claude-in-chrome__tabs_create_mcp`. Capture the tabId.
2. **Always pass your tabId** explicitly on every subsequent tool call that supports it.
3. **Never switch to a tab you didn't create.** If `tabs_context_mcp` shows tabs you don't recognize, leave them alone.
4. **If you see unexpected page state**, your tool call may have hit the wrong tab — re-issue with explicit tabId.
5. **At the end**, close only your own tab(s).

## Test account credentials

Read `.env.local` for credentials. Mapping:
- DIY beginner: `TEST_DIYER_BEGINNER_EMAIL` / `TEST_DIYER_BEGINNER_PASSWORD`
- DIY intermediate: `TEST_DIYER_INTERMEDIATE_EMAIL` / `TEST_DIYER_INTERMEDIATE_PASSWORD`
- DIY expert: `TEST_DIYER_EXPERT_EMAIL` / `TEST_DIYER_EXPERT_PASSWORD`
- Expert carpenter: `TEST_EXPERT_CARPENTER_EMAIL` / `TEST_EXPERT_CARPENTER_PASSWORD`
- Expert electrician: `TEST_EXPERT_ELECTRICIAN_EMAIL` / `TEST_EXPERT_ELECTRICIAN_PASSWORD`
- Expert plumber: `TEST_EXPERT_PLUMBER_EMAIL` / `TEST_EXPERT_PLUMBER_PASSWORD`
- Expert hvac: `TEST_EXPERT_HVAC_EMAIL` / `TEST_EXPERT_HVAC_PASSWORD`
- Expert GC: `TEST_EXPERT_GC_EMAIL` / `TEST_EXPERT_GC_PASSWORD`

(Beginner-DIY starts as guest then optionally tests signup — see your agent config.)

## Stop conditions

Stop and report what you found if:
- You hit the same error 3 times in a row
- A tool call fails repeatedly with no response
- The page consistently fails to load
- Production is showing a server error (5xx) — log it as a critical finding and stop

Don't keep hammering. Report and exit.

## Target-host discipline — DO NOT FALL BACK

Your assigned `environment` URL is `https://fixerator.com`. This is the ONLY origin you are allowed to test.

If navigation to `fixerator.com` fails:
- Log a critical finding describing the failure (timeout, permission gate, DNS error, 5xx, etc.)
- STOP. Do not navigate to localhost, a Vercel preview, or any other origin.
- A previous sweep iteration had agents silently drift to `http://localhost:3000` when prod was blocked — they then wrote persona reports against Chrome error pages, which is worse than no report at all. Do not do this.

If you see other agents' tabs showing other origins, that is THEIR business, not yours. Stay on your own tab and your own assigned origin.

## Final summary in your return message

At the end of your run, return:
1. Path to your persona report markdown
2. Count of findings logged to JSONL by severity (e.g., "critical: 0, high: 3, medium: 5, low: 4, positive: 3")
3. Top 2-3 things you'd flag for immediate developer attention
