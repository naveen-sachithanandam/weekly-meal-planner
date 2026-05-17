# Tasks: 003 — Shopping List

Spec: `sdd/003-shopping-list/spec.md` · Plan: `plan.md`

---

## T301 — GET /api/shopping-list

**Files:** `app/api/shopping-list/route.ts`, `lib/shopping-list.ts`

**Done when:**
- [x] Returns `{ weekStart, items }` for offset or week param
- [x] Approved ingredients only; deduped case-insensitively

---

## T302 — Shopping list page + nav

**Files:** `app/shopping/page.tsx`, `components/shopping-list/shopping-list-view.tsx`, `app-nav.tsx`

**Done when:**
- [x] `/shopping` reachable from nav (AC-001)
- [x] Week nav −1/0/+1 (AC-005)
- [x] Empty state (AC-006)

---

## T303 — Grid approval sync + print

**Files:** `ingredient-list.tsx`, `app/globals.css`

**Done when:**
- [x] SWR mutate shopping list after ingredient save
- [x] Print hides nav (AC-007)

---

## Sign-off

- [x] Issues #32–#35 (2026-05-17)
