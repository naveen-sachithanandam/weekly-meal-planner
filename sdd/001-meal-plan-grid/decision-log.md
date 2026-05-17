# Decision log — Feature 001

Record of spec-driven fixes and implementation choices. Each entry links to a GitHub issue.

---

## DL-001 — Client cannot read `HOME_TIMEZONE` from `.env.local`

**Date:** 2026-05-16  
**Issue:** [#18](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/18)  
**Status:** Resolved

**Context:** `MealPlanGrid` imported `lib/date` → `lib/config`, which reads env at module load. Next.js only exposes server env to API routes; the browser threw “missing `HOME_TIMEZONE`” despite a valid `.env.local`.

**Decision:** Keep timezone logic server-side. SWR fetches `GET /api/meal-plan?offset={n}`; the API returns `weekStart` computed with `HOME_TIMEZONE`. The client never imports `lib/config` or `lib/date`.

**Alternatives considered:** `NEXT_PUBLIC_HOME_TIMEZONE` (duplicates config, violates single-source env pattern).

---

## DL-002 — Invalid time value while SWR loading

**Date:** 2026-05-16  
**Issue:** [#18](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/18)  
**Status:** Resolved

**Context:** `WeekNav` received `weekStart=""` before the first fetch completed. `formatWeekRange("")` produced an invalid `Date`.

**Decision:** Guard `formatWeekRange` for empty/invalid strings; show “Loading week…” until `weekStart` is available.

---

## DL-003 — T011/T012 reopen: week navigation in column headers (AC-009)

**Date:** 2026-05-16  
**Issues:** [#11](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/11), [#12](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/12)  
**Status:** Superseded (see DL-004)

**Context:** Spec/plan/tasks updated for AC-009: prev/next week chevrons in each `DayHeader`, with navigation callbacks drilled from `MealPlanGrid` (single `weekOffset` source of truth). Next week must be disabled at `weekOffset === 1` (not only previous at `-1`).

**Decision:**
- `weekOffset` lives only in `MealPlanGrid`.
- Pass `onPrevWeek`, `onNextWeek`, `canGoPrev`, `canGoNext` to every `DayColumn` → `DayHeader`.
- `DayHeader` renders `‹` / `›` chevrons (disabled, not hidden, at boundaries).
- `WeekNav` uses the same callbacks and boundary rules.
- SWR continues to use `?offset=` (see DL-001); `weekStart` from the response drives the week label.

**Alternatives considered:** Local `weekOffset` in `DayHeader` (rejected — duplicates state).

**Resolution:** Superseded by DL-004 — initial implementation used column-header chevrons (AC-009); spec was revised to WeekNav-only navigation.

---

## DL-004 — Week navigation consolidated in WeekNav (AC-005 revision)

**Date:** 2026-05-16  
**Issues:** [#11](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/11), [#12](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/12)  
**Status:** Resolved

**Context:** Spec/tasks revised: week navigation belongs only in `WeekNav`, not in `DayHeader`. UI is integrated chevrons flanking the date range (`‹ May 10 – May 16, 2026 ›`) plus a separate “This week” reset button.

**Decision:**
- Remove navigation props and chevrons from `DayHeader` / `DayColumn`.
- `WeekNav` is the sole navigation surface with prev/next chevrons beside the range label.
- `weekOffset` remains only in `MealPlanGrid`; boundaries unchanged (`-1` / `+1`).
- SWR continues `?offset=` (DL-001).

**Alternatives considered:** Dual navigation in WeekNav and DayHeader (rejected per revised spec).

---

## DL-005 — MealType enum replaced by MealTypeConfig model

**Date:** 2026-05-16  
**Issue:** T002 update — MealTypeConfig schema  
**Status:** Resolved

**Context:** The initial T002 migration used a `MealType` enum (`BREAKFAST`, `LUNCH`, `DINNER`) on `MealSlot`. The plan and spec require meal types as database records so households can configure structure without code changes (Feature 002).

**Decision:**
- Remove the `MealType` enum entirely.
- Add `MealTypeConfig` (`name` unique, `sortOrder`, `isActive`) with a one-to-many relation to `MealSlot`.
- `MealSlot` references `mealTypeConfigId`; enforce `@@unique([date, mealTypeConfigId])`.
- Seed Breakfast / Lunch / Dinner via `prisma/seed.ts` with idempotent `upsert` per name (SQLite does not support `createMany({ skipDuplicates: true })`).

**Alternatives considered:** Keep enum for defaults and add config later (rejected — duplicates source of truth and blocks configurable meal rows).

---

## DL-006 — GET /api/meal-plan exposes MealTypeConfig for the grid

**Date:** 2026-05-16  
**Issue:** [#5](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/5)  
**Status:** Resolved

**Context:** After T002, meal types live in `MealTypeConfig`, but the client still needed a stable contract for how many meal rows to render per day and how to match slots to rows.

**Decision:**
- `GET /api/meal-plan` returns top-level `mealTypes[]` — active configs only, ordered by `sortOrder`, each `{ id, name, sortOrder }`.
- Each slot in `days[].slots[]` uses `mealTypeConfigId` and `mealTypeName` (resolved from the included `mealTypeConfig` relation), not a `MealType` enum string.
- Keep existing `week` and `offset` query params; default week start via `getWeekStart()`.

**Alternatives considered:** Embed meal type metadata only inside each slot (rejected — duplicates type list across days and forces the UI to infer row count from sparse slot data).

---

## DL-007 — POST /api/meal-slots uses mealTypeConfigId

**Date:** 2026-05-16  
**Issue:** [#6](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/6)  
**Status:** Resolved

**Context:** The original T006 implementation accepted a `mealType` enum string. After T002 (`MealTypeConfig`), slots are keyed by `mealTypeConfigId` with `@@unique([date, mealTypeConfigId])`.

**Decision:**
- POST body: `date`, `mealTypeConfigId`, `mealName`, `isToddlerAppropriate`.
- Return `400` when `mealTypeConfigId` is missing, unknown, or references an inactive config.
- Return `409` on duplicate `[date, mealTypeConfigId]`.
- Response serializes `mealTypeConfigId` and `mealTypeName` (not enum strings).
- Unchanged: `403` past day; `PENDING`/`EMPTY` on create; fire-and-forget `generateIngredients`.

**Alternatives considered:** Accept both `mealType` and `mealTypeConfigId` during migration (rejected — dual contract complicates clients and tests).

---

## DL-008 — PATCH/DELETE meal-slots and toddler override conflicts

**Date:** 2026-05-16  
**Issues:** [#7](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/7), [#8](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/8), [#10](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/10)  
**Status:** Resolved

**Context:** After T002 (`MealTypeConfig`), PATCH responses must expose `mealTypeConfigId` / `mealTypeName` (via shared `serializeMealSlot`). Toddler override conflict detection previously returned enum-style `mealType` strings; conflicts must use the configured meal type display name.

**Decision:**
- `PATCH /api/meal-slots/[id]` and `PATCH /api/meal-slots/[id]/ingredients` — responses use `serializeMealSlot` (`mealTypeConfigId`, `mealTypeName`); slot PATCH keeps `403` past day and ingredient reset on `mealName` change.
- `DELETE /api/meal-slots/[id]` — unchanged (`204`, cascade delete, `403` past day).
- `POST /api/toddler-overrides` — `conflicts[]` entries use `{ slotId, mealType, mealName }` where `mealType` is `MealTypeConfig.name` (e.g. `"Lunch"`), not a `MealType` enum string.

**Alternatives considered:** Rename conflict field to `mealTypeName` (rejected — plan §2 keeps the `mealType` key; only the value becomes the config name).

---

## DL-009 — Dynamic meal type rows in the grid UI

**Date:** 2026-05-16  
**Issues:** [#11](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/11), [#12](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/12)  
**Status:** Resolved

**Context:** T011/T012 require the grid to render meal rows from `GET /api/meal-plan` `mealTypes[]` (DL-006), not hardcoded `BREAKFAST` / `LUNCH` / `DINNER`. Week navigation belongs only in `WeekNav` (DL-004), with `weekOffset` owned by `MealPlanGrid` and SWR keyed on `?offset=` (DL-001).

**Decision:**
- `MealPlanGrid` passes `mealTypes` from the API response into each `DayColumn`.
- `DayColumn` maps `mealTypes` in `sortOrder`, matching `day.slots[]` by `mealTypeConfigId`; missing slots render empty.
- `MealSlotCell` receives `MealPlanMealType` and posts `mealTypeConfigId` when creating slots.
- `WeekNav` shows `‹ May 10 – May 16, 2026 ›` with chevrons and a separate “This week” button; prev/next disabled at `weekOffset === -1` / `1`.
- `DayHeader` shows date, toddler indicator, and toggle only — no week navigation.

**Alternatives considered:** Hardcoded three-row layout (rejected — blocks Feature 002 configurable meal structure).

---

## DL-010 — Meal slot UI uses MealTypeConfig

**Date:** 2026-05-16  
**Issues:** [#13](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/13), [#14](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/14), [#15](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/15), [#16](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/16)  
**Status:** Resolved

**Context:** T013–T016 implement the meal slot cell orchestrator, empty/editing/filled states, ingredient list/loading, and `app/page.tsx`. After T002 (`MealTypeConfig`), slot creation must use `mealTypeConfigId`, not a `MealType` enum string.

**Decision:**
- `MealSlotCell` receives `mealType: MealPlanMealType` (from `mealTypes[]`) and passes `mealType.id` as `mealTypeConfigId` to `MealSlotEditing`.
- `MealSlotEditing` POSTs `{ date, mealTypeConfigId, mealName, isToddlerAppropriate }` to `/api/meal-slots`.
- `MealSlotFilled`, `IngredientList`, and `IngredientLoading` are unchanged in behavior; ingredient PATCH uses slot id only.
- `app/page.tsx` renders `<MealPlanGrid />` with page title.

**Alternatives considered:** Keep `mealType` string prop on `MealSlotCell` (rejected — duplicates config id/name and encourages enum-style literals in tests).

---

## DL-011 — MealSlotEditing PATCH for existing slots (AC-008)

**Date:** 2026-05-16  
**Status:** Resolved

**Context:** T014 `MealSlotEditing` only POSTed to `/api/meal-slots`. Clicking a filled meal name opened the form but confirm always attempted a new slot (409 duplicate) instead of PATCH.

**Decision:**
- `MealSlotEditing` accepts optional `slotId`, `initialMealName`, `initialIsToddlerAppropriate`.
- When `slotId` is set, confirm PATCHes `/api/meal-slots/[id]` (meal name change triggers ingredient reset per T007).
- When `slotId` is absent, confirm POSTs a new slot as before.

**Alternatives considered:** Separate `MealSlotEditing` and `MealSlotUpdating` components (rejected — same form fields and validation).

---

## DL-012 — T000 Docker packaging

**Date:** 2026-05-16  
**Status:** Resolved

**Context:** Feature 001 assumes deployment via Docker on a Mac Mini with SQLite on a named volume and Ollama on the host.

**Decision:**
- Multi-stage `Dockerfile` per plan §8 with `output: 'standalone'` in `next.config.ts`.
- `docker-compose.yml` loads `.env.local`, overrides `DATABASE_URL` to `file:/data/meal-planner.db` and `OLLAMA_HOST` to `host.docker.internal`.
- `.dockerignore` excludes `node_modules`, `.next`, local DB files, and `.env.local`.
- First deploy: `docker compose exec app npx prisma migrate deploy` and `npx prisma db seed` (Prisma CLI runs via exec from the builder’s tooling path documented in tasks).

**Alternatives considered:** Bundling Ollama in compose (rejected — host-only per constitution).

---

## DL-013 — Ollama ingredient generation reliability (#28)

**Date:** 2026-05-16  
**Status:** Resolved

**Context:** Meal slots stayed `PENDING` (or `FAILED`/`EMPTY`) because background `void generateIngredients()` could be cut off when the Next.js route finished. PATCH always set `PENDING` on rename without re-checking reachability.

**Decision:**
- Schedule generation with Next.js `after()` via `scheduleIngredientGeneration()` (Vitest runs the task directly).
- Reachability uses `GET ${OLLAMA_HOST}/api/tags` and requires a model matching `OLLAMA_MODEL` (prefix resolution unchanged).
- PATCH meal rename mirrors POST: `PENDING` + background generation when reachable; `EMPTY` when not.
- Generate timeout aligned to plan §4: **10 seconds** (`OLLAMA_GENERATE_TIMEOUT_MS`).
- Docker: `docker-compose.yml` sets `OLLAMA_HOST=http://host.docker.internal:11434` (overrides `.env.local` localhost).

**Required `.env.local` (host / bare `npm run dev`):**

| Variable | Example | Notes |
|----------|---------|--------|
| `HOME_TIMEZONE` | `America/Chicago` | IANA zone for day boundaries |
| `OLLAMA_HOST` | `http://localhost:11434` | Host Ollama; Compose overrides in container |
| `OLLAMA_MODEL` | `llama3.1` | Must match `ollama list`; run `ollama pull` first |
| `DATABASE_URL` | `file:./dev.db` | Local SQLite path |

Optional: `CUISINE_CONTEXT`, `OLLAMA_HOUSEHOLD_PROMPT`.

**Alternatives considered:** BullMQ/worker queue (rejected — single-household local app per plan §4).

---

## DL-014 — Feature 001 sign-off AC-001–AC-004 (#29)

**Date:** 2026-05-16  
**Issue:** [#29](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/29)  
**Status:** Resolved

**Context:** Tracer-bullet verification for core slot flow before AC-005–AC-008 (#30).

**Decision:**
- Added `tests/components/feature-001-signoff.test.tsx` covering end-to-end UI paths for AC-001–AC-004 (confirm → PENDING spinner, parallel slots, Ollama degradation UI, past read-only).
- Relabeled API tests in `meal-slots.test.ts` for AC-001/002/003 traceability.
- Marked AC-001–AC-004 complete in `tasks.md` completion checklist.
- No production code changes required; #28 (`DL-013`) already fixed async ingredient generation.

**Follow-ups:** None filed — AC-005–AC-008 deferred to #30. Toddler checkbox label is “Toddler-appropriate?” (spec prose uses “Is this meal toddler-appropriate?”); behaviour matches AC-001.

---

## DL-015 — Feature 001 sign-off AC-005–AC-008 (#30)

**Date:** 2026-05-16  
**Issue:** [#30](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/30)  
**Status:** Resolved

**Context:** Tracer-bullet verification for week navigation, Sunday-first grid, toddler override conflicts, and meal rename re-run (#30).

**Decision:**
- Extended `tests/components/feature-001-signoff.test.tsx` with UI tracer bullets for AC-005–AC-008 (WeekNav prev/current/next and boundary chevrons, per-week state retention, toddler conflict confirm/force flow, Sunday-first column across offsets, meal rename → PATCH → PENDING spinner).
- Marked AC-005–AC-008 complete in `tasks.md` completion checklist.
- No production code changes required; behaviour already covered by `meal-plan-grid.test.tsx`, `day-column.test.tsx`, `meal-slots-patch.test.ts`, and `meal-plan.test.ts`.

**Follow-ups:** None.
