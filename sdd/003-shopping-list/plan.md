# Plan: 003 — Shopping List

Derived from: `sdd/003-shopping-list/spec.md`  
Constitution: `.cursor/rules/project-constitution.mdc`  
Depends on: Feature 001 (ingredient approval)

---

## 1. No Schema Changes

Read-only aggregation over existing `Ingredient` and `MealSlot` models.

---

## 2. API Routes

### `GET /api/shopping-list`

Query: `offset` (−1, 0, 1) or `week` (`YYYY-MM-DD` Sunday). Default: current week.

**Response:**
```json
{
  "weekStart": "2026-05-10",
  "items": ["Carrots", "Rolled oats", "Salt"]
}
```

**Logic:**
1. Resolve `weekStart` via `getWeekStart()` / `lib/date.ts` (same as meal plan).
2. Query `Ingredient` where `approved === true` and `mealSlot.date` in the 7-day window.
3. Deduplicate with `dedupeIngredientNames()` in `lib/shopping-list.ts` (case-insensitive, sorted).

---

## 3. UI Components

```
app/shopping/page.tsx
components/shopping-list/shopping-list-view.tsx   ← SWR + WeekNav reuse
components/layout/app-nav.tsx                     ← Shopping list link
```

**SWR:** `revalidateOnFocus: true`. After grid approval, `ingredient-list.tsx` calls
`mutate` for keys starting with `/api/shopping-list`.

**Print:** `@media print` in `globals.css` — hide `.nav-header`, `.no-print`.

---

## 4. Tests

- `tests/lib/shopping-list.test.ts` — deduplication
- `tests/api/shopping-list.test.ts` — GET aggregation
- `tests/components/app-nav.test.tsx` — shopping link
