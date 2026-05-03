# Engineering notes

Miscellaneous implementation reminders discovered during scaffolding and schema design.

## Prisma and SQLite

- Prisma **enums** validate against SQLite using modern Prisma major versions (for example **6.x**) when `DATABASE_URL` is set during `prisma validate`.  
- **Prisma 7** currently shifts datasource URL configuration; pin tooling deliberately or adopt upstream migration guides before upgrading.  

## Tailwind / PostCSS

- `postcss.config.mjs` expects **`tailwindcss`** and **`autoprefixer`** packages once dependencies are installed (`package.json` was left minimal on purpose).  

## Toronto week boundaries

- **`lib/week-boundary.ts`** uses **`date-fns-tz`** (`formatInTimeZone`, `fromZonedTime`) with **`America/Toronto`** so Sunday midnight and Saturday late-night bounds respect DST; **`Luxon`** was removed in favor of date-fns per project convention.

## Environment

- **`DATABASE_URL`** must be defined for any Prisma CLI command (including **Prisma Studio**). Put it in a root **`.env`** file (same folder as `package.json`); Prisma loads `.env` automatically. Without it you get: *Environment variable not found: DATABASE_URL* at `schema.prisma:9`.  
- Use **`DATABASE_URL="file:./prisma/dev.db"`** for the default local SQLite path used by migrations and seed.  

## Spec tooling mention

- Root **`SPEC.md`** may mention **Sequential Thinking MCP** as a workflow aid; it does not change runtime architecture.  

## Duplicate product spec

- **`spec/product-spec.md`** mirrors **`SPEC.md`** so the **`spec/`** folder can be shared or archived alone; edit one source of truth and refresh the other to avoid drift.

## Client data loading

- **Meal plan** and **shopping list** pages use **SWR** (`hooks/use-meal-plan.ts`, `hooks/use-shopping-list.ts`) with optional **`refreshInterval`** on shopping for ~60s polling per spec.
