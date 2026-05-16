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
**Status:** Resolved

**Context:** Spec/plan/tasks updated for AC-009: prev/next week chevrons in each `DayHeader`, with navigation callbacks drilled from `MealPlanGrid` (single `weekOffset` source of truth). Next week must be disabled at `weekOffset === 1` (not only previous at `-1`).

**Decision:**
- `weekOffset` lives only in `MealPlanGrid`.
- Pass `onPrevWeek`, `onNextWeek`, `canGoPrev`, `canGoNext` to every `DayColumn` → `DayHeader`.
- `DayHeader` renders `‹` / `›` chevrons (disabled, not hidden, at boundaries).
- `WeekNav` uses the same callbacks and boundary rules.
- SWR continues to use `?offset=` (see DL-001); `weekStart` from the response drives the week label.

**Alternatives considered:** Local `weekOffset` in `DayHeader` (rejected — duplicates state).

**Resolution:** Implemented in T011/T012 reopen — `WeekNavigationProps` drilled from `MealPlanGrid`; chevrons in `DayHeader`; `canGoNext` false at `weekOffset === 1`. Issues [#11](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/11), [#12](https://github.com/naveen-sachithanandam/weekly-meal-planner/issues/12).
