# Plan: 001 — Weekly Meal Plan Grid

Derived from: `sdd/001-meal-plan-grid/spec.md`
Constitution: `.cursor/rules/project-constitution.mdc`

This document is the technical source of truth for implementing Feature 001.
Tasks (tasks.md) are derived from this plan. Do not implement behavior not
reflected here or in the spec.

---

## 1. Data Model

Three new Prisma models. Add to `prisma/schema.prisma`.

```prisma
model MealSlot {
  id                  String             @id @default(cuid())
  date                String             // YYYY-MM-DD in home timezone
  mealType            MealType
  mealName            String
  isToddlerAppropriate Boolean           @default(false)
  ingredientsStatus   IngredientsStatus  @default(PENDING)
  ingredients         Ingredient[]
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  @@unique([date, mealType])
}

model Ingredient {
  id         String   @id @default(cuid())
  mealSlotId String
  mealSlot   MealSlot @relation(fields: [mealSlotId], references: [id], onDelete: Cascade)
  name       String
  approved   Boolean  @default(false)
}

model ToddlerOverride {
  id     String  @id @default(cuid())
  date   String  @unique // YYYY-MM-DD in home timezone
  isHome Boolean
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
}

enum IngredientsStatus {
  PENDING  // Ollama has been called, waiting for response
  READY    // Ingredients returned and stored
  FAILED   // Ollama timed out or errored
  EMPTY    // No ingredients (Ollama was unavailable at save time)
}
```

**Design decisions:**
- `date` is stored as a `String` (`YYYY-MM-DD`) — not a `DateTime`. This avoids timezone drift when reading back from SQLite. The home timezone is applied at the API layer, not the DB layer.
- `@@unique([date, mealType])` — one slot per meal type per day. Enforced at the DB level.
- `Ingredient.approved` — tracks whether the user has reviewed and approved each ingredient before it flows to the shopping list (Feature 003).

---

## 2. API Routes

All routes live under `app/api/`. All responses are JSON. Errors return `{ error: string }` with an appropriate HTTP status.

### `GET /api/meal-plan`

Fetch all meal slots for a given week.

**Query params:**
- `week` — Sunday date in `YYYY-MM-DD` format (home timezone). Defaults to current week's Sunday if omitted.

**Response:**
```json
{
  "weekStart": "2025-01-05",
  "days": [
    {
      "date": "2025-01-05",
      "isToddlerHome": true,
      "isPast": false,
      "slots": [
        {
          "id": "clx...",
          "mealType": "BREAKFAST",
          "mealName": "Idli",
          "isToddlerAppropriate": true,
          "ingredientsStatus": "READY",
          "ingredients": [
            { "id": "clx...", "name": "Idli rice", "approved": true },
            { "id": "clx...", "name": "Urad dal", "approved": true },
            { "id": "clx...", "name": "Salt", "approved": true }
          ]
        }
      ]
    }
  ]
}
```

`isToddlerHome` — derived: true if day is Saturday/Sunday, OR if a `ToddlerOverride` record exists for that date with `isHome: true`, OR if a weekday override exists.
`isPast` — derived at the API layer using home timezone. True if date is before today.

---

### `POST /api/meal-slots`

Save a new meal slot immediately (before Ollama responds).

**Request body:**
```json
{
  "date": "2025-01-07",
  "mealType": "DINNER",
  "mealName": "Chicken Kolhapuri",
  "isToddlerAppropriate": false
}
```

**Response:** The created `MealSlot` with `ingredientsStatus: "PENDING"` (if Ollama available) or `"EMPTY"` (if Ollama unavailable).

**Side effect:** After responding, the route fires a background call to Ollama. This does not block the response. See §4 (Ollama Integration).

**Validation:**
- `date` must not be a past day (before today in home timezone). Returns `403` if attempted.
- `[date, mealType]` must not already exist. Returns `409` if conflict.

---

### `PATCH /api/meal-slots/[id]`

Update an existing meal slot (edit meal name, toddler flag, or approve ingredients).

**Request body (all fields optional):**
```json
{
  "mealName": "Prawn masala",
  "isToddlerAppropriate": false
}
```

