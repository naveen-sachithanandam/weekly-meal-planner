# Plan: 001 — Weekly Meal Plan Grid

Derived from: `sdd/001-meal-plan-grid/spec.md`
Constitution: `.cursor/rules/project-constitution.mdc`

This document is the technical source of truth for implementing Feature 001.
Tasks (tasks.md) are derived from this plan. Do not implement behavior not
reflected here or in the spec.

---

## 1. Data Model

Four new Prisma models. Add to `prisma/schema.prisma`.

```prisma
model MealTypeConfig {
  id        String     @id @default(cuid())
  name      String     @unique   // "Breakfast", "Lunch", "Dinner", "Supper", etc.
  sortOrder Int                  // determines row order in the grid; lower = higher
  isActive  Boolean    @default(true)  // soft-delete; inactive types hidden from grid
  slots     MealSlot[]
  createdAt DateTime   @default(now())
}

model MealSlot {
  id                   String           @id @default(cuid())
  date                 String           // YYYY-MM-DD in home timezone
  mealTypeConfigId     String
  mealTypeConfig       MealTypeConfig   @relation(fields: [mealTypeConfigId], references: [id])
  mealName             String
  isToddlerAppropriate Boolean          @default(false)
  ingredientsStatus    IngredientsStatus @default(PENDING)
  ingredients          Ingredient[]
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  @@unique([date, mealTypeConfigId])
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

enum IngredientsStatus {
  PENDING  // Ollama has been called, waiting for response
  READY    // Ingredients returned and stored
  FAILED   // Ollama timed out or errored
  EMPTY    // No ingredients (Ollama was unavailable at save time)
}
```

**Design decisions:**
- `MealType` enum is removed. Meal types are DB records, not compile-time constants. This allows the household to configure their own meal structure without a code change.
- `MealTypeConfig.isActive` — soft-delete only. A meal type with existing `MealSlot` records cannot be hard-deleted without orphaning data. Mark inactive instead.
- `MealTypeConfig.sortOrder` — integer, not an enum position. Gaps are fine (`1, 2, 10`). The grid renders meal type rows in ascending `sortOrder`. Managed by Feature 002.
- `date` is stored as a `String` (`YYYY-MM-DD`) — not a `DateTime`. Avoids timezone drift when reading back from SQLite.
- `@@unique([date, mealTypeConfigId])` — one slot per meal type per day. Enforced at DB level.
- `Ingredient.approved` — tracks whether the user has reviewed and approved each ingredient before it flows to the shopping list (Feature 003).

**Seed data:** On first run, `prisma/seed.ts` inserts three default `MealTypeConfig` records if none exist:

```typescript
await prisma.mealTypeConfig.createMany({
  skipDuplicates: true,
  data: [
    { name: 'Breakfast', sortOrder: 1 },
    { name: 'Lunch',     sortOrder: 2 },
    { name: 'Dinner',    sortOrder: 3 },
  ],
})
```

