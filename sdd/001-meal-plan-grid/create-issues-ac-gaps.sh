#!/bin/bash
# Supplemental issues for Feature 001 — AC-009 and AC-010 (grid UX gaps).
# Run from weekly-meal-planner repo root. Requires: gh auth login

set -euo pipefail

REPO="naveen-sachithanandam/weekly-meal-planner"
FEATURE_LABEL="feature-001"
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
_Spec: \`sdd/001-meal-plan-grid/spec.md\` (AC-009 / AC-010) · Plan: \`sdd/001-meal-plan-grid/plan.md\` · Constitution: \`.cursor/rules/project-constitution.mdc\`_
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

echo "Creating Feature 001 gap issues (AC-009, AC-010)..."

NUM9=$(create_issue "AC-009 — Meal type row labels on planner grid" \
  "Tracer bullet: the weekly meal plan grid shows each active meal type name (from \`mealTypes[]\`) as visible row labels so users know which row is Breakfast, Lunch, etc. Prefer a left row-title column aligned with slot rows across all seven day columns." \
  "- [ ] Each active meal type has a visible label from the API (not hardcoded)
- [ ] Labels align with slot rows across the week
- [ ] Row count matches \`mealTypes.length\`
- [ ] Renamed/reordered types from Feature 002 reflect on next meal-plan load" \
  "None — can start immediately (Feature 001 base grid complete)")
echo "✓ AC-009 → #$NUM9"

NUM10=$(create_issue "AC-010 — Edit and Delete on filled meal tiles" \
  "Tracer bullet: filled meal slots on today and future days show explicit Edit and Delete controls. Edit opens the inline meal form. Delete confirms, calls DELETE /api/meal-slots/[id], and returns the tile to empty state." \
  "- [ ] Visible Edit and Delete on filled non-past tiles (accessible labels)
- [ ] Edit opens meal name + toddler-appropriate form
- [ ] Delete confirms before API call
- [ ] DELETE clears slot and ingredients; SWR revalidates to empty state
- [ ] Past days show no Edit or Delete
- [ ] Ingredient-list edit remains distinct from tile Edit" \
  "None — can start immediately (DELETE API exists)")
echo "✓ AC-010 → #$NUM10"

echo ""
echo "https://github.com/$REPO/issues?q=label%3A$FEATURE_LABEL"
