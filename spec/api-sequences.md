# API sequences (V1)

Mermaid **sequence** diagrams for the main HTTP flows. For paths, bodies, and response shapes, see [`api-routes.md`](api-routes.md) and [`openapi.yaml`](openapi.yaml).

---

## Load weekly meal plan

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as GET /api/meal-plan
  participant WB as week-boundary
  participant DB as Prisma

  Client->>API: Request (?weekStart optional)
  API->>WB: Resolve Sunday week key
  alt invalid weekStart
    API-->>Client: 400 { error, field? }
  end
  API->>DB: findUnique WeeklyPlan + days + mealSlots
  alt no plan
    API-->>Client: 404 { error }
  end
  API-->>Client: 200 WeeklyPlan JSON
```

---

## Save weekly meal plan

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as POST /api/meal-plan
  participant Rules as meal-rules
  participant DB as Prisma

  Client->>API: JSON body (weekStartSunday + days[])
  alt invalid JSON / body
    API-->>Client: 400 { error, field? }
  end
  API->>Rules: validateEggs(days)
  alt Saturday eggs
    API-->>Client: 400 { error, field }
  end
  API->>DB: $transaction upsert plan, days, mealSlots (proteinWarning computed)
  alt DB error
    API-->>Client: 500 { error }
  end
  API->>DB: reload full plan
  API-->>Client: 200 WeeklyPlan JSON
```

---

## Load shopping list (and SWR polling)

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant SWR as SWR (shopping page)
  participant API as GET /api/shopping-list
  participant DB as Prisma

  loop refreshInterval ~60s
    SWR->>API: GET (?weekStart optional)
    API->>DB: findUnique WeeklyPlan + shoppingLineGroups + contributions
    alt no plan
      API-->>SWR: 404
    end
    API-->>SWR: 200 { weekStart, groups[] }
    SWR-->>Client: Re-render checklist / views
  end
```

---

## Toggle checked (bought today)

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as PATCH /api/shopping-list/:id
  participant DB as Prisma

  Note over Client,DB: :id = ShoppingLineGroup id

  Client->>API: { checked: boolean }
  alt bad body
    API-->>Client: 400
  end
  API->>DB: findUnique group
  alt missing group
    API-->>Client: 404
  end
  API->>DB: update group.checked
  API->>DB: reload group + contributions
  API-->>Client: 200 ShoppingLineGroup JSON
```

---

## Toggle already have (pantry)

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as PATCH /api/shopping-list/:id/have
  participant DB as Prisma

  Note over Client,DB: :id = ShoppingLineGroup id

  Client->>API: { alreadyHave: boolean }
  API->>DB: update group.alreadyHave + reload
  API-->>Client: 200 ShoppingLineGroup JSON
```

---

## Add manual shopping item

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as POST /api/shopping-list/item
  participant DB as Prisma

  Client->>API: weekStart, displayName, quantityText, section, …
  API->>DB: find plan; optional validate mealSlotId in week
  API->>DB: $transaction find/create group by mergeKey; create contribution
  API-->>Client: 201 { contribution, group }
```

---

## Remove one contribution line

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as DELETE /api/shopping-list/:id
  participant DB as Prisma

  Note over Client,DB: :id = ShoppingLineContribution id

  Client->>API: DELETE
  alt unknown id
    API-->>Client: 404
  end
  API->>DB: $transaction delete contribution; maybe delete empty group
  API-->>Client: 204 No Content
```

---

## Clear all checks for the week

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as POST /api/shopping-list/clear
  participant DB as Prisma

  Client->>API: POST JSON { weekStart? } or {}
  API->>DB: updateMany groups set checked=false (alreadyHave unchanged)
  API-->>Client: 200 { ok: true }
```

---

## List favourites (pick list)

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as GET /api/favourites
  participant DB as Prisma

  Client->>API: GET
  API->>DB: findMany FavoriteMeal orderBy category, name
  API-->>Client: 200 FavoriteMeal[]
```
