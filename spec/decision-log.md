# Decision log

Records **why** notable product and technical choices were made during specification and scaffolding. New entries go at the bottom with the next id.

---

### DL-001 — Week boundary and timezone

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** “This week” must match family life in Toronto and avoid-off-by-one bugs around UTC midnight.  

**Decision:** Weeks run **Sunday→Saturday**. Week identity uses **Sunday 00:00 `America/Toronto`** (not a naive UTC midnight that changes the local calendar date). Rollover at **Sunday midnight Eastern**, with DST handled by normal timezone libraries/host configuration.  

**Consequences:** Application code must normalize `weekStartSunday` when reading/writing SQLite datetimes; documentation calls this out on `WeeklyPlan.weekStartSunday`.

---

### DL-002 — Eat-out is exactly Friday dinner

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Early drafts mixed “one meal out” with “one day” wording.  

**Decision:** **Only Friday dinner** is replaced by eating out. Friday breakfast and lunch remain planned; **Friday dinner ingredients are omitted** from shopping.  

**Consequences:** UI and acceptance criteria reference **Friday dinner**, not a whole day off cooking.

---

### DL-003 — Trip overrides the calendar day and consumes Friday eat-out

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Travel days should not generate shopping from planned meals; interaction with fixed Friday eat-out needed clarity.  

**Decision:** A **trip day** clears planning and shopping **for that entire day**. At most **one** such override per day. If the trip falls on **Friday**, the fixed eat-out slot is **considered satisfied by the trip** (no separate eating-out meal that week).  

**Consequences:** `DayPlan.isTrip` drives suppression of meal-derived shopping for that date; Friday trip skips normal eat-out semantics.

---

### DL-004 — Toddler weekend lunch in the same grid cell

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Weekend toddler lunch must appear without a fourth grid column.  

**Decision:** Saturday and Sunday **lunch** show **adult meal text plus optional toddler sub-note** in one cell; **toddler-friendly** flag means no extra note. Weekday lunches continue to show daycare context per spec.  

**Consequences:** Data model keeps toddler hints on `MealSlot` (`toddlerFriendly`, `toddlerNote`) rather than a separate column.

---

### DL-005 — Shopping checklist state: two tables, not one

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** View 1 needs per-meal attribution; Views 2–3 need merged lines with a single checkbox and pantry flag.  

**Decision:** Persist **`ShoppingLineGroup`** (merged row: section, display name, merge key, sort order, `checked`, `alreadyHave`) and **`ShoppingLineContribution`** (per-meal slices with `quantityText`, `mergeUnitKey`, optional `mealSlotId`). **Do not collapse** into a single table.  

**Consequences:** Regeneration logic must reconcile contributions into groups; merging follows unit-compatibility rules from the product spec.

---

### DL-006 — Meal tags as booleans on `MealSlot`

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Tags needed for UI rules (Mon/Tue breakfast, weekend caps, warnings).  

**Decision:** Store **`isQuick`**, **`isMakeAhead`**, **`isEasy`**, **`needsTime`** as separate booleans instead of a JSON tag bag.  

**Consequences:** Validation logic combines booleans with protein warnings per product spec (`SPEC.md`).

---

### DL-007 — `mainMealText` unstructured for the demo

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** V1 avoids recipe schema complexity.  

**Decision:** **`mainMealText`** is free-form text (names, notes, batch hints).  

**Consequences:** Ingredient extraction from meal names remains heuristic until a structured recipe model exists.

---

### DL-008 — Sort order on shopping groups

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Aisle/checklist views need stable ordering beyond accidental insertion order.  

**Decision:** Add **`sortOrder`** on **`ShoppingLineGroup`** (plus index with `weeklyPlanId` and `section`). Contributions keep their own **`sortOrder`** for View 1 ordering within a meal.  

**Consequences:** UI sorts groups within a section by `sortOrder`, then tie-breaks deterministically if needed.

---

### DL-009 — Shopping flags and HTTP surface

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** “Checked” vs “already have” must not be confused; weekly reset semantics differ.  

**Decision:** **`checked`** toggled via **`PATCH /api/shopping-list/:id`**; **`alreadyHave`** via **`PATCH /api/shopping-list/:id/have`**. **`POST /api/shopping-list/clear`** clears **checked** only. **`DELETE /api/shopping-list/:id`** removes **any** line (manual or generated). **`alreadyHave`** persists across weekly clears.  

**Consequences:** Handlers use **group** ids for **`checked`** / **`alreadyHave`** and **contribution** ids for **`DELETE`**; see **`spec/api-routes.md`** → *Implementation notes*.

---

### DL-014 — Shopping REST `:id` disambiguation

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** DL-009 left “finalize when handlers are implemented” for which table `:id` referred to.  

**Decision:** **`PATCH /api/shopping-list/:id`** and **`PATCH /api/shopping-list/:id/have`** address **`ShoppingLineGroup.id`**. **`DELETE /api/shopping-list/:id`** addresses **`ShoppingLineContribution.id`** (removing the last contribution deletes the empty group in a transaction).  

**Consequences:** Client checklist toggles PATCH the **group**; removing a whole merged line may issue **multiple DELETEs** (one per contribution) until the API offers a single group-delete.

---

### DL-010 — Shared edits without real-time sockets

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Two editors on the LAN without auth.  

**Decision:** **Last write wins** for meal plan saves; checklist uses **60-second polling** rather than WebSockets in V1.  

**Consequences:** Occasional overwrite or stale UI is acceptable per spec; document for users if needed.

---

### DL-011 — Ingredient aggregation across views

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Spec wants per-meal lines with sources in View 1 and merged totals in Views 2–3 when units align.  

**Decision:** View 1 lists contributions separately with meal attribution; Views 2–3 consolidate by compatible **`mergeUnitKey`** and show totals plus source labels; incompatible units stay as separate consolidated rows.  

**Consequences:** Server merge on **`POST /api/shopping-list/item`** uses **`mergeKey`**; shared sort/order helpers live in **`lib/shopping-utils.ts`**. Heavier aggregation can still extend **`lib/shopping-aggregation.ts`** when batch generation ships.

---

### DL-012 — Central `meal-rules` module

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Meal, grid, protein, lunch-box, eat-out, trip, and weekend rules were spread across product spec sections.  

**Decision:** Encode them in **`lib/meal-rules.ts`** (constants + small pure helpers) so UI and API validation share one code-backed reference alongside the prose spec.  

**Consequences:** When **`SPEC.md`** changes, update **`meal-rules.ts`** in the same PR; keep **`spec/product-spec.md`** / **`SPEC.md`** as narrative truth.

---

### DL-013 — Architecture diagrams in `spec/`

**Date:** 2026-05-03  
**Status:** Accepted  

**Context:** Reviewers needed a single visual for deployment context, layering, persistence, and representative meal/shopping flows.  

**Decision:** Maintain **`spec/architecture.md`** as living Mermaid diagrams (system context, Next.js layering, ER sketch, meal-plan sequence, shopping build/view flow, eat-out vs trip decision).  

**Consequences:** Update diagrams when API shapes or generation pipelines change; link from **`spec/README.md`** and root **`README.md`**.
