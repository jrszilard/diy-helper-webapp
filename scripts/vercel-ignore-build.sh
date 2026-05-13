#!/usr/bin/env bash
# Vercel "Ignored Build Step" command.
# Exit 0 = skip this deploy, Exit 1 = proceed with deploy.
#
# Configure in Vercel: Settings -> Git -> Ignored Build Step
#   Command: bash scripts/vercel-ignore-build.sh
#
# Why this exists:
# Renovate-bot PRs run GitHub Actions CI (which uses placeholder secrets,
# never reads real env). Vercel preview deploys, in contrast, run with
# real preview-scoped env vars. A malicious package landing in a Renovate
# PR could exfil those during `next build` even without merging.
# Blocking previews for renovate/* branches closes that channel while
# leaving human-authored PR previews intact.

set -euo pipefail

BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

case "$BRANCH" in
  renovate/*|dependabot/*)
    echo "Skipping Vercel deploy for bot branch: $BRANCH"
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
