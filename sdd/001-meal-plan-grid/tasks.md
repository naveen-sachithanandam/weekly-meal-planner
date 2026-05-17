# Tasks: 001 — Weekly Meal Plan Grid

Derived from: `sdd/001-meal-plan-grid/plan.md`
Spec: `sdd/001-meal-plan-grid/spec.md`
Constitution: `.cursor/rules/project-constitution.mdc`

Each task is one Cursor conversation. Complete tasks in order —
later tasks depend on earlier ones. Do not skip ahead.

---

## T000 — Docker setup

**Implements:** plan.md §8
**Files:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`

Create a multi-stage `Dockerfile` exactly as specified in plan.md §8:
stage 1 (deps), stage 2 (builder — runs `prisma generate` and `npm run build`),
stage 3 (runner — copies `.next/standalone`, static assets, prisma client).

Create `docker-compose.yml` with a single `app` service:
- Binds port 3000.
- Loads `.env.local` via `env_file`.
- Overrides `DATABASE_URL` to `file:/data/meal-planner.db`.
- Overrides `OLLAMA_HOST` to `http://host.docker.internal:11434`.
- Mounts a named volume `meal-db` at `/data`.
- Adds `extra_hosts: host.docker.internal:host-gateway` for Linux compatibility.
- Sets `restart: unless-stopped`.

Create `.dockerignore` excluding `node_modules`, `.next`, `*.db`, `.env.local`.

**Done when:**
- `docker compose build` completes without error.
- `docker compose up` starts the container.
- App is accessible at `http://localhost:3000` from the host.
- Stopping and restarting the container does not lose database data (volume persists).
- `OLLAMA_HOST` resolves correctly from inside the container.

**Do not:** add Ollama as a Docker service. It runs on the host only.
**Do not:** copy `.env.local` into the image — inject it at runtime via `env_file`.
**Do not:** use `next.config.js output: 'export'` — use `output: 'standalone'` for Docker.

---

## T001 — Environment setup

**Implements:** plan.md §7
**Files:** `.env.local`, `.env.example`

Create `.env.example` (committed) with the following keys and no values:

```
HOME_TIMEZONE=
OLLAMA_HOST=
OLLAMA_MODEL=
DATABASE_URL=
```

Create `.env.local` (gitignored) with real values for local development
(bare `npm run dev`, not Docker):

```
HOME_TIMEZONE=America/Chicago
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
DATABASE_URL=file:./dev.db
```

Note: when running via Docker, `docker-compose.yml` overrides `DATABASE_URL`
to `file:/data/meal-planner.db` (the volume path) and `OLLAMA_HOST` to
`http://host.docker.internal:11434`. The `.env.local` values are for local dev only.

Add a startup check in `lib/config.ts` that reads these variables and
throws a clear error at boot if any required variable is missing.
Export typed constants: `HOME_TIMEZONE`, `OLLAMA_HOST`, `OLLAMA_MODEL`.

**Done when:**
- `.env.example` is committed with all keys.
- `lib/config.ts` throws on missing required vars.
- `npm run dev` starts without error when `.env.local` is present.

**Do not:** hardcode any value. Do not use `process.env` directly
outside of `lib/config.ts`.

---

## T002 — Prisma schema + seed

**Implements:** plan.md §1
**Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `package.json`

Add four models and one enum to the Prisma schema exactly as specified
in plan.md §1: `MealTypeConfig`, `MealSlot`, `Ingredient`,
`ToddlerOverride`, `IngredientsStatus` enum. There is no `MealType` enum —
meal types are DB records, not an enum.

Run `npx prisma migrate dev --name add-meal-planner` to create the
migration. Run `npx prisma generate` to regenerate the client.

Create `prisma/seed.ts` that inserts the three default meal types
(Breakfast, Lunch, Dinner) using `skipDuplicates: true`. Configure it
in `package.json` under `"prisma": { "seed": "ts-node prisma/seed.ts" }`.
Run `npx prisma db seed` to verify.