If `mealName` changes: existing ingredients are deleted, `ingredientsStatus` is reset to `PENDING`, and Ollama re-runs in the background (see AC-008).

**Validation:** Slot date must not be a past day. Returns `403` if attempted.

---

### `DELETE /api/meal-slots/[id]`

Clear a meal slot. Deletes the slot and all its ingredients (cascade).

**Validation:** Slot date must not be a past day. Returns `403` if attempted.

---

### `PATCH /api/meal-slots/[id]/ingredients`

Approve or edit ingredients after Ollama returns them.

**Request body:**
```json
{
  "ingredients": [
    { "id": "clx...", "name": "Rolled oats", "approved": true },
    { "id": "clx...", "name": "Milk", "approved": false }
  ]
}
```

Replaces the ingredient list for the slot. Used when the user edits or approves the Ollama-generated list.

---

### `POST /api/toddler-overrides`

Mark a specific day as toddler home (override the default schedule).

**Request body:**
```json
{
  "date": "2025-01-06",
  "isHome": true
}
```

Upserts a `ToddlerOverride` record. If meals are already planned for that date and any slot is not `isToddlerAppropriate`, the response includes a `conflicts` array (see AC-006).

**Response:**
```json
{
  "override": { "date": "2025-01-06", "isHome": true },
  "conflicts": [
    { "slotId": "clx...", "mealType": "LUNCH", "mealName": "Misal pav" }
  ]
}
```

The override is **not saved** if `conflicts` is non-empty — the client must prompt the user to resolve conflicts first, then re-POST with a `force: true` flag to save anyway.

---

## 3. Component Tree

```
app/
└── page.tsx                        ← renders <MealPlanGrid />

components/
├── meal-plan-grid/
│   ├── meal-plan-grid.tsx          ← root: fetches week data via SWR, owns week navigation state
│   ├── week-nav.tsx                ← prev / current / next week buttons + week label
│   ├── day-column.tsx              ← one column per day; receives day data, renders header + 3 slots
│   ├── day-header.tsx              ← date label, toddler indicator, toddler override toggle
│   └── meal-slot-cell/
│       ├── meal-slot-cell.tsx      ← orchestrates empty / editing / filled states
│       ├── meal-slot-empty.tsx     ← click-to-edit empty state
│       ├── meal-slot-editing.tsx   ← inline form: meal name input + toddler toggle + confirm/cancel
│       ├── meal-slot-filled.tsx    ← displays meal name; click to re-edit
│       ├── ingredient-list.tsx     ← lists ingredients with approve checkboxes + edit option
│       └── ingredient-loading.tsx  ← spinner shown while ingredientsStatus === "PENDING"
```

**State ownership:**
- Week offset (0 = current, 1 = next, -1 = previous) — local state in `meal-plan-grid.tsx`.
- Week data (slots, toddler overrides, isPast flags) — SWR cache, keyed by week Sunday date.
- Editing state (which cell is open) — local state in `meal-slot-cell.tsx`.

**SWR polling:** While any slot in the current week has `ingredientsStatus === "PENDING"`, SWR refreshes every 3 seconds. Polling stops when all slots are `READY`, `FAILED`, or `EMPTY`.

---

## 4. Ollama Integration

Ollama is called **after** the slot is saved and the API response is sent to the client.

**Implementation pattern — background task in API route:**

