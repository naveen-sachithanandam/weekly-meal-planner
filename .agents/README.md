# Agent skills (weekly-meal-planner)

Invoke with `@.agents/skills/<name>` in Cursor.

| Skill | Purpose |
|-------|---------|
| `orchestrate-issues` | Spawn implementation subagents per GitHub issue (serial/parallel), then review |
| `review-product` | Spec / AC / journey alignment |
| `review-architect` | Constitution, API, schema, layering |
| `review-qa` | Tests, edge cases, regressions |
| `to-issues` | Break specs into GitHub issues (see `skills-lock.json` or install from mattpocock/skills) |

**Typical flow**

1. `to-issues` — create issues from `sdd/**/spec.md`
2. `orchestrate-issues` — implement + review + close
3. Or call reviewers alone after a manual implementation
