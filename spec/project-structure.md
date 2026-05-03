# Project structure

Repository root: **`weekly-meal-planner/`** (alongside `SPEC.md` and `README.md`).

## Folder tree (implemented highlights)

```text
weekly-meal-planner/
├── README.md
├── SPEC.md
├── DESIGN.md
├── design-tokens.css
├── package.json
├── tsconfig.json
├── next.config.ts
├── Dockerfile
├── docker-compose.yml
├── spec/                      # This documentation bundle
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx               # Redirect → /meal-plan
│   ├── meal-plan/page.tsx     # Weekly grid + slot editor
│   ├── shopping-list/page.tsx # Three views + FAB + week nav
│   └── api/
│       ├── meal-plan/route.ts
│       ├── favourites/route.ts
│       └── shopping-list/
│           ├── route.ts           # GET list
│           ├── clear/route.ts     # POST clear checked
│           ├── item/route.ts      # POST add item
│           └── [id]/
│               ├── route.ts       # PATCH checked, DELETE contribution
│               └── have/route.ts  # PATCH alreadyHave
├── components/
│   ├── nav/bottom-tab-bar.tsx
│   ├── meal-plan/               # Grid, week nav, cells, bottom sheet, favourites chips
│   └── shopping-list/
│       ├── shopping-list-views.tsx   # Tabs + by-meal / by-section / checklist
│       └── add-shopping-item-sheet.tsx
├── hooks/
│   ├── use-meal-plan.ts
│   ├── use-meal-plan-mutation.ts
│   ├── use-shopping-list.ts
│   └── use-shopping-list-mutations.ts
├── lib/
│   ├── meal-rules.ts
│   ├── week-boundary.ts
│   ├── prisma.ts
│   ├── shopping-utils.ts          # GET week resolution, Prisma includes, section order + sort
│   ├── shopping-list-cache.ts   # SWR payload merge helpers
│   ├── shopping-meal-labels.ts  # By-meal labels from meal plan
│   ├── shopping-section-labels.ts
│   ├── shopping-checklist-sort.ts
│   ├── shopping-aggregation.ts    # Reserved / future merge heuristics
│   ├── meal-plan-bootstrap.ts
│   └── meal-plan-ui-labels.ts
├── types/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── public/
```

## Route handler map

| Path | Responsibility |
|------|------------------|
| `app/api/meal-plan/route.ts` | **GET** / **POST** weekly plan keyed by Toronto `weekStartSunday`. |
| `app/api/shopping-list/route.ts` | **GET** shopping groups + contributions for the week. |
| `app/api/shopping-list/clear/route.ts` | **POST** clear **`checked`** for the week. |
| `app/api/shopping-list/item/route.ts` | **POST** manual (or linked) line; merge by `mergeKey`. |
| `app/api/shopping-list/[id]/route.ts` | **PATCH** group **`checked`**; **DELETE** contribution by id. |
| `app/api/shopping-list/[id]/have/route.ts` | **PATCH** group **`alreadyHave`**. |

## UI responsibilities (summary)

- **`app/layout.tsx`** — Root shell, global CSS, bottom tab bar.  
- **`app/meal-plan/page.tsx`** — Week nav, seven day rows, slot editor, bootstrap empty week.  
- **`app/shopping-list/page.tsx`** — Week nav, view tabs, checklist / section / meal views, clear checks, FAB + add sheet, SWR polling.  
- **`lib/meal-rules.ts`** — Meal and grid rules (shared with API validation where used).  
- **`lib/week-boundary.ts`** — Toronto Sunday week helpers.  
- **`prisma/schema.prisma`** — SQLite schema (authoritative).  

For longer prose per feature, see **`architecture.md`**, **`api-routes.md`**, and root **`SPEC.md`** / **`spec/product-spec.md`**.
