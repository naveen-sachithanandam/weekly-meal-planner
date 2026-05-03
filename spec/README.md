# Specification bundle

This folder collects **product requirements**, **engineering structure**, **API notes**, **data model intent**, and a **decision log** so the meal planner can be reviewed or implemented without digging through chat history.

## Contents

| Document | Description |
|----------|-------------|
| [`product-spec.md`](product-spec.md) | Complete V1 product specification (kept in sync with repository root `SPEC.md`). |
| [`decision-log.md`](decision-log.md) | Dated decisions: timezone, eat-out vs trip, shopping data shape, API flags, sync strategy, etc. |
| [`project-structure.md`](project-structure.md) | Directory tree and responsibilities; reflects implemented App Router, APIs, hooks, and shopping UI. |
| [`data-model.md`](data-model.md) | Relational model overview matching `prisma/schema.prisma` (including shopping group + contribution split). |
| [`api-routes.md`](api-routes.md) | Route map, shopping semantics (`checked` vs `already have`), and **implemented** id / body notes. |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.0.3 description of `/api/*` handlers (paths, request/response schemas). |
| [`api-sequences.md`](api-sequences.md) | Mermaid sequence diagrams for main API flows (with SWR polling where applicable). |
| [`engineering-notes.md`](engineering-notes.md) | Tooling observations (Prisma/SQLite enums, optional MCP note from spec). |
| [`architecture.md`](architecture.md) | Mermaid diagrams: deployment context, layering, data model, meal/shopping flows, eat-out vs trip. |

## Canonical source

Requirements editing should happen in **one** place you prefer:

- Either root **`../SPEC.md`** or **`spec/product-spec.md`**, then copy or merge changes so both stay aligned.
