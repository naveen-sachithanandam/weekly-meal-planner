# Weekly Meal Planner — Architecture

System architecture for the household meal planner. Derived from the [project constitution](../.cursor/rules/project-constitution.mdc) and feature plans (`001`–`003`).

**Related docs**

| Doc | Purpose |
|-----|---------|
| [Feature 001 — Meal plan grid](001-meal-plan-grid/spec.md) | Grid, slots, Ollama ingredients, toddler overrides |
| [Feature 002 — Configuration](002-configuration/spec.md) | Meal type CRUD, reorder, soft-delete |
| [Feature 003 — Shopping list](003-shopping-list/spec.md) | Approved-ingredient aggregation |
| [Feature 001 HTML rollup](001-meal-plan-grid/feature-001.html) | Interactive spec with detailed diagrams |

---

## 1. System context

Single-household app on a home Mac Mini. No cloud, no auth, no multi-tenancy. Two adults plan meals; toddler constraints are enforced by rules and overrides, not by a separate user account.

```mermaid
flowchart LR
    Users([Household browsers\nhome network])
    App[Next.js 15 app\nDocker container]
    DB[(SQLite\nDocker volume)]
    Ollama[Ollama\nhost Mac Mini]

    Users -->|HTTP| App
    App -->|Prisma| DB
    App -.->|async generate\nhost.docker.internal| Ollama
```

**Invariants** (constitution §3): home timezone for all day boundaries; weeks start Sunday; past days read-only; saves never block on Ollama; ingredient generation is fire-and-forget.

---

## 2. Deployment

```mermaid
flowchart TB
    subgraph host["Mac Mini (host)"]
        Ollama[Ollama :11434]
    end

    subgraph docker["Docker Compose"]
        App[weekly-meal-planner\nNext.js :3000]
        Vol[(named volume\nSQLite file)]
    end

    Browser([Browser]) --> App
    App --> Vol
    App -.->|OLLAMA_HOST=host.docker.internal:11434| Ollama
```

| Concern | Choice |
|---------|--------|
| App runtime | Docker multi-stage build (`docker-compose.yml`) |
| Database | SQLite on a **mounted volume** (never baked into the image) |
| AI | Ollama on the **host** only — not a Compose service |
| Config | `.env.local` → `lib/config.ts` (`HOME_TIMEZONE`, `OLLAMA_*`, `DATABASE_URL`) |

---

## 3. Application layers

```mermaid
flowchart TB
    subgraph client["Browser (React 19 + SWR)"]
        Pages["app/page.tsx\napp/settings/page.tsx\napp/shopping/page.tsx"]
        Components["components/meal-plan-grid/*\ncomponents/configuration/*\ncomponents/shopping-list/*"]
        Pages --> Components
    end

    subgraph server["Next.js App Router"]
        API["app/api/*\nroute handlers"]
        Lib["lib/*\ndate, toddler, ollama, shopping-list"]
        API --> Lib
    end

    subgraph data["Persistence"]
        Prisma[Prisma client]
        SQLite[(SQLite)]
        Prisma --> SQLite
    end

    Components -->|fetch / SWR| API
    Lib --> Prisma
    API --> Prisma
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes (UI) | `app/` | Pages: `/`, `/settings`, `/shopping` |
| Routes (API) | `app/api/` | JSON REST handlers |
| Domain logic | `lib/` | Dates, toddler rules, Ollama, dedupe, serialization |
| UI | `components/` | Grid, configuration, shopping list, nav |
| Schema | `prisma/schema.prisma` | `MealTypeConfig`, `MealSlot`, `Ingredient`, `ToddlerOverride` |

---

## 4. Features and data flow

```mermaid
flowchart LR
    F001[Feature 001\nMeal plan grid]
    F002[Feature 002\nConfiguration]
    F003[Feature 003\nShopping list]

    F002 -->|MealTypeConfig rows| F001
    F001 -->|approved Ingredient| F003
