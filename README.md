# Weekly Meal Planner

Single-household weekly meal planner (Next.js 15, SQLite, local Ollama). Built with **Spec-Driven Development (SDD)** — specs and plans are the contract; agents implement against them.

## Quick start

```bash
cp .env.example .env.local   # edit HOME_TIMEZONE, OLLAMA_*, DATABASE_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Settings: `/settings`.

## Viewing feature specs on GitHub

GitHub shows `.html` files as **source**, not as a live page. To read the interactive spec (Mermaid diagrams, nav, AC grid), use one of:

| Method | URL / steps |
|--------|-------------|
| **GitHub Pages** (recommended) | After enabling Pages (see below): [Feature 001 spec](https://naveen-sachithanandam.github.io/weekly-meal-planner/sdd/001-meal-plan-grid/feature-001.html) |
| **HTML Preview** (no setup) | [htmlpreview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/naveen-sachithanandam/weekly-meal-planner/main/sdd/001-meal-plan-grid/feature-001.html) — swap `main` for your branch if needed |
| **Local** | Open `sdd/001-meal-plan-grid/feature-001.html` in a browser |

### Enable GitHub Pages

1. Push this repo (workflow included: `.github/workflows/pages.yml`).
2. Repo **Settings → Pages → Build and deployment**: source **GitHub Actions**.
3. After the workflow runs, the site root lists features; Feature 001 is at `/sdd/001-meal-plan-grid/feature-001.html`.

The workflow copies the `sdd/` tree on each push to `main` or `feature-spec-driven-development` (and supports manual **Run workflow**).

## How SDD was used on this project

SDD here follows **Specify → Plan → Tasks → Implement**. The AI does not make architecture calls; the spec does.

```
.cursor/rules/project-constitution.mdc   ← non-negotiable rules (always loaded in Cursor)
sdd/00X-feature/
  spec.md              ← what / AC (public)
  spec.local.md        ← household context (gitignored; copy from .example)
  plan.md              ← schema, API, components
  tasks.md             ← atomic tasks, one chat + one commit each
  decision-log.md      ← deviations and env notes
  feature-00X.html     ← human-readable rollup of spec + plan (optional)
```

### Workflow in practice

1. **Constitution** — timezone, Ollama fire-and-forget, past days read-only, no auth, Sunday week start ([`project-constitution.mdc`](.cursor/rules/project-constitution.mdc)).
2. **Specify** — `spec.md` with personas, journeys, numbered acceptance criteria (AC-001…).
3. **Plan** — `plan.md` with Prisma shape, API routes, component tree, sequence diagrams.
4. **Tasks** — `tasks.md` tracer bullets: files touched, done-when, blocked-by, explicit “do not”.
5. **Issues** — tasks exported to GitHub Issues (`feature-001`, `ready-for-agent`, blockers in issue body).
6. **Implement** — Cursor chats scoped to one task or issue; agent skills under [`.agents/`](.agents/README.md) (`orchestrate-issues`, `review-*`, `tdd`).
7. **Verify** — sign-off issues and tests mapped to ACs (e.g. `tests/components/feature-001-signoff.test.tsx`).

Example implementer prompt (minimal on purpose):

```
@.cursor/rules/project-constitution.mdc
@sdd/001-meal-plan-grid/plan.md
@sdd/001-meal-plan-grid/tasks.md

Implement T003. Do not go beyond T003.
```

### Features

| Feature | Spec | HTML rollup | Status |
|---------|------|-------------|--------|
| 001 — Meal plan grid | [`sdd/001-meal-plan-grid/spec.md`](sdd/001-meal-plan-grid/spec.md) | [`feature-001.html`](sdd/001-meal-plan-grid/feature-001.html) | Implemented |
| 002 — Configuration | [`sdd/002-configuration/spec.md`](sdd/002-configuration/spec.md) | *planned* | Implemented |
| 003 — Shopping list | [`sdd/003-shopping-list/spec.md`](sdd/003-shopping-list/spec.md) | *planned* | Implemented |

### Public vs private context

Household-specific cuisine and toddler diet live in **gitignored** files (`spec.local.md`, `.cursor/rules/household-context.mdc`). Committed `.example` templates show the shape without personal data — same pattern as `.env` / `.env.example`.

### Further reading

- [`sdd/medium-article-sdd.md`](sdd/medium-article-sdd.md) — narrative walkthrough of this SDD run
- [`.agents/README.md`](.agents/README.md) — agent skills (`orchestrate-issues`, reviewers, `to-issues`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm test` | Vitest (API + components) |
| `npm run db:migrate` | Prisma migrate |
| `npm run db:seed` | Seed meal types |

## Docker

```bash
docker compose build && docker compose up -d
```

Ollama on the host: set `OLLAMA_HOST=http://host.docker.internal:11434` in Compose (see `.env.example` and `sdd/001-meal-plan-grid/decision-log.md` DL-013).

## License

Private household project; adjust license if you fork publicly.