**Done when:**
- `prisma/schema.prisma` contains all four models and `IngredientsStatus` enum.
- No `MealType` enum exists anywhere in the schema.
- Migration file exists under `prisma/migrations/`.
- `npx prisma studio` shows all four tables including `MealTypeConfig`.
- `@@unique([date, mealTypeConfigId])` constraint is present on `MealSlot`.
- `npx prisma db seed` inserts Breakfast/Lunch/Dinner without error.
- Re-running seed does not create duplicates.

**Do not:** use a `MealType` enum. Do not hardcode meal type strings in the schema.

---

## T003 — Timezone utility

**Implements:** plan.md §5
**Files:** `lib/date.ts`

Create `lib/date.ts` with three exported functions, exactly as specified
in plan.md §5:

- `getToday(): string` — returns today's date as `YYYY-MM-DD` in home timezone.
- `getWeekStart(offsetWeeks?: number): string` — returns the Sunday of the
  current week (+ offset) as `YYYY-MM-DD` in home timezone.
- `isPastDay(date: string): boolean` — returns true if date is before today.

Use `date-fns-tz` and `date-fns`. Import `HOME_TIMEZONE` from `lib/config.ts`.
Never use `new Date()` for day boundary logic.

**Done when:**
- All three functions are exported from `lib/date.ts`.
- `getToday()` returns a string matching `YYYY-MM-DD`.
- `getWeekStart(0)` returns the most recent Sunday.
- `getWeekStart(1)` returns next Sunday.
- `isPastDay('2000-01-01')` returns true.
- `isPastDay('2099-01-01')` returns false.

**Do not:** import `process.env.HOME_TIMEZONE` directly — use `lib/config.ts`.

---

## T004 — Toddler schedule utility

**Implements:** plan.md §6
**Files:** `lib/toddler.ts`

Create `lib/toddler.ts` with one exported function:

`isToddlerHome(date: string, overrides: ToddlerOverride[]): boolean`

Logic (from plan.md §6):
1. If a `ToddlerOverride` exists for this date with `isHome: false` → return false.
2. If a `ToddlerOverride` exists for this date with `isHome: true` → return true.
3. If the day of the week is Saturday or Sunday → return true.
4. Otherwise → return false.

Import `ToddlerOverride` type from `@prisma/client`.

**Done when:**
- Function correctly returns true for Saturdays and Sundays.
- Override with `isHome: false` on a weekend returns false.
- Override with `isHome: true` on a weekday returns true.
- No database calls inside this function — it works on passed-in data.

**Do not:** fetch from the database inside this utility. Keep it pure.

---

## T005 — GET /api/meal-plan

**Implements:** plan.md §2 — GET /api/meal-plan
**Files:** `app/api/meal-plan/route.ts`

Create the route handler. Accept optional `week` query param (Sunday date,
`YYYY-MM-DD`). If omitted, default to current week's Sunday via `getWeekStart()`.

Fetch from Prisma in a single query pass:
- All active `MealTypeConfig` records ordered by `sortOrder` ascending.
- All `MealSlot` records (with `mealTypeConfig` and `ingredients`) where
  date falls in the 7-day window from `weekStart` to `weekStart + 6 days`.
- All `ToddlerOverride` records for those 7 dates.

Build and return the response shape from plan.md §2 exactly:
- `weekStart` string
- `mealTypes[]` — active meal types in sort order
- `days[]` — one entry per day, with `date`, `isToddlerHome`, `isPast`, `slots[]`

Use `isToddlerHome()` from `lib/toddler.ts`.
Use `isPastDay()` from `lib/date.ts`.

**Done when:**
- `GET /api/meal-plan` returns a valid JSON response for the current week.
- `GET /api/meal-plan?week=2025-01-05` returns that specific week.
- Response includes `mealTypes[]` with all active meal types in sort order.
- Empty weeks return 7 days with empty `slots[]` arrays.
- `isPast` is correctly set for past days.
- `isToddlerHome` is correctly set for weekends.

**Do not:** compute dates using `new Date()` directly. Do not return
data outside the response shape in plan.md §2.

