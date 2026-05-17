#!/bin/bash
# Run from weekly-meal-planner repo root.
# Creates Feature 002 vertical-slice issues (see conversation / to-issues breakdown).

set -euo pipefail

REPO="naveen-sachithanandam/weekly-meal-planner"
FEATURE_LABEL="feature-002"
AGENT_LABEL="ready-for-agent"

issue_body() {
  local what="$1"
  local criteria="$2"
  local blocked="$3"
  cat <<EOF
## What to build

$what

## Acceptance criteria

$criteria

## Blocked by

$blocked

---
_Spec: \`sdd/002-configuration/spec.md\` · Plan: \`sdd/002-configuration/plan.md\` · Constitution: \`.cursor/rules/project-constitution.mdc\`_
EOF
}

create_issue() {
  local title="$1"
  local what="$2"
  local criteria="$3"
  local blocked="$4"
  local body
  body="$(issue_body "$what" "$criteria" "$blocked")"
  local url
  url="$(gh issue create --repo "$REPO" --label "$FEATURE_LABEL" --label "$AGENT_LABEL" --title "$title" --body "$body")"
  echo "${url##*/}"
}

gh label create "$FEATURE_LABEL" --description "Feature 002 — Configuration Page" --color "1d76db" --repo "$REPO" 2>/dev/null || true
gh label create "$AGENT_LABEL" --description "Fully specified, ready for an AFK agent" --color "0e8a16" --repo "$REPO" 2>/dev/null || true

echo "Creating Feature 002 issues..."

PREV=$(create_issue "Settings shell — navigate and view meal types" \
  "Tracer bullet: GET meal types API, AppNav, /settings page with read-only list." \
  "- [ ] GET /api/configuration/meal-types returns all records ordered by sortOrder, including isActive
- [ ] App nav on all pages; Settings → /settings
- [ ] /settings lists meal types in order" \
  "None — can start immediately")
echo "✓ #${PREV}"

BLOCKER="#${PREV}"
for title in \
  "Add a meal type from settings" \
  "Rename a meal type inline" \
  "Deactivate, reactivate, and delete meal types" \
  "Reorder meal types with drag-and-drop"
do
  PREV=$(create_issue "$title" "(See spec/plan for full acceptance criteria.)" \
  "- [ ] See sdd/002-configuration/spec.md" \
  "$BLOCKER")
  echo "✓ #${PREV}"
done

echo "Done: https://github.com/$REPO/issues?q=label%3A${FEATURE_LABEL}"
