---
name: orchestrate-issues
description: >
  Orchestrate GitHub issues by spawning implementation subagents in dependency
  order (serial or parallel), then run Product, Architect, and QA reviewer
  passes. Use when the user wants multi-issue delivery, subagents per issue,
  or "orchestrate", "run all issues", or "implement issues with review".
---

# Orchestrate Issues

You are the **delivery orchestrator**. You do not implement large features
yourself when multiple issues are in scope — you coordinate subagents and
reviewers.

## Prerequisites

- `gh` authenticated for the repo (default: `naveen-sachithanandam/weekly-meal-planner`)
- Issues labeled and bodies follow the to-issues template (What to build, Acceptance criteria, Blocked by)
- Constitution: `.cursor/rules/project-constitution.mdc`
- Spec/plan paths referenced in each issue footer

## Workflow

### 1. Gather issues

```bash
gh issue list --repo OWNER/REPO --label <feature-label> --state open --json number,title,body,labels
```

If the user names specific issue numbers, fetch only those:

```bash
gh issue view <N> --repo OWNER/REPO --json number,title,body
```

### 2. Build execution plan

Parse **Blocked by** from each issue body.

| Pattern | Run mode |
|---------|----------|
| No blockers | Wave 1 — can run in parallel with other unblockers |
| Blocks #N | Serial after issue N completes |
| Multiple issues block same parent | All blockers must finish before dependent |

**Parallel vs serial rules:**

- **Parallel** only when issues touch disjoint file sets (e.g. separate API routes after a shared foundation issue).
- **Serial** when issues edit the same components (e.g. `meal-type-list.tsx` + `meal-type-row.tsx`) or the same route file.
- When unsure, default to **serial** to avoid merge conflicts.

Present the plan to the user briefly (wave table) unless they said "go ahead".

### 3. Implement per wave — Task subagents

For each issue in dependency order, launch a `generalPurpose` subagent with:

- Issue number, title, full acceptance criteria
- Workspace absolute path
- **Scope boundary:** implement ONLY this issue; do not implement future issues
- **Prior work:** list files/commits from completed issues in this run
- Pointers to spec, plan, constitution
- Require `npm test` (or project test command) before returning
- Return: files changed, test results, handoff notes for next issue

**One issue per subagent.** Wait for completion before starting dependents.

Use `subagent_type: "shell"` only for git/gh operations, not feature code.

### 4. Review after each wave (or after all issues)

After each implementation subagent (or after a full wave), run **three readonly reviewer subagents** in parallel:

| Skill | Role |
|-------|------|
| `review-product` | Spec/AC alignment, user journeys |
| `review-architect` | Structure, constitution, dependencies, API contracts |
| `review-qa` | Tests, edge cases, regressions |

Pass each reviewer:

- Issue number(s) just implemented
- `git diff` summary or list of changed files
- Relevant spec AC IDs

Reviewers return **PASS**, **PASS with notes**, or **FAIL** with actionable items.

If any reviewer **FAIL**s, spawn a fix subagent for that issue before closing.

### 5. Close issues

Only close when:

- All acceptance criteria met
- Tests pass
- Reviewers PASS (or user waives review)

```bash
gh issue close <N> --repo OWNER/REPO --comment "Implemented in <commit>. Tests: npm test (N passed)."
```

Do not close parent/epic issues unless asked.

### 6. Commit and push

Unless the user forbids it:

```bash
git add <files>
git commit -m "$(cat <<'EOF'
<type>: <short summary>

<why — 1-2 sentences>
EOF
)"
git push
```

Docker: if `docker-compose.yml` exists and app code changed, remind user or run
`docker compose build && docker compose up -d` per project rules.

## Subagent prompt template

```
Implement GitHub issue #<N> ONLY: <title>

Workspace: <absolute path>

## Acceptance criteria
<paste from issue>

## Prior completed issues this run
<list + handoff notes>

## Do NOT implement
<future issue scopes>

## Spec / plan
<paths from issue footer>

Run tests. Return files changed, test output, handoff notes.
```

## Anti-patterns

- Do not run parallel implementers on the same file set.
- Do not skip tests because a subagent "said" it passed — verify in orchestrator if cheap.
- Do not expand scope beyond the issue body.
- Do not force-push to main.

## Related skills

- `to-issues` — break plans into issues
- `review-product`, `review-architect`, `review-qa` — post-implementation review
