# API routes (V1)

All handlers live under **`app/api/`** as Next.js Route Handlers. Payload shapes belong in `types/api.ts` when implemented.

**Machine-readable:** [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3). **Sequence diagrams:** [`api-sequences.md`](api-sequences.md). Keep these three files aligned when you change routes or semantics.

## Meal plan

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/meal-plan` | Load the weekly plan for the resolved Toronto week (`?weekStart=` optional Sunday `YYYY-MM-DD`; omit → current week). |
| **POST** | `/api/meal-plan` | Save the full plan for that week (**last write wins**). |

## Favourites

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/favourites` | Return all **FavoriteMeal** rows for pick lists (`category` then `name`). |

## Shopping list

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/shopping-list` | Return shopping **groups** (with **contributions**) for the resolved week (`?weekStart=` optional; omit → current week). |
| **POST** | `/api/shopping-list/clear` | Set **`checked: false`** on every **`ShoppingLineGroup`** for that week (`alreadyHave` unchanged). |
| **PATCH** | `/api/shopping-list/:id` | Set **`checked`** on a **`ShoppingLineGroup`** (`:id` = group id). Body: `{ checked: boolean }`. Returns updated group JSON. |
| **PATCH** | `/api/shopping-list/:id/have` | Set **`alreadyHave`** on a **`ShoppingLineGroup`** (`:id` = group id). Body: `{ alreadyHave: boolean }`. Returns updated group JSON. |
| **POST** | `/api/shopping-list/item` | Add a manual (or meal-linked) **contribution**; merges into an existing group when **`mergeKey`** matches. Body includes `weekStart`, `displayName`, `quantityText`, `section`, optional `mergeKey` / `mergeUnitKey` / `mealSlotId`. |
| **DELETE** | `/api/shopping-list/:id` | Delete a **`ShoppingLineContribution`** by id (`:id` = contribution id). If the parent group has no contributions left, the group is removed. |

## Semantics

- **`checked`** — bought today; checklist UI sorts these after “still to buy” within each aisle; cleared by **`POST /api/shopping-list/clear`**.  
- **`alreadyHave`** — stocked at home; checklist shows without a checkbox (greyed / 🏠); **not** cleared by **`/clear`**.  

## Client sync

The shopping list page uses **SWR** with **`refreshInterval: 60_000`** on **`GET /api/shopping-list`**—no WebSockets in V1.

## Implementation notes

- **`POST /api/shopping-list/clear`** accepts JSON **`{ weekStart?: string }`**. When `weekStart` is omitted or empty, the server uses the **current Toronto Sunday** (same resolution as GET). Responds **`404`** when there is no **`WeeklyPlan`** for that week.  
- Checklist and “already have” PATCH targets are **group** ids so one checkbox maps to one merged line. **Remove line** in the UI issues **DELETE** once per **contribution** when a merged row must disappear entirely (see client implementation).
