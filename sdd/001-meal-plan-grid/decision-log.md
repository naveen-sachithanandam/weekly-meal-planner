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