Run with `npx prisma db seed` (configured in `package.json`). Safe to re-run — `skipDuplicates` prevents double-insertion.

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
  "mealTypes": [
    { "id": "clx...", "name": "Breakfast", "sortOrder": 1 },
    { "id": "clx...", "name": "Lunch",     "sortOrder": 2 },
    { "id": "clx...", "name": "Dinner",    "sortOrder": 3 }
  ],
  "days": [
    {
      "date": "2025-01-05",
      "isToddlerHome": true,
      "isPast": false,
      "slots": [
        {
          "id": "clx...",
          "mealTypeConfigId": "clx...",
          "mealTypeName": "Breakfast",
          "mealName": "Idli",
          "isToddlerAppropriate": true,
          "ingredientsStatus": "READY",
          "ingredients": [
            { "id": "clx...", "name": "Idli rice", "approved": true },
            { "id": "clx...", "name": "Urad dal",  "approved": true },
            { "id": "clx...", "name": "Salt",       "approved": true }
          ]
        }
      ]
    }
  ]
}
```

`mealTypes` — the active `MealTypeConfig` records in `sortOrder` ascending. The UI uses this array to render the correct number of meal rows for each day column.
`isToddlerHome` — derived: true if day is Saturday/Sunday, OR if a `ToddlerOverride` record exists for that date with `isHome: true`.
`isPast` — derived at the API layer using home timezone. True if date is before today.

---

### `POST /api/meal-slots`

Save a new meal slot immediately (before Ollama responds).

**Request body:**
```json
{
  "date": "2025-01-07",
  "mealTypeConfigId": "clx...",
  "mealName": "Sambar rice",
  "isToddlerAppropriate": true
}
```

**Response:** The created `MealSlot` with `ingredientsStatus: "PENDING"` (if Ollama available) or `"EMPTY"` (if Ollama unavailable).

**Side effect:** After responding, the route fires a background call to Ollama. This does not block the response. See §4 (Ollama Integration).

**Validation:**
- `date` must not be a past day (before today in home timezone). Returns `403` if attempted.
- `mealTypeConfigId` must reference an active `MealTypeConfig`. Returns `400` if not found or inactive.
- `[date, mealTypeConfigId]` must not already exist. Returns `409` if conflict.

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
│   ├── meal-plan-grid.tsx          ← root: SWR fetch, week nav state, row-label column + day columns
│   ├── week-nav.tsx                ← weekly date range display with integrated prev/next chevrons
│   │                                  e.g. ‹  May 10 – May 16  › plus a "this week" reset button
│   ├── meal-type-row-labels.tsx    ← optional: left column listing meal type names for the week
│   ├── day-column.tsx              ← one column per day; receives day data + mealTypes array;
│   │                                  renders header + one MealSlotCell per active meal type
│   ├── day-header.tsx              ← date label, toddler indicator, toddler override toggle
│   └── meal-slot-cell/
│       ├── meal-slot-cell.tsx      ← orchestrates empty / editing / filled states; may show
│       │                                  meal type name above the slot if not using a shared row-label column
│       ├── meal-slot-empty.tsx     ← click-to-edit empty state
│       ├── meal-slot-editing.tsx   ← inline form: meal name input + toddler toggle + confirm/cancel
│       ├── meal-slot-filled.tsx    ← meal name + explicit Edit/Delete tile actions;
│       │                                  Delete confirms then DELETE /api/meal-slots/[id]
│       ├── ingredient-list.tsx     ← lists ingredients with approve checkboxes + edit option
│                                         (ingredient edit is separate from tile Edit)
│       └── ingredient-loading.tsx  ← spinner shown while ingredientsStatus === "PENDING"
```

**State ownership:**
- Week offset (0 = current, 1 = next, -1 = previous) — local state in `meal-plan-grid.tsx`.
- Week data (slots, toddler overrides, isPast flags) — SWR cache, keyed by week Sunday date.
- Editing state (which cell is in name-entry form) — local state in `meal-slot-cell.tsx`.
- Expanded ingredient section (`expandedSlotId: string | null`) — local state in `meal-plan-grid.tsx`. Only one cell may be expanded at a time. `MealPlanGrid` passes `isExpanded` and `onToggle(slotId)` down through `DayColumn` → `MealSlotCell` → `MealSlotFilled`. When a second cell is toggled open, `MealPlanGrid` sets `expandedSlotId` to that cell's id (collapsing the first automatically).

**WeekNav layout:** The weekly date range label is the primary navigation surface. Prev (`‹`) and next (`›`) chevrons sit on either side of the date range string. A separate "This week" button resets `weekOffset` to 0. Prev chevron disabled when `weekOffset === -1`. Next chevron disabled when `weekOffset === 1`.

**Meal type row labels (spec AC-009):** The grid must show each active meal type's `name` so rows are identifiable across the week. Two valid layouts (pick one in implementation):

1. **Row-title column** — a narrow column to the left of the seven day columns lists meal type names once per row, aligned with that row's slots across all days.
2. **Per-cell label** — each `MealSlotCell` renders the meal type name above the slot content (same label repeated in every day column for that row).

