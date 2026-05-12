# findings.jsonl schema

Each line in `findings.jsonl` is a single JSON object representing one observed issue or insight. Append-only; never edit existing lines.

## Fields

| field | required | type | description |
|---|---|---|---|
| `id` | yes | string | `<persona>-<n>` (e.g., `diy-beginner-1`). Agent-local counter, monotonic per persona. |
| `persona` | yes | string | One of: `diy-beginner`, `diy-intermediate`, `diy-expert`, `expert-carpenter`, `expert-electrician`, `expert-plumber`, `expert-hvac`, `expert-gc` |
| `timestamp` | yes | string | ISO 8601 UTC (e.g., `2026-05-11T15:32:01Z`) |
| `severity` | yes | string | `critical` (blocks core flow) \| `high` (significant friction) \| `medium` (noticeable but workable) \| `low` (nit) |
| `category` | yes | string | `design` \| `usability` \| `content` \| `bug` \| `performance` \| `a11y` \| `ai-quality` \| `positive` |
| `title` | yes | string | ≤80 chars. What the issue is, e.g., "Mascot floating animation visible on /design-system but not landing" |
| `description` | yes | string | What happened, observed concretely. Quote text the user sees. Reference page elements. |
| `user_impact` | yes | string | How the persona experienced it. First-person voice from inside the persona. |
| `expected` | no | string | What the persona expected to happen instead. |
| `fix_recommendation` | no | string | Actionable developer guidance. Include file paths if obvious. |
| `page_path` | yes | string | The route where the issue was observed (e.g., `/marketplace/qa`). Use `/` for landing. |
| `screenshot` | no | string | Relative path to screenshot in `screenshots/` if captured. |
| `gif` | no | string | Relative path to GIF in `gifs/` if captured. |
| `console_errors` | no | array<string> | Any JS console errors captured at the time. |
| `tags` | no | array<string> | Free-form tags. Suggested: `mascot`, `dark-mode`, `landing`, `chat`, `shopping`, `qa-marketplace`, `dashboard`, `auth`, `registration`, `bidding`, `mobile`, `safety-warning`, `jargon`. |

## Examples

```json
{"id":"diy-beginner-1","persona":"diy-beginner","timestamp":"2026-05-11T15:32:01Z","severity":"high","category":"content","title":"Mascot says \"terminate your project\" — feels aggressive to anxious beginner","description":"Landing hero reads 'I'm here to terminate your project.' As a nervous first-timer, the word 'terminate' made me wonder if this app would push me into something destructive.","user_impact":"Made me hesitate before engaging — I was already worried about doing damage, and the copy reinforced that fear.","expected":"Friendly reassurance that the app will guide me through, not 'terminate' anything.","fix_recommendation":"Consider tooltip or subhead clarifying 'terminate' = brand voice for 'finish the project'. Or A/B with a softer landing for first-time visitors.","page_path":"/","tags":["mascot","landing","content","brand-voice"]}
{"id":"diy-beginner-2","persona":"diy-beginner","timestamp":"2026-05-11T15:34:11Z","severity":"low","category":"positive","title":"Dark theme felt premium and modern","description":"The dark background with the gold/red accents made the app feel like a real tool, not a toy.","user_impact":"Felt confident the app was serious — trusted it more than I would have a generic-looking site.","page_path":"/","tags":["dark-mode","design","positive"]}
```

## Severity guidance

- **critical**: Persona cannot complete a core flow (sign up, ask a question, get an answer, find shopping list). Hard blocker.
- **high**: Persona can complete the flow, but with significant frustration or wasted time. Likely to abandon.
- **medium**: Noticeable rough edge. Persona notes it but proceeds. Would mention if asked.
- **low**: Polish-level. Persona would not mention unprompted.

## Category guidance

- **design**: Visual layout, hierarchy, color, spacing, typography — issues from the design redesign.
- **usability**: Flow, navigation, discoverability — can the persona find/do the thing.
- **content**: Copy, microcopy, brand voice — words on the page.
- **bug**: Something is broken — error, broken link, crash, data loss.
- **performance**: Slow load, jank, unresponsive UI.
- **a11y**: Accessibility — contrast, keyboard nav, screen reader.
- **ai-quality**: AI chat response quality issues (depth, accuracy, jargon handling, persona-adaptation).
- **positive**: Something working well worth flagging. Reinforces what to keep.
