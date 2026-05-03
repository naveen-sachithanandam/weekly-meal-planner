# Weekly Meal Planner (V1)

Household web app for a weekly meal grid (Sunday→Saturday, Toronto time), shopping list views (by meal, by aisle, checklist), and SQLite-backed persistence. Built for access on a private home network (for example via Tailscale); **no authentication in V1**.

## Documentation

| Location | Purpose |
|----------|---------|
| [`spec/README.md`](spec/README.md) | Index of all specification and engineering docs |
| [`spec/product-spec.md`](spec/product-spec.md) | Full product specification (mirror of root `SPEC.md`) |
| [`spec/decision-log.md`](spec/decision-log.md) | Architecture and product decisions with rationale |
| [`spec/project-structure.md`](spec/project-structure.md) | Repository layout and file responsibilities |
| [`spec/data-model.md`](spec/data-model.md) | Database intent aligned with `prisma/schema.prisma` |
| [`spec/api-routes.md`](spec/api-routes.md) | HTTP API summary and shopping flags |
| [`spec/architecture.md`](spec/architecture.md) | Mermaid diagrams for system architecture and logic flow |
| [`spec/engineering-notes.md`](spec/engineering-notes.md) | Prisma/SQLite tooling notes and env reminders |

The canonical public product spec lives at **`SPEC.md`** in this directory root (private overlay: **`SPEC.local.md`**, gitignored when configured). Keep `spec/product-spec.md` aligned with **`SPEC.md`** when you change requirements.

## Making it your own

1. Copy the example spec:

   ```bash
   cp SPEC.local.example.md SPEC.local.md
   ```

2. Fill in your family details:

   - Schedule and departure times
   - Dietary rules and preferences
   - Favourite meals
   - Shopping preferences

3. Run the seed with your meals:

   ```bash
   npx prisma db seed
   ```

4. Start the app:

   ```bash
   docker compose up
   ```

Your private context never leaves your machine.

## Tech stack (planned)

- Next.js (App Router), TypeScript, Tailwind CSS  
- Next.js Route Handlers under `app/api/`  
- SQLite via Prisma (`prisma/schema.prisma`)  
- Docker / docker-compose for deployment packaging  

Import domain enums and rule helpers from **`@/types/domain`** (re-exports **`types/meal.ts`** and **`lib/meal-rules.ts`**); **`lib/meal-rules`** alone still depends only on **`types/meal`** to avoid circular imports.

## Local development

1. **`DATABASE_URL` is required.** Copy **`.env.example`** to **`.env`** in the project root (or create **`.env`** with the same `DATABASE_URL`). Prisma Studio, `prisma migrate`, and the app all read **`schema.prisma`**’s `env("DATABASE_URL")` from this file. If `DATABASE_URL` is missing, Studio fails with *Environment variable not found: DATABASE_URL*.  
2. Use **`DATABASE_URL="file:./prisma/dev.db"`** so the SQLite file lives at **`prisma/dev.db`** (matches migrations / seed).  
3. Run **`npm install`**, then **`npx prisma migrate dev`** (or **`npm run db:migrate`**) and **`npx prisma db seed`** as needed.  
4. Run **`npm run dev`** for Next.js. **`npm run db:studio`** opens Prisma Studio (needs **`.env`** present).

### Curl tips

In **zsh**, unquoted `?` in URLs is treated as a glob. Always quote query strings:

```bash
curl 'http://localhost:3000/api/meal-plan?weekStart=2025-06-08'
```

## License / privacy

Personal household project; adjust as needed.