```typescript
// lib/config.ts — read once at module load; never hardcode household values in routes
import { env } from '@/lib/env'

// In POST /api/meal-slots or PATCH /api/meal-slots/[id]
// After: return NextResponse.json(savedSlot)

void generateIngredients(savedSlot.id, savedSlot.mealName)

function buildIngredientPrompt(mealName: string): string {
  const cuisineClause = env.CUISINE_CONTEXT
    ? `, a dish from ${env.CUISINE_CONTEXT} cuisine`
    : ''
  return `List the ingredients needed to make "${mealName}"${cuisineClause}. Return only a simple comma-separated list of ingredients, nothing else.`
}

async function generateIngredients(slotId: string, mealName: string) {
  try {
    const response = await fetch(`${env.OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt: buildIngredientPrompt(mealName),
        stream: false,
      }),
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    })

    const data = await response.json()
    const names = data.response.split(',').map((s: string) => s.trim()).filter(Boolean)

    await prisma.mealSlot.update({
      where: { id: slotId },
      data: {
        ingredientsStatus: 'READY',
        ingredients: {
          deleteMany: {},
          create: names.map((name: string) => ({ name, approved: false })),
        },
      },
    })
  } catch {
    await prisma.mealSlot.update({
      where: { id: slotId },
      data: { ingredientsStatus: 'FAILED' },
    })
  }
}
```

**Config:** All Ollama and household context values come from environment variables via `lib/env.ts`. Never hardcode `OLLAMA_HOST`, `OLLAMA_MODEL`, or `CUISINE_CONTEXT` in application code.

**`lib/env.ts`:** Validate required vars at startup (same pattern as `HOME_TIMEZONE`). Export a typed `env` object. `CUISINE_CONTEXT` is optional — when unset, the ingredient prompt omits cuisine (works for any household).

**Timeout:** 10 seconds. If Ollama does not respond, slot status becomes `FAILED`.

**No queue:** Next.js route handlers run in Node.js. `void` the promise — fire and forget. This is acceptable for a single-household local app. No BullMQ or background worker needed.

---

## 5. Timezone Handling

All date logic uses `date-fns-tz`. The home timezone is read from `env.HOME_TIMEZONE` in `lib/env.ts` (e.g. `America/Toronto`).

**Getting today in home timezone:**
```typescript
import { toZonedTime, format } from 'date-fns-tz'
import { env } from '@/lib/env'

const HOME_TZ = env.HOME_TIMEZONE

function getToday(): string {
  return format(toZonedTime(new Date(), HOME_TZ), 'yyyy-MM-dd')
}
```

**Getting the Sunday of a given week:**
```typescript
import { startOfWeek } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'

function getWeekStart(offsetWeeks: number = 0): string {
  const now = toZonedTime(new Date(), HOME_TZ)
  const sunday = startOfWeek(now, { weekStartsOn: 0 })
  sunday.setDate(sunday.getDate() + offsetWeeks * 7)
  return format(sunday, 'yyyy-MM-dd')
}
```

**isPast check:**
```typescript
function isPastDay(date: string): boolean {
  return date < getToday()
}
```

String comparison works correctly for `YYYY-MM-DD` format.

---

## 6. Toddler Home Logic

A day is "toddler home" if any of the following is true:
1. The day of the week is Saturday or Sunday (default schedule).
2. A `ToddlerOverride` record exists for that date with `isHome: true`.
3. A `ToddlerOverride` record exists for a weekday with `isHome: true` (planned holiday).

A `ToddlerOverride` with `isHome: false` on a weekend is valid — it marks a weekend day when the toddler is away (e.g. grandparents visit). In that case the toddler constraint does not apply.

This logic lives in `lib/toddler.ts` and is called by the `GET /api/meal-plan` route.

---

## 7. Environment Variables

Add to `.env.local` (gitignored):

```
HOME_TIMEZONE=America/Toronto
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
# Optional. Omit for cuisine-agnostic ingredient prompts.
CUISINE_CONTEXT=South Indian or Maharashtrian
DATABASE_URL=file:./dev.db
```

Add to `.env.example` (committed, no values):

```
HOME_TIMEZONE=
OLLAMA_HOST=
OLLAMA_MODEL=
# Optional — e.g. "Italian", "Mexican", "South Indian or Maharashtrian"
CUISINE_CONTEXT=
DATABASE_URL=
```

---

## 8. Out of Scope for This Plan

The following are not addressed here and must not be implemented as part of Feature 001 tasks:

- Family rules engine — slot validity constraints beyond toddler rules (Feature 002).
- Shopping list generation from approved ingredients (Feature 003).
- Multi-user sync or conflict resolution (Feature 004).
- Any authentication or session handling.
- Nutritional data or serving sizes.
- Recipe steps or cooking instructions.
