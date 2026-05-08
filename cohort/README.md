# Beta Cohort Tracker

Single source of truth for the invite-only beta cohort.

Lives in the repo so cohort context stays alongside code context — when you
`cd` into the project, everything you need is here. No separate Notion, no
external dashboard to remember to check.

## Workflow

1. **Identify** — pick someone who fits the target audience (DIYer or Expert)
2. **Text** — send a personal 1:1 message; mention specifically why them
3. **Log** — add a row to [`tracker.md`](./tracker.md) with their info
4. **Follow up** — 5 days after invite, send "did you get a chance to try it?"
5. **Triage feedback** — the `beta_feedback` table in Supabase captures
   in-app submissions; this file captures async/text feedback verbatim
6. **Iterate** — bugs that block flow get fixed in 24-48h; feature requests
   get noted but deferred

## Editing options

- **Direct in editor** (simplest) — open `tracker.md`, edit the markdown
  table, commit
- **Proton Sheets as working copy** — keep a live sheet for fast updates,
  paste a CSV export into `tracker.md` weekly so the repo has the snapshot
- **Future migration** (Phase B) — add a `cohort_tag` column on the
  Supabase `users` table; this file becomes a historical archive

## Privacy

`tracker.md` contains PII (names, contacts, feedback). The
`jrszilard/diy-helper-webapp` repo is currently **private**. If it ever
goes public, add `cohort/` to `.gitignore` first.

## Targets for cohort 1

- **5-10 DIYer-side users** — homeowners doing real projects, mix of skill
  levels (true beginner, weekend warrior, remodeler)
- **3-5 Expert-side users** — different trades (plumber, electrician,
  carpenter, GC, HVAC); each represents one "test specialty" for the
  cross-trade visibility filter
- **Diversity** — vary by region, home type (new build, vintage,
  apartment), and project urgency (planning, in-progress, emergency)

## Useful queries

Once `tracker.md` has rows, these one-liners help:

```bash
# Count members by signup status
grep -c "Signed Up: Y" cohort/tracker.md

# Show all expert-side members
grep "| Expert" cohort/tracker.md
```

For Supabase-side queries (signups, activity), use `npx supabase db query`
or the Studio UI — the `users` table holds the canonical signup record.
