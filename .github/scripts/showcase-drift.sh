#!/usr/bin/env bash
#
# Is this repo's project page still telling the truth?
#
# `.showcase/showcase.yaml` carries the copy myportfolio renders as the public
# project page — overview, tech stack, how-it-works, architecture. It is
# written once, by hand or by the prep skill, and then quietly goes stale: the
# project grows a whole subsystem and its architecture diagram still describes
# registration day. Nothing fails, which is exactly why nobody notices.
#
# This compares the last commit that touched the manifest against the last
# commit that touched the code, and reports the gap. No LLM, no network, no
# platform involvement — just git.
#
# Usage:
#   showcase-drift.sh [--max-commits N] [--max-days N] [path]
#
# Exits 1 when the manifest is behind by more than the thresholds, so it can
# gate CI. Exits 0 with a note when there is no manifest at all — a repo that
# isn't a myportfolio demo shouldn't fail its build over this.

set -euo pipefail

MAX_COMMITS=25
MAX_DAYS=90
REPO="."

while [ $# -gt 0 ]; do
  case "$1" in
    --max-commits) MAX_COMMITS="$2"; shift 2 ;;
    --max-days) MAX_DAYS="$2"; shift 2 ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) REPO="$1"; shift ;;
  esac
done

cd "$REPO"
MANIFEST=".showcase/showcase.yaml"

if [ ! -f "$MANIFEST" ]; then
  echo "no $MANIFEST — not a myportfolio demo, nothing to check"
  exit 0
fi

manifest_commit=$(git log -1 --format=%H -- "$MANIFEST" 2>/dev/null || true)
if [ -z "$manifest_commit" ]; then
  echo "⚠ $MANIFEST exists but has never been committed — commit it before registering"
  exit 1
fi

# Commits since the manifest last changed, excluding commits that ONLY touched
# the manifest itself, docs, or CI config: a README tweak is not a reason to
# redraw an architecture diagram, and counting it would train people to ignore
# this check.
behind=$(git rev-list --count "${manifest_commit}..HEAD" -- \
  . ":(exclude).showcase/**" ":(exclude)*.md" ":(exclude)docs/**" ":(exclude).github/**" 2>/dev/null || echo 0)

manifest_date=$(git log -1 --format=%cs -- "$MANIFEST")
manifest_epoch=$(git log -1 --format=%ct -- "$MANIFEST")
now_epoch=$(git log -1 --format=%ct HEAD)
days=$(( (now_epoch - manifest_epoch) / 86400 ))

echo "project page last updated: $manifest_date ($days days, $behind code commits ago)"

stale=0
[ "$behind" -gt "$MAX_COMMITS" ] && stale=1
[ "$days" -gt "$MAX_DAYS" ] && stale=1

if [ "$stale" -eq 1 ]; then
  cat <<EOF

⚠ The project page may no longer describe this project.

  $behind code commits and $days days since $MANIFEST changed
  (thresholds: $MAX_COMMITS commits, $MAX_DAYS days)

  Re-run the generator in this repo and review the diff:
      /myportfolio-dockerfile     (or /myportfolio-setup)

  Then commit the updated manifest. myportfolio re-reads it on the next
  registration or refresh — no redeploy of the platform needed.
EOF
  exit 1
fi

echo "✓ project page is current enough (thresholds: $MAX_COMMITS commits, $MAX_DAYS days)"
