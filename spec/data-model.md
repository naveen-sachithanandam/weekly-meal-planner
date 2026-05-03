# Data model

**Source of truth:** `prisma/schema.prisma` (SQLite, Prisma enums mapped for this connector).

## Entities

### `WeeklyPlan`

One persisted plan per **`weekStartSunday`** (unique). Anchors all days and shopping groups for that Toronto week. **`weekStartSunday`** must represent **Sunday 00:00 America/Toronto**, not a misleading UTC-only midnight.

### `DayPlan`

Seven rows per plan (`DayOfWeek` enum). **`isTrip`** plus **`tripNotes`** disable normal planning and meal-derived shopping for that calendar day. Unique on **`(weeklyPlanId, dayOfWeek)`**.

### `MealSlot`

Up to three rows per day (`MealSlotType`: breakfast, lunch, dinner). Holds unstructured **`mainMealText`**, **`proteinWarning`**, tag booleans (**`isQuick`**, **`isMakeAhead`**, **`isEasy`**, **`needsTime`**), and toddler hint fields (**`toddlerFriendly`**, **`toddlerNote`**). Unique on **`(dayPlanId, slot)`**.

### `ShoppingLineGroup`

Consolidated row for Views 2–3: **`section`**, **`displayName`**, **`mergeKey`**, **`sortOrder`**, **`checked`**, **`alreadyHave`**. Checkbox and pantry state live **here** so merged lines share one user-visible toggle pair.

### `ShoppingLineContribution`

Atomic slice for View 1 attribution: **`quantityText`**, **`mergeUnitKey`** (for safe merging), **`sortOrder`**, optional **`mealSlotId`** (null for manual-only additions tied to a group only). Many contributions reference one group.

### `FavoriteMeal`

Long-lived catalog (`name` unique, optional **`category`**, **`notes`**) for future AI suggestion seeding.

## Enums

- **`DayOfWeek`** — Sunday…Saturday grid alignment.  
- **`MealSlotType`** — Breakfast / lunch / dinner columns.  
- **`StoreSection`** — Produce, dairy, dry goods, pantry, frozen (matches shopping Views 2–3 buckets).

## Cascade behavior

Deleting a **`WeeklyPlan`** cascades to **`DayPlan`**, **`MealSlot`**, **`ShoppingLineGroup`**, and nested **`ShoppingLineContribution`**. Deleting a **`MealSlot`** sets contribution **`mealSlotId`** to null (`SetNull`) so shopping rows are not silently destroyed when editing meals. Removing a line from the checklist uses **`DELETE /api/shopping-list/:contributionId`** (see **`spec/api-routes.md`**).
