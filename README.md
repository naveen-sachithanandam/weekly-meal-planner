# Weekly Meal Planner (V1)

Household web app for a weekly meal grid (Sunday→Saturday, Toronto time), shopping list views (by meal, by aisle, checklist), and SQLite-backed persistence. Built for access on a private home network (for example via Tailscale); **no authentication in V1**.

This directory is the **repository root**: product and engineering docs live alongside the Next.js app so the project can be developed **spec-first** (SDD — see below).

---

## Spec-Driven Development (SDD)

This repo follows **SDD**: **written specifications are the source of truth** for behaviour, APIs, and data; **code stays aligned** with those docs (not the other way around).

1. **Specs first (or specs in lockstep with code)**  
   Product rules, UX intent, HTTP contracts, and persistence shape live in **Markdown**, plus **`spec/openapi.yaml`** and **Mermaid** diagrams where they help. You should be able to understand V1 without reading every source file.

2. **Where to look**
   - **`SPEC.md`** — public product + technical requirements (safe to publish).
   - **`spec/`** — bundle index in [`spec/README.md`](spec/README.md): product mirror, architecture, data model, API routes, OpenAPI, sequence diagrams, decision log.
   - **`DESIGN.md`** and **`design-tokens.css`** — design intent and tokens (no hex hunting in components).

3. **Public vs private**  
   Household-only narrative (schedules, names, store habits) belongs in **`SPEC.local.md`**, which is **gitignored**. Copy **`SPEC.local.example.md`** → **`SPEC.local.md`** and fill it in locally. Do **not** commit PII; **`.cursor/rules/*.mdc`** must stay generic (see rules in that folder).

4. **When you change behaviour**  
   Update **`SPEC.md`** (and keep **`spec/product-spec.md`** in sync), then adjust **`spec/openapi.yaml`** / **`spec/api-sequences.md`** if HTTP flows change, then code — ideally in the **same** change so reviewers can trace intent.

---

## Documentation map

| Location | Purpose |
|----------|---------|
| [`SPEC.md`](SPEC.md) | Canonical **public** product + tech spec (start here). |
| [`spec/README.md`](spec/README.md) | Index of all `spec/` docs. |
| [`spec/product-spec.md`](spec/product-spec.md) | Mirror of `SPEC.md` for readers who live under `spec/`. |
| [`spec/decision-log.md`](spec/decision-log.md) | Dated architecture / product decisions. |
| [`spec/project-structure.md`](spec/project-structure.md) | Directory layout and file roles. |
| [`spec/data-model.md`](spec/data-model.md) | Relational model vs `prisma/schema.prisma`. |
| [`spec/api-routes.md`](spec/api-routes.md) | Route map and shopping semantics. |
| [`spec/openapi.yaml`](spec/openapi.yaml) | OpenAPI 3.0.3 for `/api/*`. |
| [`spec/api-sequences.md`](spec/api-sequences.md) | Mermaid sequence diagrams for main API flows. |
| [`spec/architecture.md`](spec/architecture.md) | System and flow diagrams. |
| [`spec/engineering-notes.md`](spec/engineering-notes.md) | Prisma/SQLite tooling notes. |
| [`DESIGN.md`](DESIGN.md) | UX and visual intent. |

---

## Quick onboarding (contributors & agents)

1. Read **`SPEC.md`** and, for a real household deploy, maintain **`SPEC.local.md`** locally (never commit it).
2. Skim **`spec/README.md`** then open **`spec/architecture.md`** or **`spec/api-routes.md`** as needed.
3. In Cursor, follow **`.cursor/rules/*.mdc`** (read `SPEC.md` + `SPEC.local.md` when building; no private text in rules or code comments).

---

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

---

## Tech stack (planned)

- Next.js (App Router), TypeScript, Tailwind CSS  
- Next.js Route Handlers under `app/api/`  
- SQLite via Prisma (`prisma/schema.prisma`)  
- Docker / docker-compose for deployment packaging  

Import domain enums and rule helpers from **`@/types/domain`** (re-exports **`types/meal.ts`** and **`lib/meal-rules.ts`**); **`lib/meal-rules`** alone still depends only on **`types/meal`** to avoid circular imports.

---

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

---

## Contributing

- Prefer **small PRs**; when behaviour or APIs change, update **`SPEC.md`**, **`spec/product-spec.md`**, and **`spec/openapi.yaml`** / **`spec/api-sequences.md`** as needed in the same change.
- Do **not** commit **`.env`**, **`SPEC.local.md`**, secrets, or PII.

---

## License / privacy

Personal household project; adjust as needed.