Labels come from `mealTypes[]` on the meal plan response. Do not hardcode Breakfast/Lunch/Dinner strings. When Feature 002 renames or reorders types, labels and row order follow `mealTypes[]` on the next fetch.

**Filled tile actions and collapsible ingredient section (spec AC-010):**

`MealSlotFilled` has two layers:

**Compact header (always visible):**
- Meal name on the left.
- Status badge on the right: ingredient count chip (READY), animated spinner chip (PENDING), warning chip (FAILED/EMPTY).
- **Edit** and **Delete** icon buttons in the top-right corner (always visible, not hidden behind expand).
  - Edit calls `onStartEditing()`.
  - Delete shows a confirmation prompt, then `DELETE /api/meal-slots/[id]`, then `onMutate()`.
- Clicking anywhere on the compact header (other than Edit/Delete) toggles the ingredient section open or closed by calling `onToggle(slot.id)`.

**Collapsible ingredient section (visible when `isExpanded === true`):**
- Expands inline below the compact header — no drawer, no modal, no separate panel.
- Shows the full ingredient list with approve checkboxes.
- Shows `<IngredientLoading>` if status is PENDING, an error state with manual-add if FAILED/EMPTY.
- Ingredient-list Edit edits ingredients only (not the meal name).
- CSS: use a smooth `max-height` or `grid-rows` transition; keep the cell width fixed so adjacent columns do not shift.

Only one cell can be expanded at a time — this is enforced at `MealPlanGrid` level via `expandedSlotId`. Past-day cells are always compact and non-interactive (no expand, no Edit, no Delete).

**Cell state wireframes:**

```
EMPTY — future day
┌──────────────────────────────────┐
│  + Add meal                      │
└──────────────────────────────────┘

EDITING — future day (inline form)
┌──────────────────────────────────┐
│  [Chana masala_______________]   │
│  ☑  Toddler-appropriate?         │
│  [Confirm]   [Cancel]            │
└──────────────────────────────────┘

FILLED — compact (collapsed, default)
┌──────────────────────────────────┐
│  Sambar rice       [●4]  [✎][✕] │
└──────────────────────────────────┘

FILLED — expanded (click header to open)
┌──────────────────────────────────┐
│  Sambar rice       [●4]  [✎][✕] │
├──────────────────────────────────┤
│  ☑  Toor dal                     │
│  ☑  Tamarind                     │
│  ☑  Tomatoes                     │
│  ☐  Green chillies               │
│  [__________________]  [+ Add]   │
└──────────────────────────────────┘

PENDING — compact (Ollama generating)
┌──────────────────────────────────┐
│  Idli                [⟳]  [✎][✕]│
└──────────────────────────────────┘

PENDING — expanded (spinner inside section)
┌──────────────────────────────────┐
│  Idli                [⟳]  [✎][✕]│
├──────────────────────────────────┤
│  ⟳  Generating ingredients…      │
└──────────────────────────────────┘

FAILED / EMPTY — expanded (manual add fallback)
┌──────────────────────────────────┐
│  Baingan bharta      [⚠]  [✎][✕]│
├──────────────────────────────────┤
│  ⚠  Ingredients unavailable.     │
│  [__________________]  [+ Add]   │
└──────────────────────────────────┘

PAST DAY — read-only, no controls, no expand
┌──────────────────────────────────┐
│  Rajma chawal        [●5]        │  ← greyed (opacity 0.45)
└──────────────────────────────────┘
```

**Grid layout wireframe (week view, 3 meal types, current week):**

