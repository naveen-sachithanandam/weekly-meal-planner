# Architecture and logic flow

Mermaid diagrams for V1: **runtime shape**, **persistence**, and **primary flows**. Render these in GitHub, VS Code (Mermaid preview), or any Markdown viewer that supports Mermaid.

---

## System context

Devices on the home network (often via Tailscale) talk to a single Next.js deployment. No auth in V1; SQLite holds one household’s data.

```mermaid
flowchart LR
  subgraph clients ["Clients (LAN / Tailscale)"]
    A["Browser — spouse A"]
    B["Browser — spouse B"]
  end

  subgraph deploy ["Deployment"]
    N["Next.js App Router\npages + route handlers"]
    P["Prisma Client"]
    DB[("SQLite file\nDATABASE_URL")]
  end

  A --> N
  B --> N
  N --> P
  P --> DB
```

---

## In-process layering

UI routes consume HTTP APIs or server components that call shared libraries. Rules stay centralized in `lib/meal-rules.ts`; persistence follows `prisma/schema.prisma`.

```mermaid
flowchart TB
  subgraph ui ["App Router — UI"]
    HP["app/page.tsx"]
    MP["app/meal-plan/page.tsx"]
    SP["app/shopping-list/page.tsx"]
    C["components/*"]
  end

  subgraph api ["Route handlers"]
    R1["/api/meal-plan"]
    R2["/api/shopping-list/*"]
  end

  subgraph lib ["Shared logic"]
    MR["lib/meal-rules.ts"]
    WB["lib/week-boundary.ts"]
    SU["lib/shopping-utils.ts\n(+ shopping-* helpers)"]
    PR["lib/prisma.ts"]
  end

  subgraph data ["Data"]
    DB[("SQLite")]
  end

  HP --> C
  MP --> C
  SP --> C
  C --> R1
  C --> R2
  R1 --> MR
  R1 --> WB
  R1 --> PR
  R2 --> WB
  R2 --> SU
  R2 --> PR
  PR --> DB
```

---

## Data model (conceptual)

One week anchor owns days and shopping groups; each day owns meal slots. Shopping merges many **contributions** into one **group** for aisle/checklist views.

```mermaid
erDiagram
  WeeklyPlan ||--o{ DayPlan : contains
  WeeklyPlan ||--o{ ShoppingLineGroup : contains
  DayPlan ||--o{ MealSlot : contains
  ShoppingLineGroup ||--o{ ShoppingLineContribution : rolls_up
  MealSlot ||--o{ ShoppingLineContribution : attributes_optional

  WeeklyPlan {
    string id PK
    datetime weekStartSunday UK
  }

  DayPlan {
    string id PK
    boolean isTrip
    string tripNotes
  }

  MealSlot {
    string id PK
    string slot
    string mainMealText
    boolean proteinWarning
    boolean isQuick
    boolean isMakeAhead
    boolean isEasy
    boolean needsTime
  }

  ShoppingLineGroup {
    string id PK
    string section
    string displayName
    string mergeKey
    int sortOrder
    boolean checked
    boolean alreadyHave
  }

  ShoppingLineContribution {
    string id PK
    string quantityText
    string mergeUnitKey
    int sortOrder
  }
```

---

## Meal plan load and save

Toronto week resolution picks the active `WeeklyPlan` row (by `weekStartSunday`). Saves replace the nested graph according to your handler design (**last write wins**).

```mermaid
sequenceDiagram
  participant UI as Meal plan UI
  participant API as GET/POST /api/meal-plan
  participant WB as week-boundary helpers
  participant MR as meal-rules
  participant DB as Prisma + SQLite

  UI->>API: GET (current week)
  API->>WB: Resolve weekStartSunday (America/Toronto)
  WB-->>API: Week key
  API->>DB: Load WeeklyPlan + DayPlans + MealSlots
  DB-->>API: Rows
  API->>MR: Labels/rules for presentation (optional)
  MR-->>API: Constants / predicates
  API-->>UI: JSON plan

  UI->>API: POST (edited plan)
  API->>WB: Validate week key
  API->>MR: Validate tags vs rules (optional)
  API->>DB: Upsert plan subtree (last write wins)
  DB-->>API: OK
  API-->>UI: Success / snapshot
```

---

## Shopping list: generation, views, and polling

View 1 lists **contributions** by meal; Views 2–3 show merged **groups** (aisle + checklist). The **`/shopping-list`** page uses **SWR** with a **~60 second** refresh on **`GET /api/shopping-list`** for shared checklist state.

**Batch ingredient generation** from the meal grid (`POST /api/shopping-list/generate` in **`SPEC.md`**) is **not implemented** yet; lines still appear from **`POST /api/shopping-list/item`**, tests/seed data, or any future generator.

```mermaid
flowchart TB
  subgraph sources ["Inputs (current build)"]
    MAN["POST /api/shopping-list/item"]
  end

  subgraph build ["Persistence"]
    CON["ShoppingLineContribution rows"]
    MRG["Merge on write\n(same mergeKey → same group)"]
    GRP["ShoppingLineGroup rows\nsection, flags, sortOrder"]
  end

  subgraph views ["GET /api/shopping-list"]
    V1["View 1 — by meal"]
    V2["View 2 — by aisle"]
    V3["View 3 — checklist"]
  end

  MAN --> CON
  CON --> MRG
  MRG --> GRP
  GRP --> V2
  GRP --> V3
  CON --> V1

  subgraph poll ["Sync"]
    CL["SWR refreshInterval\n~60s"]
  end

  CL --> V2
  CL --> V3
```

---

## Eat-out vs trip (Friday)

Fixed eat-out is **Friday dinner** unless **Friday is a trip day**, in which case the trip consumes that week’s eat-out intent and clears normal planning for Friday.

```mermaid
flowchart TD
  START([Evaluate Friday dinner cell])
  Q1{DayPlan.isTrip\non Friday?}
  Q2{slot == DINNER\nand day == FRIDAY?}

  START --> Q1
  Q1 -->|yes| TRIP["Show trip row;\nsuppress shopping\nfor Friday meals;\neat-out consumed"]
  Q1 -->|no| Q2
  Q2 -->|yes| EAT["Fixed label:\nEating out;\nexclude dinner\ningredients only"]
  Q2 -->|no| NORMAL["Regular planned meal"]

  TRIP --> END([Done])
  EAT --> END
  NORMAL --> END
```

---

## Related docs

- [`data-model.md`](data-model.md) — field-level intent and cascades  
- [`api-routes.md`](api-routes.md) — HTTP surface and flag semantics  
- [`project-structure.md`](project-structure.md) — repository layout  