---

## T006 — POST /api/meal-slots

**Implements:** plan.md §2 — POST /api/meal-slots, plan.md §4
**Files:** `app/api/meal-slots/route.ts`, `lib/ollama.ts`

Create the POST route handler:
1. Validate the request body (`date`, `mealTypeConfigId`, `mealName`, `isToddlerAppropriate`).
2. Reject with `403` if `date` is a past day.
3. Reject with `400` if `mealTypeConfigId` does not reference an active `MealTypeConfig`.
4. Reject with `409` if `[date, mealTypeConfigId]` already exists.
5. Check if Ollama is reachable (simple GET to `${OLLAMA_HOST}`).
6. Save the `MealSlot` with `ingredientsStatus: PENDING` (if Ollama reachable)
   or `EMPTY` (if not).
7. Return the saved slot immediately.
8. After returning, fire `void generateIngredients(slot.id, slot.mealName)`
   — defined in `lib/ollama.ts`.

Create `lib/ollama.ts` with `generateIngredients(slotId, mealName)` exactly
as specified in plan.md §4. Use `OLLAMA_HOST` and `OLLAMA_MODEL` from
`lib/config.ts`. Include the cuisine context line from `household-context.mdc`
in the Ollama prompt. Timeout: 10 seconds. On failure: set `ingredientsStatus`
to `FAILED`.

**Done when:**
- POST saves the slot and returns before Ollama responds.
- A slot on a past day returns 403.
- An invalid or inactive `mealTypeConfigId` returns 400.
- A duplicate `[date, mealTypeConfigId]` returns 409.
- When Ollama is running, `ingredientsStatus` eventually becomes `READY`
  and ingredients are populated.
- When Ollama is stopped, slot saves with `ingredientsStatus: EMPTY`.

**Do not:** await Ollama before responding. Do not block the response.

---

## T007 — PATCH /api/meal-slots/[id]

**Implements:** plan.md §2 — PATCH /api/meal-slots/[id], spec AC-008
**Files:** `app/api/meal-slots/[id]/route.ts`

Create the PATCH route handler. Accept optional `mealName` and
`isToddlerAppropriate` fields.

If `mealName` is provided and differs from the current value:
- Delete all existing `Ingredient` records for this slot.
- Reset `ingredientsStatus` to `PENDING`.
- Fire `void generateIngredients(slot.id, newMealName)` after responding.

Reject with `403` if the slot's date is a past day.

**Done when:**
- PATCH with a new `mealName` discards old ingredients and re-runs Ollama.
- PATCH with only `isToddlerAppropriate` does not re-run Ollama.
- Past day slots return 403.

**Do not:** re-run Ollama if `mealName` has not changed.

---

## T008 — DELETE /api/meal-slots/[id]

**Implements:** plan.md §2 — DELETE /api/meal-slots/[id]
**Files:** `app/api/meal-slots/[id]/route.ts` (add to existing file)

Add the DELETE handler to the same route file as T007.

Delete the `MealSlot` by id. Ingredients cascade-delete automatically
(Prisma `onDelete: Cascade`). Reject with `403` if the slot's date is
a past day. Return `204` on success.

**Done when:**
- DELETE removes the slot and its ingredients.
- Past day slots return 403.
- Returns 204 with no body on success.

---

## T009 — PATCH /api/meal-slots/[id]/ingredients

**Implements:** plan.md §2 — PATCH /api/meal-slots/[id]/ingredients
**Files:** `app/api/meal-slots/[id]/ingredients/route.ts`

Accept an `ingredients[]` array with `id`, `name`, `approved` fields.
Replace the existing ingredient list for the slot entirely — delete all
current ingredients, then create the new list. Update `ingredientsStatus`
to `READY`.

**Done when:**
- PATCH replaces all ingredients for a slot.
- `ingredientsStatus` is set to `READY` after the update.
- Returns the updated slot with its new ingredient list.

---

## T010 — POST /api/toddler-overrides