```
          ‹   May 10 – May 16   ›   [This week]

          SUN 10       MON 11       TUE 12   ...  SAT 16
          [🧒 home]                                [🧒 home]
          ─────────────────────────────────────────────────
Breakfast │ Idli [●4] │ Oats [●3] │ + Add   │ │ Rava dosa  │
          │  (past)   │  (past)   │ (past)  │ │ [●3][✎][✕] │ ← today
          │           │           │         │ │ ☑ Semolina  │ ← expanded
          │           │           │         │ │ ☑ Rice flour│
          ─────────────────────────────────────────────────
Lunch     │  (past)   │  (past)   │ (past)  │ │ [editing…] │
          ─────────────────────────────────────────────────
Dinner    │ Rajma[●5] │  (past)   │ (past)  │ │ Bharta [⚠] │
          ─────────────────────────────────────────────────
```

See `sdd/001-meal-plan-grid/mockup-meal-slot.html` for an interactive rendered version.

**Design language — warm/homely palette:**

The UI should feel like a handwritten planner, not a productivity dashboard. Use these CSS custom properties (define in `globals.css`):

```css
:root {
  --color-base:        #fdfaf6; /* page background — warm linen */
  --color-surface:     #fdf6ee; /* card / column header background */
  --color-border:      #ede5d8; /* cell borders, dividers */
  --color-text:        #3d2c1e; /* primary text — warm near-black */
  --color-text-muted:  #8a7060; /* secondary labels, muted dates */
  --color-accent:      #c17f3a; /* amber — interactive elements, focus rings */
  --color-accent-soft: #fdf0de; /* amber fill for hover states */

  /* Status badges */
  --badge-ready-bg:    #eaf4e0;
  --badge-ready-text:  #3d6b1a;
  --badge-pending-bg:  #e8f0fc;
  --badge-pending-text:#3355a0;
  --badge-warn-bg:     #fce8e8;
  --badge-warn-text:   #a02020;

  /* Toddler home indicator */
  --toddler-bg:        #fff3e0;
  --toddler-text:      #a05a1a;
}
```

Cells: `border-radius: 0.75rem`, subtle `box-shadow: 0 1px 3px rgba(61,44,30,0.08)`. Past-day cells use `opacity: 0.45` and `pointer-events: none`. Transitions on expand/collapse: `150ms ease-out`. Font: system sans-serif stack — no web fonts required.

Do not use Tailwind's default gray/blue color classes for any surface, text, or badge — map everything through the CSS variables above.

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

All date logic uses `date-fns-tz`. The home timezone is read from `env.HOME_TIMEZONE` in `lib/env.ts` (e.g. `America/Chicago`).

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
HOME_TIMEZONE=America/Chicago
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

## 8. Docker

The app ships as a Docker image built with a multi-stage `Dockerfile`.
A `docker-compose.yml` at the repo root orchestrates the container and volume.

**`Dockerfile` (multi-stage):**
```dockerfile
# Stage 1 — deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3 — runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

**`docker-compose.yml`:**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local          # gitignored — same file used for bare dev
    environment:
      DATABASE_URL: file:/data/meal-planner.db
      OLLAMA_HOST: http://host.docker.internal:11434
    volumes:
      - meal-db:/data        # SQLite persisted here, never inside the image
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux compatibility
    restart: unless-stopped

volumes:
  meal-db:
```

**Key rules:**
- Ollama is NOT a service in `docker-compose.yml`. It runs on the host.
- `DATABASE_URL` overrides the value in `.env.local` to point to the volume path `/data/`.
- `extra_hosts: host.docker.internal:host-gateway` ensures Linux hosts (non-Mac Docker) can also reach Ollama.
- The `prisma/seed.ts` is run once after first deploy via `docker compose exec app npx prisma db seed`.

**`.dockerignore`:**
```
node_modules
.next
*.db
*.db-journal
.env.local
.env.*.local
```

---

## 9. Out of Scope for This Plan

The following are not addressed here and must not be implemented as part of Feature 001 tasks:

- Family rules engine — slot validity constraints beyond toddler rules (Feature 002).
- Shopping list generation from approved ingredients (Feature 003).
- Multi-user sync or conflict resolution (Feature 004).
- Any authentication or session handling.
- Nutritional data or serving sizes.
- Recipe steps or cooking instructions.
