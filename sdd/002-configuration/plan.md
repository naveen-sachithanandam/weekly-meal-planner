# Plan: 002 — Configuration Page

Derived from: `sdd/002-configuration/spec.md`
Constitution: `.cursor/rules/project-constitution.mdc`
Depends on: Feature 001 complete (MealTypeConfig model and seed exist)

---

## 1. No Schema Changes

The `MealTypeConfig` model is already defined and seeded in Feature 001 (T002).
Feature 002 adds no new Prisma models. It only adds API routes and UI to manage
existing records.

---

## 2. API Routes

All routes live under `app/api/configuration/`. All responses are JSON.

### `GET /api/configuration/meal-types`

Return all `MealTypeConfig` records ordered by `sortOrder` ascending.
Includes both active and inactive records (settings page shows both).

**Response:**
```json
{
  "mealTypes": [
    { "id": "clx...", "name": "Breakfast", "sortOrder": 1, "isActive": true },
    { "id": "clx...", "name": "Lunch",     "sortOrder": 2, "isActive": true },
    { "id": "clx...", "name": "Dinner",    "sortOrder": 3, "isActive": true }
  ]
}
```

---

### `POST /api/configuration/meal-types`

Create a new meal type. Name must be unique. Assigns `sortOrder` as
`(max existing sortOrder) + 1`.

**Request body:**
```json
{ "name": "Evening Snack" }
```

**Validation:**
- `name` must not be blank.
- `name` must not match an existing `MealTypeConfig.name` (case-insensitive). Returns `409`.

**Response:** The created `MealTypeConfig` record.

---

### `PATCH /api/configuration/meal-types/[id]`

Update name, sortOrder, or isActive for a single meal type.

**Request body (all fields optional):**
```json
{
  "name": "Main Meal",
  "sortOrder": 2,
  "isActive": false
}
```

**Validation:**
- If `name` provided: must not conflict with another record's name. Returns `409`.
- If `isActive: false` and this is the last active meal type: returns `400` —
  at least one active meal type must exist at all times.

**Response:** The updated `MealTypeConfig` record.

---

### `DELETE /api/configuration/meal-types/[id]`

Hard-delete a meal type. Only permitted if no `MealSlot` records reference
this `MealTypeConfig`. Returns `409` if slots exist — client should offer
deactivation instead.

**Response:** `204` no body on success.

---

### `PATCH /api/configuration/meal-types/reorder`

Bulk-update `sortOrder` values after a drag-and-drop reorder.

**Request body:**
```json
{
  "order": ["clx-id-1", "clx-id-2", "clx-id-3"]
}
```

Reassigns `sortOrder` as the index position (0-based → stored as 1-based).
All IDs in the array must be valid `MealTypeConfig` IDs.

**Response:** The full updated list in new sort order.

---

## 3. Component Tree

```
app/
├── settings/
│   └── page.tsx                       ← renders <ConfigurationPage />

components/
├── configuration/
│   ├── configuration-page.tsx         ← root: fetches meal types via SWR, renders sections
│   ├── meal-type-list.tsx             ← sortable list of MealTypeConfig rows
│   ├── meal-type-row.tsx              ← single row: name (editable inline), active toggle,
│   │                                     drag handle, delete button
│   └── add-meal-type-form.tsx         ← controlled input + confirm to POST new meal type

layout/
└── app-nav.tsx                        ← persistent top navigation with Settings link (gear icon)
```

**State ownership:**
- Meal type list — SWR cache, keyed to `/api/configuration/meal-types`. Revalidated after every mutation.
- Drag-and-drop reorder state — local state in `meal-type-list.tsx`. Committed on drop via PATCH reorder.
- Inline edit state (which row is being renamed) — local state in `meal-type-row.tsx`.

**Drag-and-drop:** Use `@dnd-kit/core` and `@dnd-kit/sortable`. Do not use `react-beautiful-dnd`
(unmaintained). Wrap `MealTypeList` in `<DndContext>` and each row in `<SortableItem>`.

---

## 4. Navigation

Add a persistent `AppNav` component to the root layout (`app/layout.tsx`). Renders:
- App name / home link → `/`
- Settings link (gear icon) → `/settings`

Keep it minimal — this is a household tool, not a product.

---

## 5. Out of Scope for This Plan

- Timezone, Ollama, or cuisine configuration via the settings UI.
- Per-day meal type overrides.
- Any form of access control on the settings page.
- Undo / redo for configuration changes.