**Implements:** plan.md §2 — POST /api/toddler-overrides, spec AC-006
**Files:** `app/api/toddler-overrides/route.ts`

Accept `date` and `isHome`. Upsert a `ToddlerOverride` record.

Before saving, if `isHome: true` and meals are already planned for that
date, check each slot's `isToddlerAppropriate` flag. Return a `conflicts`
array for any slot where `isToddlerAppropriate` is false.

If `conflicts` is non-empty, do not save the override — return the
conflicts array in the response. The client will prompt the user to
resolve. Re-POST with `force: true` to save despite conflicts.

**Done when:**
- Override saves correctly for a day with no planned meals.
- Conflict detection returns the correct slots when a spicy meal
  is already planned.
- `force: true` saves the override even when conflicts exist.
- Response shape matches plan.md §2 exactly.

---

## T011 — MealPlanGrid + WeekNav

**Implements:** plan.md §3 — root component and week navigation, spec AC-005
**Files:** `components/meal-plan-grid/meal-plan-grid.tsx`,
           `components/meal-plan-grid/week-nav.tsx`

Create `MealPlanGrid` as the root component:
- Owns `weekOffset` state (number, default 0).
- Derives `weekStart` from `weekOffset` — call `GET /api/meal-plan?week=`
  via SWR, keyed by `weekStart`.
- While any slot has `ingredientsStatus === 'PENDING'`, set SWR
  `refreshInterval` to 3000ms. Otherwise set to 0.
- Renders `<WeekNav>` and 7 `<DayColumn>` components.

Create `WeekNav`:
- Renders the weekly date range as the primary navigation surface:
  `‹  May 10 – May 16  ›`
- `‹` (prev) and `›` (next) chevron buttons flank the date range string.
- A separate "This week" button resets `weekOffset` to 0.
- Prev chevron disabled when `weekOffset === -1` (oldest allowed week).
- Next chevron disabled when `weekOffset === 1` (newest allowed week).
- Date range string updates to reflect the current weekOffset.

Also add the design language CSS variables to `app/globals.css` (see plan.md §3
Design Language section). Define all `--color-*`, `--badge-*`, and `--toddler-*`
custom properties on `:root`. These variables are the single source of truth for
all colour decisions across every component in this feature.

**Done when:**
- Grid renders 7 columns for the current week.
- Clicking `‹` / `›` navigates to the correct week and updates the date range label.
- "This week" returns to offset 0.
- Prev chevron is disabled at `weekOffset === -1`; next at `weekOffset === 1`.
- SWR polls every 3s when any slot is PENDING, stops when all resolved.
- `globals.css` contains all CSS variables from plan.md §3 design language.
- Grid background uses `--color-base`; day column headers use `--color-surface`.

**Do not:** fetch data with `useEffect` + `fetch`. Use SWR only.
**Do not:** put week navigation controls anywhere other than `WeekNav`.
**Do not:** use raw hex values or default Tailwind grey/blue classes for surfaces or text — use the CSS variables.

---

## T012 — DayColumn + DayHeader

**Implements:** plan.md §3 — day column and header
**Files:** `components/meal-plan-grid/day-column.tsx`,
           `components/meal-plan-grid/day-header.tsx`

Create `DayColumn`:
- Receives a `day` object and a `mealTypes[]` array (from the API response).
- Renders `<DayHeader>` and one `<MealSlotCell>` per entry in `mealTypes[]`,
  in sort order. Never hardcode BREAKFAST / LUNCH / DINNER.
- Meal type names must be visible on the grid (spec AC-009): either a shared
  row-label column in `MealPlanGrid` or a label on each slot in the row.
- Matches each `mealType` to the corresponding slot in `day.slots[]` by
  `mealTypeConfigId` — renders empty state if no slot exists for that type.
- If `day.isPast`, renders with a greyed-out style.

Create `DayHeader`:
- Displays the day name and date.
- Shows a toddler indicator (small icon or label) when `isToddlerHome` is true.
- Shows a toggle to mark/unmark the day as toddler home.
- Toggle calls `POST /api/toddler-overrides`.
- If the response contains `conflicts`, shows a confirmation prompt before
  re-posting with `force: true`.

