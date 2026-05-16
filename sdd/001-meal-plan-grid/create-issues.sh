#!/bin/bash
# Run from weekly-meal-planner repo root.
# Requires: gh auth login
# Creates Feature 001 tasks as GitHub issues (to-issues skill format).

set -euo pipefail

REPO="naveen-sachithanandam/weekly-meal-planner"
FEATURE_LABEL="feature-001"
AGENT_LABEL="ready-for-agent"

create_labels() {
  gh label create "$FEATURE_LABEL" --description "Feature 001 — Weekly Meal Plan Grid" --color "0075ca" --repo "$REPO" 2>/dev/null || true
  gh label create "$AGENT_LABEL" --description "Fully specified, ready for an AFK agent" --color "0e8a16" --repo "$REPO" 2>/dev/null || true
}

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
_Spec: \`sdd/001-meal-plan-grid/spec.md\` · Plan: \`sdd/001-meal-plan-grid/plan.md\` · Constitution: \`.cursor/rules/project-constitution.mdc\`_
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

create_labels

echo "Creating Feature 001 issues..."

PREV=$(create_issue "T001 — Environment setup" \
  "Bootstrap app configuration: committed \`.env.example\` with \`HOME_TIMEZONE\`, \`OLLAMA_HOST\`, \`OLLAMA_MODEL\`, optional \`CUISINE_CONTEXT\`, and \`DATABASE_URL\`; gitignored \`.env.local\` for local values; and \`lib/config.ts\` that validates required vars at startup and exports typed constants. No \`process.env\` usage outside config." \
  "- [ ] \`.env.example\` committed with all keys (including optional \`CUISINE_CONTEXT\`)
- [ ] \`lib/config.ts\` throws on missing required vars
- [ ] \`npm run dev\` starts when \`.env.local\` is present
- [ ] No hardcoded household values in source" \
  "None — can start immediately")
echo "✓ T001 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T002 — Prisma schema" \
  "Add \`MealSlot\`, \`Ingredient\`, and \`ToddlerOverride\` models plus \`MealType\` and \`IngredientsStatus\` enums exactly as in plan §1. Run migration and \`prisma generate\`." \
  "- [ ] All three models and both enums in \`schema.prisma\`
- [ ] Migration exists under \`prisma/migrations/\`
- [ ] \`@@unique([date, mealType])\` on \`MealSlot\`
- [ ] \`npx prisma studio\` shows all tables" \
  "$BLOCKER")
echo "✓ T002 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T003 — Timezone utility" \
  "Implement \`lib/date.ts\` with \`getToday()\`, \`getWeekStart(offsetWeeks?)\`, and \`isPastDay(date)\` using \`date-fns-tz\` and home timezone from config. Never use raw \`new Date()\` for day boundaries." \
  "- [ ] All three functions exported
- [ ] \`getToday()\` returns \`YYYY-MM-DD\`
- [ ] \`getWeekStart(0)\` is most recent Sunday; \`getWeekStart(1)\` is next Sunday
- [ ] \`isPastDay('2000-01-01')\` true; \`isPastDay('2099-01-01')\` false" \
  "$BLOCKER")
echo "✓ T003 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T004 — Toddler schedule utility" \
  "Pure function \`isToddlerHome(date, overrides)\` in \`lib/toddler.ts\`: weekend default home, overrides win (\`isHome: false\` on weekend → false; \`isHome: true\` on weekday → true). No DB calls inside the utility." \
  "- [ ] Saturdays and Sundays return true by default
- [ ] Weekend override \`isHome: false\` returns false
- [ ] Weekday override \`isHome: true\` returns true" \
  "$BLOCKER")
echo "✓ T004 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T005 — GET /api/meal-plan" \
  "Route handler for weekly meal plan: optional \`week\` query (Sunday \`YYYY-MM-DD\`), default current week. Return plan §2 shape with 7 days, slots, \`isPast\`, and \`isToddlerHome\`." \
  "- [ ] \`GET /api/meal-plan\` returns current week JSON
- [ ] \`?week=\` returns that specific week
- [ ] Empty week has 7 days with empty \`slots[]\`
- [ ] \`isPast\` and \`isToddlerHome\` correct" \
  "$BLOCKER")
echo "✓ T005 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T006 — POST /api/meal-slots + Ollama integration" \
  "POST saves a meal slot immediately (403 past day, 409 duplicate). Fire-and-forget \`generateIngredients\` in \`lib/ollama.ts\` after response. Ollama prompt uses optional \`CUISINE_CONTEXT\` from config and household cuisine guidance from \`.cursor/rules/household-context.mdc\` (private, not committed). 10s timeout; \`PENDING\`/\`EMPTY\`/\`FAILED\`/\`READY\` per plan §4." \
  "- [ ] Response returns before Ollama completes
- [ ] Past day → 403; duplicate → 409
- [ ] Ollama up → ingredients eventually \`READY\`
- [ ] Ollama down → slot saves with \`EMPTY\`" \
  "$BLOCKER")
echo "✓ T006 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T007 — PATCH /api/meal-slots/[id]" \
  "PATCH accepts \`mealName\` and/or \`isToddlerAppropriate\`. New meal name clears ingredients, sets \`PENDING\`, re-runs Ollama async. 403 on past days. No Ollama re-run if name unchanged (AC-008)." \
  "- [ ] New \`mealName\` discards ingredients and re-runs Ollama
- [ ] \`isToddlerAppropriate\`-only update does not re-run Ollama
- [ ] Past day → 403" \
  "$BLOCKER")
echo "✓ T007 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T008 — DELETE /api/meal-slots/[id]" \
  "DELETE meal slot by id (ingredients cascade). 403 past day. 204 on success." \
  "- [ ] Slot and ingredients removed
- [ ] Past day → 403
- [ ] Success → 204 no body" \
  "$BLOCKER")
echo "✓ T008 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T009 — PATCH /api/meal-slots/[id]/ingredients" \
  "Replace entire ingredient list for a slot; set \`ingredientsStatus\` to \`READY\`; return updated slot." \
  "- [ ] PATCH replaces all ingredients
- [ ] Status \`READY\` after update
- [ ] Response includes updated slot" \
  "$BLOCKER")
echo "✓ T009 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T010 — POST /api/toddler-overrides" \
  "Upsert toddler home override. When \`isHome: true\` and meals exist, return \`conflicts\` for non–toddler-appropriate slots unless \`force: true\` (AC-006)." \
  "- [ ] Saves on day with no meals
- [ ] Conflict array when spicy meals planned
- [ ] \`force: true\` saves despite conflicts
- [ ] Response matches plan §2" \
  "$BLOCKER")
echo "✓ T010 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T011 — MealPlanGrid + WeekNav" \
  "Root grid: \`weekOffset\` state, SWR fetch of \`GET /api/meal-plan?week=\`, 3s poll while any slot \`PENDING\`, \`WeekNav\` for prev/current/next week (prev disabled at oldest allowed week)." \
  "- [ ] Seven columns for current week
- [ ] Week navigation loads correct data
- [ ] SWR polls only while \`PENDING\` slots exist
- [ ] SWR only (no \`useEffect\` + \`fetch\`)" \
  "$BLOCKER")
echo "✓ T011 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T012 — DayColumn + DayHeader" \
  "Per-day column with header (date, toddler indicator, toddler-home toggle calling toddler-overrides API with conflict prompt before \`force: true\`). Grey past days. Three meal slot cells per day." \
  "- [ ] Day columns render for the week
- [ ] Past days visually distinct
- [ ] Toddler indicator on home days
- [ ] Toggle + conflict flow works" \
  "$BLOCKER")
echo "✓ T012 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T013 — MealSlotCell orchestrator" \
  "Orchestrate empty / editing / filled / read-only (past) states. Local \`isEditing\`. Delegate API calls to children (AC-001, AC-004)." \
  "- [ ] Past cells read-only, non-interactive
- [ ] Empty → empty state; filled → filled or editing
- [ ] Click filled cell enters edit mode" \
  "$BLOCKER")
echo "✓ T013 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T014 — MealSlotEmpty + MealSlotEditing" \
  "Empty placeholder opens edit form. Editing: meal name, toddler-appropriate toggle, confirm/cancel. Confirm POSTs meal slot and revalidates SWR (AC-001)." \
  "- [ ] Empty cell opens form
- [ ] Confirm saves via POST and exits edit
- [ ] Cancel discards without API call
- [ ] Toddler question in confirm flow" \
  "$BLOCKER")
echo "✓ T014 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T015 — MealSlotFilled + IngredientList + IngredientLoading" \
  "Filled cell shows name (click to edit), spinner when \`PENDING\`, ingredient list when \`READY\`, unavailable + manual add when \`FAILED\`/\`EMPTY\` (AC-002, AC-003)." \
  "- [ ] \`PENDING\` shows spinner
- [ ] \`READY\` shows list with approve checkboxes
- [ ] \`FAILED\`/\`EMPTY\` shows message + manual add
- [ ] Approval PATCHes ingredients API" \
  "$BLOCKER")
echo "✓ T015 → #$PREV"

BLOCKER="#$PREV"
PREV=$(create_issue "T016 — Wire up page.tsx" \
  "Home page renders \`MealPlanGrid\` with a title — end-to-end demo of the weekly grid in the browser." \
  "- [ ] \`npm run dev\` shows meal plan at localhost:3000
- [ ] Full week visible; navigation and slot entry work" \
  "$BLOCKER")
echo "✓ T016 → #$PREV"

echo ""
echo "All 16 Feature 001 issues created."
echo "https://github.com/$REPO/issues?q=label%3A$FEATURE_LABEL"
