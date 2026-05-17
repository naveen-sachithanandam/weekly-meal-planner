# Spec: 003 — Shopping List

---

## Goals

### Primary goal
The Shopper can see every **approved** ingredient for a selected week in one list,
ready for a grocery run — without re-reading each meal slot on the grid.

### Success criteria
1. Shopping list is reachable from main navigation.
2. List shows deduplicated approved ingredient names for the week (Sunday-start, home timezone).
3. Week selector matches the meal plan (previous / current / next).
4. Empty state when no ingredients are approved.
5. Print-friendly layout hides chrome for in-store use.

---

## Anti-Goals

1. **Inventory or pantry tracking** — no quantities on hand, no auto-subtraction.
2. **Editing ingredients on the shopping list** — approval happens on the meal grid only.
3. **Multi-week aggregation** — one week at a time.
4. **Cloud sync or sharing** — local household app only.

---

## Personas

### Shopper (primary)
Uses the list on a phone or printed page while shopping. Expects the list to update after
the Planner approves ingredients on the grid.

---

## User Journeys

### Journey 1 — Weekly shop
The Shopper opens Shopping list for the current week. They see alphabetized ingredients
that were approved on the meal plan. They print or use the page in the store.

### Journey 2 — Plan ahead
The Shopper switches to next week. The list updates to show approvals for that week only.

---

## Acceptance Criteria

### AC-001 — Navigation
Given the app is loaded  
Then a link to `/shopping` is visible in the main nav

### AC-002 — Approved ingredients only
Given meal slots in the week have mixed approved/unapproved ingredients  
Then the list includes only ingredients with `approved: true`

### AC-003 — Deduplication
Given the same ingredient name appears on multiple slots (any casing)  
Then it appears once in the list (first-seen casing preserved)

### AC-004 — Week boundaries
Given the home timezone week starts Sunday 00:00  
Then the list uses the same week window as `GET /api/meal-plan`

### AC-005 — Week navigation
Given the user changes week on the shopping list  
Then the list reflects that week's approvals (offset −1, 0, +1)

### AC-006 — Empty state
Given no approved ingredients exist for the week  
Then a clear empty message is shown

### AC-007 — Print layout
Given the user prints the shopping list page  
Then navigation and helper text are hidden and the ingredient list is readable

---

## Dependencies

- **Feature 001** — `Ingredient.approved` on meal slots; approval UI on the grid.
- **Feature 002** — none (meal types do not affect the list).