```

| Feature | User-facing | Writes data? | Reads |
|---------|-------------|--------------|-------|
| **001** | Weekly grid, slots, ingredients, toddler day toggles | `MealSlot`, `Ingredient`, `ToddlerOverride` | `MealTypeConfig` (active only) |
| **002** | Settings: add/rename/reorder/deactivate meal types | `MealTypeConfig` | All meal types |
| **003** | Shopping list (print-friendly) | None (read-only aggregation) | Approved ingredients for week |

---

## 5. Data model

Dates are stored as `YYYY-MM-DD` strings in the home timezone. One slot per `(date, mealTypeConfigId)`.

```mermaid
erDiagram
    MealTypeConfig {
        String id PK
        String name UK
        Int sortOrder
        Boolean isActive
        DateTime createdAt
    }
    MealSlot {
        String id PK
        String date
        String mealTypeConfigId FK
        String mealName
        Boolean isToddlerAppropriate
        Enum ingredientsStatus
        DateTime createdAt
        DateTime updatedAt
    }
    Ingredient {
        String id PK
        String mealSlotId FK
        String name
        Boolean approved
    }
    ToddlerOverride {
        String id PK
        String date UK
        Boolean isHome
    }

    MealTypeConfig ||--o{ MealSlot : "one type, many slots"
    MealSlot ||--o{ Ingredient : "one slot, many ingredients"
```

**`ingredientsStatus`** on `MealSlot`: `PENDING` | `READY` | `FAILED` | `EMPTY` — set at save time from Ollama reachability; updated asynchronously when generation completes.

---

## 6. API surface

```mermaid
flowchart LR
    Client([Browser / SWR])

    Client --> MP["GET /api/meal-plan"]
    Client --> MS["POST /api/meal-slots"]
    Client --> MSI["PATCH/DELETE\n/api/meal-slots/[id]"]
    Client --> ING["PATCH\n/api/meal-slots/[id]/ingredients"]
    Client --> TO["POST /api/toddler-overrides"]
    Client --> MT["GET/POST/PATCH/DELETE\n/api/configuration/meal-types"]
    Client --> SL["GET /api/shopping-list"]

    MP --> DB[(SQLite)]
    MS --> DB
    MS -.->|after() fire-and-forget| OL[Ollama]
    MSI --> DB
    MSI -.->|meal name change| OL
    ING --> DB
    TO --> DB
    MT --> DB
    SL --> DB
```

| Method | Route | Feature |
|--------|-------|---------|
| `GET` | `/api/meal-plan?offset=` | 001 — week grid payload |
| `POST` | `/api/meal-slots` | 001 — create slot + schedule Ollama |
| `PATCH` | `/api/meal-slots/[id]` | 001 — update name (resets ingredients) |
| `DELETE` | `/api/meal-slots/[id]` | 001 — remove slot |
| `PATCH` | `/api/meal-slots/[id]/ingredients` | 001 — manual edit / approve |
| `POST` | `/api/toddler-overrides` | 001 — day home/away override |
| `GET/POST/PATCH/DELETE` | `/api/configuration/meal-types` | 002 |
| `PATCH` | `/api/configuration/meal-types/reorder` | 002 |
| `GET` | `/api/shopping-list?offset=` | 003 — deduped approved names |

---

## 7. Client architecture (Feature 001)

`MealPlanGrid` owns `weekOffset` and `expandedSlotId` (only one expanded cell). SWR key: `/api/meal-plan?offset={n}`. Polls every 3s while any slot is `PENDING`.

```mermaid
flowchart TD
    Page["app/page.tsx"]
    Page --> Grid["MealPlanGrid"]
    Grid --> WeekNav["WeekNav"]
    Grid --> DC["DayColumn × 7"]
    DC --> DH["DayHeader"]
    DC --> MSC["MealSlotCell × N meal types"]
    MSC --> Empty["MealSlotEmpty"]
    MSC --> Editing["MealSlotEditing"]
    MSC --> Filled["MealSlotFilled"]
    MSC --> Past["MealSlotPast"]
    Filled --> IL["IngredientList"]
    Filled --> Badge["StatusBadge"]
```

Feature 003 reuses `WeekNav` and the same week `offset` semantics. Approving an ingredient in the grid triggers SWR `mutate` for `/api/shopping-list` keys.

---

## 8. Sequence: save meal slot

Slot is persisted before Ollama returns. UI shows the slot immediately; ingredients appear after background generation (or manual entry).

```mermaid
sequenceDiagram
    actor U as User
    participant UI as MealSlotEditing
    participant API as POST /api/meal-slots
    participant DB as SQLite
    participant OL as Ollama

    U->>UI: Confirm meal name
    UI->>API: POST slot
    API->>DB: 403 if past day; 409 if duplicate
    API->>OL: reachability check
    alt reachable
        API->>DB: INSERT PENDING
    else unreachable
        API->>DB: INSERT EMPTY
    end
    API-->>UI: 200 slot
    Note over API,OL: after() — generateIngredients
    API->>OL: generate
    OL-->>API: ingredient list
    API->>DB: READY + Ingredient rows
    Note over UI: SWR polls until not PENDING
```

Implementation: `lib/ollama.ts` (`scheduleIngredientGeneration`), Next.js `after()` so work continues after the response (see decision log DL-013).

---

## 9. Sequence: load week

```mermaid
sequenceDiagram
    actor U as User
    participant Grid as MealPlanGrid
    participant API as GET /api/meal-plan
    participant DB as SQLite

    U->>Grid: Open app / change week
    Grid->>API: GET ?offset=
    API->>DB: meal types, slots, overrides
    API-->>Grid: weekStart, mealTypes, days
    Grid-->>U: 7 columns × N rows

    loop while any slot PENDING
        Grid->>API: GET
        API-->>Grid: updated ingredients
    end
```

Week boundaries and `isPast` are computed server-side in `lib/date.ts` using `HOME_TIMEZONE` — the client never imports timezone logic.

---

## 10. Shopping list (Feature 003)

```mermaid
flowchart LR
    Grid["Meal plan grid\nIngredientList"]
    API["GET /api/shopping-list"]
    View["ShoppingListView\n/shopping"]
    Lib["lib/shopping-list.ts\ndedupeIngredientNames"]

    Grid -->|approve checkbox| DB[(Ingredient.approved)]
    Grid -->|mutate SWR| View
    View --> API
    API --> Lib
    API --> DB
```

No schema changes. Case-insensitive dedupe, sorted output. Print styles hide nav (`.no-print`).

---

## 11. Configuration (Feature 002)

Settings page manages `MealTypeConfig`: create, rename, reorder (`@dnd-kit`), soft-delete (`isActive: false`). At least one active meal type must remain. Inactive types are hidden from the grid but preserve historical slots.

---

## 12. SDD artifact map

```mermaid
flowchart TB
    Constitution[".cursor/rules/project-constitution.mdc"]
    Arch["sdd/architecture.md\n(this document)"]
    Spec["sdd/00X/spec.md"]
    Plan["sdd/00X/plan.md"]
    Tasks["sdd/00X/tasks.md"]
    Code["app/ lib/ components/"]

    Constitution --> Spec
    Constitution --> Plan
    Spec --> Plan
    Plan --> Tasks
    Tasks --> Code
    Arch --> Spec
    Plan --> Arch
```

Implementers load constitution + plan + single task per chat. Schema or API changes require a matching spec/plan update before code.