**Done when:**
- Each day column renders the correct number of meal rows based on `mealTypes[]`.
- Each row shows the meal type name (Breakfast, Lunch, etc.) as visible text — row-title column or per-cell label (AC-009).
- Adding a 4th meal type in the DB causes a 4th row to appear without code changes.
- Past days are visually distinct (greyed out).
- Toddler indicator appears on weekends and override days.
- Toddler toggle calls the correct API route.
- Conflict prompt appears and works before force-saving.

**Do not:** hardcode BREAKFAST / LUNCH / DINNER anywhere in this component.
**Do not:** put any week navigation controls in DayHeader — navigation belongs in WeekNav only.

---

## T013 — MealSlotCell

**Implements:** plan.md §3 — MealSlotCell orchestrator, spec AC-001/AC-004/AC-010
**Files:** `components/meal-plan-grid/meal-slot-cell/meal-slot-cell.tsx`,
           `components/meal-plan-grid/meal-plan-grid.tsx` (add expandedSlotId state)

**Add to `MealPlanGrid`:**
- Add `expandedSlotId: string | null` state (default `null`).
- Add `handleToggleExpand(slotId: string)` — sets `expandedSlotId` to `slotId`
  if it is not currently expanded; sets it to `null` if it is (toggle).
- Pass `expandedSlotId` and `onToggleExpand` down through `DayColumn` → `MealSlotCell`.

**Create `MealSlotCell`** as the orchestrator component:
- Receives: `slot` (or null), `isPast`, `isExpanded`, `onToggle`.
- If `isPast`: render the meal name as compact read-only text. No controls, no expand.
- If slot is null: render `<MealSlotEmpty>`.
- If slot exists and `isEditing` local state is true: render `<MealSlotEditing>`.
- If slot exists and not editing: render `<MealSlotFilled isExpanded={isExpanded} onToggle={() => onToggle(slot.id)} />`.
- `isEditing` is local state, default false.

**Done when:**
- Past day cells are non-interactive and show read-only text only.
- Empty cells show the empty state.
- Clicking a filled cell expands its ingredient section; clicking again collapses it.
- Clicking a second filled cell collapses the first and expands the second.
- Edit/Delete actions visible on filled tiles on today and future days (AC-010).
- Edit opens editing state; Delete is handled in `MealSlotFilled`.

**Do not:** put any API call logic in this component — delegate to children.
**Do not:** manage `expandedSlotId` inside `MealSlotCell` — it lives in `MealPlanGrid`.

---

## T014 — MealSlotEmpty + MealSlotEditing

**Implements:** plan.md §3, spec AC-001
**Files:** `components/meal-plan-grid/meal-slot-cell/meal-slot-empty.tsx`,
           `components/meal-plan-grid/meal-slot-cell/meal-slot-editing.tsx`

Create `MealSlotEmpty`:
- Displays a placeholder ("+ Add meal" or similar).
- Clicking it calls `onStartEditing()` prop.

Create `MealSlotEditing`:
- Text input for meal name.
- Checkbox or toggle: "Toddler-appropriate?"
- Confirm and Cancel buttons.
- On confirm: call `POST /api/meal-slots` with `date`, `mealType`,
  `mealName`, `isToddlerAppropriate`. On success: call `onSaved()` to
  trigger SWR revalidation and exit editing state.
- On cancel: exit editing state, no API call.

**Done when:**
- Clicking an empty cell opens the edit form.
- Submitting saves the slot via POST and exits editing state.
- Cancel discards changes.
- The toddler toggle is part of the confirmation flow (spec AC-001).

---

## T015 — MealSlotFilled + IngredientList + IngredientLoading

**Implements:** plan.md §3, spec AC-002/AC-003/AC-010
**Files:** `components/meal-plan-grid/meal-slot-cell/meal-slot-filled.tsx`,
           `components/meal-plan-grid/meal-slot-cell/ingredient-list.tsx`,
           `components/meal-plan-grid/meal-slot-cell/ingredient-loading.tsx`

