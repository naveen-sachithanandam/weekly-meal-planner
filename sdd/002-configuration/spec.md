# Spec: 002 — Configuration Page

---

## Goals

### Primary goal
A household can view and manage all application configuration in a single
settings page — without editing code, environment files, or the database
directly. On day one, this means managing meal types. The page is designed
to be extended as future configuration surfaces are added.

### Success criteria
1. A user can see all currently active meal types in the order they appear
   on the meal grid.
2. A user can add a new meal type by name. It appears on the grid immediately.
3. A user can rename an existing meal type. Existing meal slots are not affected.
   Row labels on the meal plan grid show the new name on next load (Feature 001 AC-009).
4. A user can reorder meal types. The grid reflects the new order on next load,
   including meal type row labels and slot alignment (Feature 001 AC-009).
5. A user can deactivate a meal type. It disappears from the grid but its
   historical slots are preserved.
6. The settings page is reachable from the main meal grid via a persistent
   navigation link.

---

## Anti-Goals

1. **Per-day meal type overrides.** All days in the grid share the same
   meal type configuration. Day-specific overrides are out of scope.

2. **Hard-delete of meal types with slots.** A meal type that has existing
   meal slots cannot be permanently deleted — only deactivated. Destructive
   deletes with cascade are out of scope for this feature.

3. **Other settings surfaces.** Timezone, Ollama host, cuisine context,
   and other env-var-based config are not moved to the DB in this feature.
   The configuration page is scoped to meal types only.

4. **Access control.** No password or PIN on the settings page. Single
   household, trusted network.

---

## Personas

Same as Feature 001 — the Planner and the Shopper both have access to
the settings page. No role distinction.

---

## User Journeys

### Journey 1 — Adding a new meal type
The Planner wants to add "Evening Snack" as a fourth meal row. They open
the Settings page, type "Evening Snack" in the add field, and confirm.
The new meal type appears at the bottom of the list (highest sortOrder).
When they return to the meal grid, the new row is visible on every day column.

### Journey 2 — Reordering meal types
The Planner decides Dinner should appear before Lunch in the grid. They drag
Dinner above Lunch on the Settings page and save. The meal grid reflects the
new order immediately.

### Journey 3 — Renaming a meal type
The Planner renames "Dinner" to "Main Meal". All new slots will reference
the updated name. Existing meal slot data is unaffected — the underlying
`MealTypeConfig` record ID is unchanged.

### Journey 4 — Deactivating a meal type
The household decides they no longer want to plan snacks. The Planner
deactivates "Evening Snack". It disappears from the meal grid. Any past
slots for "Evening Snack" are retained in the database for history, but
the type no longer appears as a plannable row.

---

## Acceptance Criteria

### AC-001 — View meal types
Given the user navigates to `/settings`
Then they see a list of all active meal types in sort order
And each entry shows the meal type name and its current order position

### AC-002 — Add meal type
Given the user enters a new meal type name and confirms
Then the new meal type is saved with the next available `sortOrder`
And it appears immediately at the bottom of the settings list
And the meal grid shows the new row on next load

### AC-003 — Rename meal type
Given the user edits an existing meal type name and saves
Then the `MealTypeConfig.name` is updated
And the grid shows the new name
And existing `MealSlot` records are not altered

### AC-004 — Reorder meal types
Given the user drags a meal type to a new position and saves
Then `sortOrder` values are updated for all affected records
And the meal grid renders rows in the new order

### AC-005 — Deactivate meal type
Given the user deactivates a meal type
Then `MealTypeConfig.isActive` is set to false
And the type no longer appears in the meal grid
And existing meal slots for that type are preserved in the database
And a reactivation option is available on the settings page

### AC-006 — Prevent duplicate names
Given the user tries to add or rename a meal type to a name that already exists
Then the save is rejected with a clear inline error
And no record is created or modified

### AC-007 — Navigation link
Given the user is on any page of the app
Then a persistent settings link (gear icon or "Settings") is visible
And clicking it navigates to `/settings`

---

## Assumptions and Dependencies

### Assumptions
1. Meal type names must be unique (enforced by `MealTypeConfig.name @unique`).
2. Sort order is managed as an integer — the UI resolves reorder operations
   to new integer values before saving. Gaps between values are acceptable.
3. There must always be at least one active meal type. The UI prevents
   deactivating the last remaining active meal type.
4. Hard-delete is only permitted for meal types that have zero associated
   `MealSlot` records. Otherwise, deactivate only.

### Dependencies
1. **Feature 001 — Weekly Meal Plan Grid** — must be complete. The
   `MealTypeConfig` model and seed data are created in Feature 001 (T002).
   Feature 002 manages that data via a UI.
2. **Prisma `MealTypeConfig` model** — defined in Feature 001. No schema
   changes required for Feature 002 unless a new field is needed.
