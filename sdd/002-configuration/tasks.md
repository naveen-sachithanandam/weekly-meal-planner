# Tasks: 002 — Configuration Page

Derived from: `sdd/002-configuration/plan.md`
Spec: `sdd/002-configuration/spec.md`
Constitution: `.cursor/rules/project-constitution.mdc`
Depends on: Feature 001 fully complete (all T001–T016 committed)

Each task is one Cursor conversation. Complete tasks in order.
One task per chat, one commit per task.

---

## T201 — GET /api/configuration/meal-types

**Implements:** plan.md §2 — GET /api/configuration/meal-types
**Files:** `app/api/configuration/meal-types/route.ts`

Create the GET route handler. Return all `MealTypeConfig` records
(active and inactive) ordered by `sortOrder` ascending.

**Done when:**
- `GET /api/configuration/meal-types` returns all records in sort order.
- Response includes `isActive` field on each record.
- Empty database (no records) returns `{ "mealTypes": [] }`.

**Do not:** filter out inactive records — the settings page needs to show them.

---

## T202 — POST /api/configuration/meal-types

**Implements:** plan.md §2 — POST /api/configuration/meal-types
**Files:** `app/api/configuration/meal-types/route.ts` (add to existing file)

Add the POST handler. Validate name uniqueness (case-insensitive).
Assign `sortOrder` as `(max existing sortOrder) + 1`.

**Done when:**
- POST with a new name creates the record and returns it.
- POST with a duplicate name (any case) returns `409`.
- POST with a blank name returns `400`.
- `sortOrder` is always `max + 1`, never duplicated.

---

## T203 — PATCH /api/configuration/meal-types/[id]

**Implements:** plan.md §2 — PATCH /api/configuration/meal-types/[id], spec AC-003/AC-005
**Files:** `app/api/configuration/meal-types/[id]/route.ts`

Accept optional `name`, `sortOrder`, `isActive`. Apply only the provided fields.

Validation:
- Renamed `name` must not conflict with another record. Returns `409`.
- `isActive: false` rejected if this is the last active record. Returns `400`.

**Done when:**
- PATCH with new `name` updates the record; existing slots unaffected.
- PATCH with `isActive: false` on last active type returns `400`.
- PATCH with `isActive: false` on non-last type deactivates it.
- Returns updated record.

---

## T204 — DELETE + reorder /api/configuration/meal-types

**Implements:** plan.md §2 — DELETE and PATCH reorder
**Files:** `app/api/configuration/meal-types/[id]/route.ts` (add DELETE),
           `app/api/configuration/meal-types/reorder/route.ts`

Add DELETE to the `[id]` route. Reject with `409` if any `MealSlot` records
reference this `MealTypeConfig`. Return `204` on success.

Create the reorder route. Accept `{ "order": ["id1", "id2", "id3"] }`.
Reassign `sortOrder` as 1-based index position. All IDs must be valid.
Return the full updated list.

**Done when:**
- DELETE with no linked slots returns `204`.
- DELETE with linked slots returns `409`.
- Reorder updates all `sortOrder` values correctly.
- Reorder with an invalid ID returns `400`.

---

## T205 — Install @dnd-kit

**Implements:** plan.md §3 — drag-and-drop dependency
**Files:** `package.json`

Install `@dnd-kit/core` and `@dnd-kit/sortable`.

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Done when:**
- Packages appear in `package.json` dependencies.
- `npm run dev` starts without error.

**Do not:** install `react-beautiful-dnd` — it is unmaintained.

---

## T206 — AppNav layout component

**Implements:** plan.md §4, spec AC-007
**Files:** `components/layout/app-nav.tsx`, `app/layout.tsx`

Create `AppNav`:
- Renders app name linking to `/`.
- Renders a gear icon (or "Settings" text) linking to `/settings`.

Add `<AppNav />` to `app/layout.tsx` so it appears on every page.

**Done when:**
- AppNav appears on the meal grid page and the settings page.
- Clicking Settings navigates to `/settings`.
- Clicking the app name returns to `/`.

**Do not:** add any other navigation items. Keep it minimal.

---

## T207 — AddMealTypeForm + GET wire-up

**Implements:** plan.md §3, spec AC-001/AC-002
**Files:** `components/configuration/configuration-page.tsx`,
           `components/configuration/add-meal-type-form.tsx`,
           `app/settings/page.tsx`

Create `AddMealTypeForm`:
- Controlled text input for meal type name.
- Confirm button that POSTs to `/api/configuration/meal-types`.
- Inline error message on `409` (duplicate) or `400` (blank).
- On success: clears input and triggers SWR revalidation.

Create `ConfigurationPage`:
- Fetches meal types via SWR from `GET /api/configuration/meal-types`.
- Renders `<AddMealTypeForm>` and a placeholder for the list (T208).

Create `app/settings/page.tsx` that renders `<ConfigurationPage />`.

**Done when:**
- `/settings` loads and shows the add form.
- Adding a new meal type saves and appears in the list (SWR revalidates).
- Duplicate name shows an inline error.

---

## T208 — MealTypeList + MealTypeRow (rename + deactivate)

**Implements:** plan.md §3, spec AC-003/AC-005
**Files:** `components/configuration/meal-type-list.tsx`,
           `components/configuration/meal-type-row.tsx`

Create `MealTypeRow`:
- Displays meal type name with an inline edit control (click to rename).
- On rename confirm: PATCH `name` and revalidate SWR.
- Toggle to activate/deactivate (`isActive`). On change: PATCH `isActive`.
- Delete button: calls DELETE. If `409`, shows message suggesting deactivation instead.

Create `MealTypeList`:
- Renders a `MealTypeRow` for each record (active and inactive).
- Shows inactive rows visually distinct (greyed out or "inactive" label).
- No drag-and-drop yet (added in T209).

Wire `MealTypeList` into `ConfigurationPage`.

**Done when:**
- All meal types show in the settings list.
- Renaming a type updates the record and the grid shows the new name.
- Deactivating a type hides it from the meal grid but keeps it in the settings list.
- Deleting a type with no slots removes it; with slots shows the deactivation suggestion.
- Last active type cannot be deactivated (button disabled or shows error).

---

## T209 — Drag-and-drop reorder

**Implements:** plan.md §3, spec AC-004
**Files:** `components/configuration/meal-type-list.tsx`

Add drag-and-drop reorder to `MealTypeList` using `@dnd-kit/core` and
`@dnd-kit/sortable`. On drop: call `PATCH /api/configuration/meal-types/reorder`
with the new order array. Revalidate SWR on success.

Optimistic update: reorder the list locally on drag end, then confirm via API.
If the API call fails, revert to the previous order.

**Done when:**
- Meal types can be dragged and reordered on the settings page.
- The meal grid reflects the new order on next load.
- API failure reverts the local reorder.
- Drag handles are keyboard-accessible (dnd-kit default).

**Do not:** persist the order until the API call succeeds.

---

## Completion checklist

Before marking Feature 002 done, verify every acceptance criterion
from `spec.md` manually:

- [x] AC-001 — Settings page shows all active meal types in sort order
- [x] AC-002 — Adding a new meal type appears on the grid immediately
- [x] AC-003 — Renaming a meal type updates the grid; existing slots unaffected
- [x] AC-004 — Reordering meal types updates the grid row order
- [x] AC-005 — Deactivating a type removes it from the grid; slots preserved
- [x] AC-006 — Duplicate name rejected with inline error
- [x] AC-007 — Settings link visible from the meal grid page