Create `MealSlotFilled`:

Props: `slot`, `isExpanded: boolean`, `onToggle: () => void`, `onStartEditing: () => void`, `onMutate: () => void`.

**Compact header (always rendered):**
- Meal name on the left.
- Status badge on the right: ingredient count chip (READY), animated spinner chip
  (PENDING), warning chip (FAILED/EMPTY). Use CSS variables from plan.md §3
  design language (--badge-ready-bg, --badge-pending-bg, --badge-warn-bg).
- **Edit** and **Delete** icon buttons in the header top-right (always visible).
  - Edit calls `onStartEditing()`.
  - Delete shows an inline confirmation ("Remove this meal?"), then
    `DELETE /api/meal-slots/[id]`, then `onMutate()`.
- Clicking the compact header area (not Edit/Delete) calls `onToggle()`.

**Collapsible ingredient section (rendered only when `isExpanded`):**
- Expand/collapse with a smooth `max-height` CSS transition (150ms ease-out).
- If `ingredientsStatus === 'PENDING'`: render `<IngredientLoading>`.
- If `ingredientsStatus === 'READY'`: render `<IngredientList>`.
- If `ingredientsStatus === 'FAILED'` or `'EMPTY'`: render error state with
  "Ingredients unavailable. Add manually." and a manual text-input.
- Do not use a drawer, modal, or side panel — all content is inline.

Create `IngredientLoading`:
- A small spinner with "Generating ingredients…" label using --badge-pending-bg.

Create `IngredientList`:
- Renders each ingredient with an approve checkbox.
- An inline edit toggle to rename or remove individual ingredients.
- On change: call `PATCH /api/meal-slots/[id]/ingredients` with the full updated list.
- Manual add: a simple text input to append a new ingredient by name.

**Done when:**
- Compact header always shows meal name + status badge + Edit + Delete.
- Clicking the header body toggles the ingredient section open/closed.
- Clicking a second cell closes the first (enforced by `expandedSlotId` in parent — no extra work needed here).
- Delete shows confirmation before calling the API; clears slot and returns to empty state.
- PENDING shows spinner; READY shows ingredient list; FAILED/EMPTY shows manual-add fallback.
- Expanding a cell does not shift other day columns (fixed cell width).
- Approving an ingredient calls the correct API route.
- Ingredient edit is distinct from tile Edit (the tile Edit changes meal name; ingredient edit changes the list).
- All colours use CSS variables from plan.md §3 design language — no raw hex or default Tailwind grey/blue classes.

---

## T016 — Wire up page.tsx

**Implements:** plan.md §3 — root page
**Files:** `app/page.tsx`

Replace the default Next.js home page with a simple layout that renders
`<MealPlanGrid />`. Add a page title. No other content needed.

**Done when:**
- `npm run dev` and opening `http://localhost:3000` shows the meal plan grid.
- The full week is visible, navigation works, and slots can be filled in.

---

## Completion checklist

Before marking Feature 001 done, verify every acceptance criterion
from `spec.md` manually:

- [x] AC-001 — Slot saves immediately, loading indicator appears, toddler question asked
- [x] AC-002 — Ingredients populate without blocking other slots
- [x] AC-003 — Ollama unavailable: slot saves, message shown, manual add works
- [x] AC-004 — Past days are non-interactive, read-only
- [x] AC-005 — Week navigation renders correct week, retains state; chevrons disabled at boundaries
- [x] AC-006 — Toddler home day flagging shows conflicts and prompts review
- [x] AC-007 — Sunday is always first column
- [x] AC-008 — Editing meal name discards ingredients and re-runs Ollama
- [x] AC-009 — Meal type name visible on every row (row-title column or per-cell label)
- [x] AC-010 — Filled tiles show Edit and Delete; Delete confirms then clears slot
- [x] AC-010 (collapsible) — Compact header by default; ingredient section expands inline on click; only one cell expanded at a time; past-day cells never expand
